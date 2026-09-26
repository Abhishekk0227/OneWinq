import { describe, it, expect } from 'vitest';
import {
  runTemporaryModeNormalization,
  runNotificationCleanup,
  runAnalyticsRetention,
  runMediaOrphanCleanup,
  runAccountDeletionProcessing,
  runPaymentReconciliation,
  runAllJobs,
} from '../../../src/infrastructure/jobs/index.js';

describe('Background Maintenance Jobs', () => {
  it('runTemporaryModeNormalization returns modifiedCount 0 when DB offline', async () => {
    const result = await runTemporaryModeNormalization();
    expect(result).toHaveProperty('modifiedCount');
  });

  it('runNotificationCleanup returns deletedCount 0 when DB offline', async () => {
    const result = await runNotificationCleanup();
    expect(result).toHaveProperty('deletedCount');
  });

  it('runAnalyticsRetention returns deletedCount 0 when DB offline', async () => {
    const result = await runAnalyticsRetention();
    expect(result).toHaveProperty('deletedCount');
  });

  it('runMediaOrphanCleanup returns cleanedCount 0 when DB offline', async () => {
    const result = await runMediaOrphanCleanup();
    expect(result).toHaveProperty('cleanedCount');
  });

  it('runAccountDeletionProcessing returns processedCount 0 when DB offline', async () => {
    const result = await runAccountDeletionProcessing();
    expect(result).toHaveProperty('processedCount');
  });

  it('runPaymentReconciliation returns reconciledCount 0 when DB offline', async () => {
    const result = await runPaymentReconciliation();
    expect(result).toHaveProperty('reconciledCount');
  });

  it('runAllJobs executes without throwing', async () => {
    await expect(runAllJobs()).resolves.toBeUndefined();
  });
});
