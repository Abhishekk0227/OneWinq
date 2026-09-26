import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/infrastructure/database/connection.js';
import logger from '../src/utils/logger.js';
import * as migration001 from './001_initial_indexes.js';

const migrationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    appliedAt: { type: Date, default: Date.now },
  },
  { collection: 'schema_migrations' },
);

const MigrationRecord = mongoose.model('SchemaMigration', migrationSchema);

const MIGRATIONS = [migration001];

async function runMigrations() {
  logger.info('[Migrations] Starting migration runner...');
  await connectDatabase();

  try {
    for (const migration of MIGRATIONS) {
      const existing = await MigrationRecord.findOne({ name: migration.name });
      if (existing) {
        logger.info(`[Migrations] Skipping already applied: ${migration.name}`);
        continue;
      }

      logger.info(`[Migrations] Applying: ${migration.name}...`);
      await migration.up();
      await MigrationRecord.create({ name: migration.name });
      logger.info(`[Migrations] Applied: ${migration.name}`);
    }

    logger.info('[Migrations] All migrations completed successfully.');
  } catch (err) {
    logger.error('[Migrations] Migration failed', { error: err.message });
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}

// Run if called directly
if (process.argv[1] && process.argv[1].endsWith('runner.js')) {
  runMigrations();
}

export { runMigrations };
