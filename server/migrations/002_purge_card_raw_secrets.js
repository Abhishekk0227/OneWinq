/**
 * Migration 002 — Purge plaintext NFC card activation codes from MongoDB.
 *
 * Background:
 *   Previously, `generateCards` stored the raw activation secret in
 *   `card.metadata.rawSecret` for admin convenience.  This is a sensitive
 *   data exposure risk (SEC-02): a read-only database breach reveals all
 *   unactivated card secrets.
 *
 *   Fix applied in app code: `generateCards` no longer persists rawSecret.
 *   This migration cleans up documents that were created before the fix.
 *
 * Safety:
 *   - Idempotent: $unset on a field that doesn't exist is a no-op.
 *   - Does NOT touch `secretHash` — NFC activation continues to work.
 *   - Does NOT remove the `metadata` subdocument — only the `rawSecret` field.
 *   - Backward compatible: active cards remain bound to their users.
 */

import mongoose from 'mongoose';

export const name = '002_purge_card_raw_secrets';

export async function up() {
  const db = mongoose.connection.db;
  const collection = db.collection('cards');

  const result = await collection.updateMany(
    { 'metadata.rawSecret': { $exists: true } },
    { $unset: { 'metadata.rawSecret': '' } }
  );

  const msg =
    result.modifiedCount > 0
      ? `Purged rawSecret from ${result.modifiedCount} card document(s).`
      : 'No card documents contained rawSecret — nothing to purge.';

  console.log(`[Migration 002] ${msg}`);
}
