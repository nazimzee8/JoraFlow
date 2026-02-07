// /backend/tests/source-priority.test.ts
import assert from 'node:assert/strict';
import { resolveSourcePriority } from '../services/reconciliation/SourcePriority';

export function runSourcePriorityTests() {
  const a = { source: 'email' as const, timestamp: '2026-02-07T10:00:00Z' };
  const b = { source: 'job_board' as const, timestamp: '2026-02-07T10:03:00Z' };

  const r1 = resolveSourcePriority(a, b);
  assert.equal(r1.keep, 'b', 'job_board should win within window');

  const c = { source: 'manual' as const, timestamp: '2026-02-07T10:04:00Z' };
  const r2 = resolveSourcePriority(b, c);
  assert.equal(r2.keep, 'b' === 'manual' ? 'b' : 'b', 'manual should win within window');

  const d = { source: 'email' as const, timestamp: '2026-02-07T08:00:00Z' };
  const e = { source: 'job_board' as const, timestamp: '2026-02-07T09:00:00Z' };
  const r3 = resolveSourcePriority(d, e, 5 * 60 * 1000);
  assert.equal(r3.keep, 'b', 'newer should win when outside window');
}
