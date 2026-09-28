// ---------------------------------------------------------------------------
// Test database setup/teardown.
// Used by integration tests that need a real MongoDB connection.
//
// Set env vars BEFORE this file is imported.
// ---------------------------------------------------------------------------
import mongoose from 'mongoose';

const TEST_DB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/onewinq_test';

/**
 * Connect to the test database.
 * Skips if already connected.
 */
export async function connectTestDb() {
  if (mongoose.connection.readyState === 1) {
    const host = mongoose.connection.host || '';
    if (!host.includes('127.0.0.1') && !host.includes('localhost')) {
      throw new Error(`[CRITICAL SAFETY GUARD] Active database connection host '${host}' is remote. Tests are blocked from running on non-local instances.`);
    }
    return;
  }
  await mongoose.connect(TEST_DB_URI, { serverSelectionTimeoutMS: 1_000 });
}

/**
 * Drop all collections to isolate tests.
 * SAFETY GUARD: Refuses to execute if connected to production/remote Atlas cluster.
 */
export async function clearTestDb() {
  if (mongoose.connection.readyState !== 1) { return; }
  const dbName = mongoose.connection.name || '';
  const host = mongoose.connection.host || '';
  const isLocal = host.includes('127.0.0.1') || host.includes('localhost');
  const isTestDb = dbName.toLowerCase().includes('test');
  if (!isLocal || !isTestDb) {
    throw new Error(`[CRITICAL SAFETY GUARD] Refusing to clear database '${dbName}' on host '${host}'. Tests must strictly run on local test databases (localhost / 127.0.0.1 with 'test' in the name).`);
  }
  const collections = Object.values(mongoose.connection.collections);
  await Promise.all(collections.map((col) => col.deleteMany({})));
}

/**
 * Disconnect from the test database.
 */
export async function disconnectTestDb() {
  await mongoose.connection.close();
}
