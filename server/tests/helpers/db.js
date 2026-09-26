// ---------------------------------------------------------------------------
// Test database setup/teardown.
// Used by integration tests that need a real MongoDB connection.
//
// Set env vars BEFORE this file is imported.
// ---------------------------------------------------------------------------
import mongoose from 'mongoose';

const TEST_DB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/onewinq_test';

/**
 * Connect to the test database.
 * Skips if already connected.
 */
export async function connectTestDb() {
  if (mongoose.connection.readyState === 1) { return; }
  await mongoose.connect(TEST_DB_URI, { serverSelectionTimeoutMS: 1_000 });
}

/**
 * Drop all collections to isolate tests.
 */
export async function clearTestDb() {
  if (mongoose.connection.readyState !== 1) { return; }
  const collections = Object.values(mongoose.connection.collections);
  await Promise.all(collections.map((col) => col.deleteMany({})));
}

/**
 * Disconnect from the test database.
 */
export async function disconnectTestDb() {
  await mongoose.connection.close();
}
