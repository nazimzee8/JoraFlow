// /backend/tests/rate-limit.test.ts
import assert from 'node:assert/strict';
import { rateLimitForUser } from '../services/security/RateLimiter';

export function runRateLimitTests() {
  const userId = 'user-1';

  // First 5 should pass
  for (let i = 0; i < 5; i++) {
    const res = rateLimitForUser(userId, 5, 60_000);
    assert.equal(res.allowed, true, `attempt ${i + 1} should be allowed`);
  }

  // 6th should be blocked
  const blocked = rateLimitForUser(userId, 5, 60_000);
  assert.equal(blocked.allowed, false, '6th attempt should be rate limited');
}
