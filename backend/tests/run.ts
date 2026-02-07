// /backend/tests/run.ts
import { runSecurityTests } from './security.test';
import { runRateLimitTests } from './rate-limit.test';

function run() {
  runSecurityTests();
  runRateLimitTests();
  console.log('Security tests passed.');
}

run();
