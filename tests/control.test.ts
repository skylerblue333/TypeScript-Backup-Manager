import { assessBackupEvidence, normalizeBackupControlPolicy } from '../src/control';

const policy = {
  id: 'policy:daily',
  maxBackupAgeHours: 24,
  requireEncryptedAtRest: true,
  requireIntegrityVerified: true,
  maxRestoreTestAgeDays: 30,
};

describe('SkyBackupControl', () => {
  test('passes current caller-supplied evidence without claiming execution', () => {
    const result = assessBackupEvidence(
      policy,
      {
        backupCompletedAt: '2026-08-25T08:00:00.000Z',
        encryptedAtRest: true,
        integrityVerified: true,
        restoreTestedAt: '2026-08-20T08:00:00.000Z',
      },
      '2026-08-25T09:00:00.000Z',
    );
    expect(result).toEqual({
      policyId: 'policy:daily',
      passed: true,
      failures: [],
      backupExecutionPerformed: false,
      verificationPerformedByControl: false,
    });
  });

  test('reports deterministic failures for stale or missing evidence', () => {
    const result = assessBackupEvidence(
      policy,
      {
        backupCompletedAt: '2026-08-20T09:00:00.000Z',
        encryptedAtRest: false,
        integrityVerified: false,
      },
      '2026-08-25T09:00:00.000Z',
    );
    expect(result.failures).toEqual([
      'backup-too-old',
      'encryption-evidence-missing',
      'integrity-evidence-missing',
      'restore-test-evidence-missing',
    ]);
    expect(result.passed).toBe(false);
  });

  test('rejects malformed policy and future evidence', () => {
    expect(() => normalizeBackupControlPolicy({ ...policy, id: 'bad id' })).toThrow(/bounded identifier/);
    expect(() => assessBackupEvidence(
      policy,
      {
        backupCompletedAt: '2026-08-26T09:00:00.000Z',
        encryptedAtRest: true,
        integrityVerified: true,
        restoreTestedAt: '2026-08-20T09:00:00.000Z',
      },
      '2026-08-25T09:00:00.000Z',
    )).toThrow(/future/);
  });
});
