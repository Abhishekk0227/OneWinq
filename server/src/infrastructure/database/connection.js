import mongoose from 'mongoose';
import { config } from '../../config/env.js';
import logger from '../../utils/logger.js';

// ---------------------------------------------------------------------------
// Mongoose connection with retry, observability, and graceful shutdown.
// ---------------------------------------------------------------------------

const RECONNECT_INTERVAL_MS = 5_000;
const MAX_RECONNECT_ATTEMPTS = 10;

let reconnectAttempts = 0;

function attachEventListeners() {
  mongoose.connection.on('connected', () => {
    reconnectAttempts = 0;
    logger.info('MongoDB connected', { host: mongoose.connection.host, db: mongoose.connection.name });
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  mongoose.connection.on('error', (err) => {
    // Log error code/message only — never log connection strings
    logger.error('MongoDB connection error', { code: err.code, message: err.message });
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected');
  });
}

async function dropLegacyUniqueIndexes() {
  try {
    const profileCollection = mongoose.connection.collection('profiles');
    const indexes = await profileCollection.indexes();
    const legacyUserIdIndex = indexes.find(
      (idx) => (idx.name === 'userId_1' || (idx.key && idx.key.userId === 1 && Object.keys(idx.key).length === 1)) && idx.unique
    );
    if (legacyUserIdIndex) {
      logger.info(`Dropping legacy unique index "${legacyUserIdIndex.name}" on profiles collection...`);
      await profileCollection.dropIndex(legacyUserIdIndex.name);
      logger.info('Legacy unique index dropped successfully.');
    }
  } catch {
    // Non-blocking: collection or index may not exist yet
  }

  try {
    const cardCollection = mongoose.connection.collection('cards');
    const cardIndexes = await cardCollection.indexes();
    const legacySlugIndex = cardIndexes.find(
      (idx) => (idx.name === 'customSlug_1' || (idx.key && idx.key.customSlug === 1)) && !idx.partialFilterExpression
    );
    if (legacySlugIndex) {
      logger.info(`Dropping legacy customSlug index "${legacySlugIndex.name}" on cards collection...`);
      await cardCollection.dropIndex(legacySlugIndex.name);
      logger.info('Legacy customSlug index dropped. Recreating with partialFilterExpression...');
      await cardCollection.createIndex(
        { customSlug: 1 },
        { unique: true, partialFilterExpression: { customSlug: { $type: 'string' } } }
      );
    }
  } catch {
    // Non-blocking: collection or index may not exist yet
  }
}

export async function connectDatabase() {
  if (mongoose.connection.readyState === 1) {
    return;
  }
  if (mongoose.connection.readyState === 2) {
    await new Promise((resolve) => mongoose.connection.once('connected', resolve));
    return;
  }

  attachEventListeners();

  const options = {
    // Let Mongoose manage the connection pool
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 10_000,
    socketTimeoutMS: 45_000,
    // Disable deprecated options
    autoIndex: !config.isProduction, // Explicit index management in production
  };

  while (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    try {
      await mongoose.connect(config.db.uri, options);
      await dropLegacyUniqueIndexes();
      return; // success
    } catch (err) {
      reconnectAttempts += 1;
      logger.error('MongoDB initial connection failed', {
        attempt: reconnectAttempts,
        max: MAX_RECONNECT_ATTEMPTS,
        message: err.message,
      });

      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        logger.error('Max MongoDB reconnect attempts reached. Exiting.');
        process.exit(1);
      }

      await new Promise((resolve) => setTimeout(resolve, RECONNECT_INTERVAL_MS));
    }
  }
}

export async function disconnectDatabase() {
  await mongoose.connection.close();
  logger.info('MongoDB connection closed gracefully');
}

export function getDatabaseStatus() {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
    99: 'uninitialized',
  };
  return {
    state: states[mongoose.connection.readyState] ?? 'unknown',
    readyState: mongoose.connection.readyState,
  };
}
