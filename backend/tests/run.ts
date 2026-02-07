// /backend/tests/run.ts
import { runSecurityTests } from './security.test';
import { runRateLimitTests } from './rate-limit.test';
import { runFuzzyMatchTests } from './fuzzy-match.test';
import { runSourcePriorityTests } from './source-priority.test';

function run() {
  runSecurityTests();
  runRateLimitTests();
  runFuzzyMatchTests();
  runSourcePriorityTests();
  console.log('Security tests passed.');
}

run();
