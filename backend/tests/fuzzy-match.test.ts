// /backend/tests/fuzzy-match.test.ts
import assert from 'node:assert/strict';
import { isFuzzyMatch } from '../services/matching/FuzzyMatch';

export function runFuzzyMatchTests() {
  assert.ok(isFuzzyMatch('Google', 'Software Engineer', 'Google', 'Software Engineer'), 'exact match');
  assert.ok(isFuzzyMatch('Google Inc.', 'SWE', 'Google', 'Software Engineer'), 'fuzzy match');
  assert.equal(isFuzzyMatch('Google', 'Software Engineer', 'Meta', 'Product Manager'), false, 'different roles');
}
