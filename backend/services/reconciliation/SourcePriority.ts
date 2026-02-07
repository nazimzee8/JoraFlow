// /backend/services/reconciliation/SourcePriority.ts
export type SourceType = 'manual' | 'job_board' | 'email';

export function resolveSourcePriority(
  a: { source: SourceType; timestamp: string },
  b: { source: SourceType; timestamp: string },
  windowMs = 5 * 60 * 1000
): { keep: 'a' | 'b'; reason: string } {
  const priority: Record<SourceType, number> = { manual: 3, job_board: 2, email: 1 };

  const tA = Date.parse(a.timestamp);
  const tB = Date.parse(b.timestamp);
  const withinWindow = Math.abs(tA - tB) <= windowMs;

  if (!withinWindow) {
    return tA >= tB ? { keep: 'a', reason: 'newer_timestamp' } : { keep: 'b', reason: 'newer_timestamp' };
  }

  if (priority[a.source] === priority[b.source]) {
    return tA >= tB ? { keep: 'a', reason: 'same_priority_newer' } : { keep: 'b', reason: 'same_priority_newer' };
  }

  return priority[a.source] > priority[b.source]
    ? { keep: 'a', reason: 'higher_priority' }
    : { keep: 'b', reason: 'higher_priority' };
}
