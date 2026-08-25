export interface BackupControlPolicy {
  id: string;
  maxBackupAgeHours: number;
  requireEncryptedAtRest: boolean;
  requireIntegrityVerified: boolean;
  maxRestoreTestAgeDays: number;
}

export interface BackupEvidence {
  backupCompletedAt: string;
  encryptedAtRest: boolean;
  integrityVerified: boolean;
  restoreTestedAt?: string;
}

export interface BackupControlAssessment {
  policyId: string;
  passed: boolean;
  failures: string[];
  backupExecutionPerformed: false;
  verificationPerformedByControl: false;
}

const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,95}$/;

function instant(value: unknown, field: string): Date {
  if (typeof value !== 'string') throw new TypeError(`${field} must be a canonical ISO timestamp`);
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new TypeError(`${field} must be a canonical ISO timestamp`);
  }
  return parsed;
}

export function normalizeBackupControlPolicy(policy: BackupControlPolicy): BackupControlPolicy {
  if (!policy || typeof policy !== 'object') throw new TypeError('policy is required');
  if (typeof policy.id !== 'string' || !ID.test(policy.id)) throw new TypeError('policy.id must be a bounded identifier');
  if (!Number.isInteger(policy.maxBackupAgeHours) || policy.maxBackupAgeHours < 1 || policy.maxBackupAgeHours > 8760) {
    throw new TypeError('maxBackupAgeHours must be an integer from 1 to 8760');
  }
  if (!Number.isInteger(policy.maxRestoreTestAgeDays) || policy.maxRestoreTestAgeDays < 1 || policy.maxRestoreTestAgeDays > 3650) {
    throw new TypeError('maxRestoreTestAgeDays must be an integer from 1 to 3650');
  }
  if (typeof policy.requireEncryptedAtRest !== 'boolean' || typeof policy.requireIntegrityVerified !== 'boolean') {
    throw new TypeError('backup control flags must be boolean');
  }
  return { ...policy };
}

export function assessBackupEvidence(
  policyInput: BackupControlPolicy,
  evidence: BackupEvidence,
  nowIso: string,
): BackupControlAssessment {
  const policy = normalizeBackupControlPolicy(policyInput);
  if (!evidence || typeof evidence !== 'object') throw new TypeError('evidence is required');
  if (typeof evidence.encryptedAtRest !== 'boolean' || typeof evidence.integrityVerified !== 'boolean') {
    throw new TypeError('evidence flags must be boolean');
  }
  const now = instant(nowIso, 'now');
  const completed = instant(evidence.backupCompletedAt, 'backupCompletedAt');
  if (completed > now) throw new TypeError('backupCompletedAt cannot be in the future');
  const failures: string[] = [];
  const ageHours = (now.getTime() - completed.getTime()) / 3_600_000;
  if (ageHours > policy.maxBackupAgeHours) failures.push('backup-too-old');
  if (policy.requireEncryptedAtRest && !evidence.encryptedAtRest) failures.push('encryption-evidence-missing');
  if (policy.requireIntegrityVerified && !evidence.integrityVerified) failures.push('integrity-evidence-missing');
  if (!evidence.restoreTestedAt) {
    failures.push('restore-test-evidence-missing');
  } else {
    const restored = instant(evidence.restoreTestedAt, 'restoreTestedAt');
    if (restored > now) throw new TypeError('restoreTestedAt cannot be in the future');
    const ageDays = (now.getTime() - restored.getTime()) / 86_400_000;
    if (ageDays > policy.maxRestoreTestAgeDays) failures.push('restore-test-too-old');
  }
  return {
    policyId: policy.id,
    passed: failures.length === 0,
    failures,
    backupExecutionPerformed: false,
    verificationPerformedByControl: false,
  };
}
