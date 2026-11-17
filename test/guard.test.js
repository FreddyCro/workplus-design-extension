import test from 'node:test';
import assert from 'node:assert/strict';
import { canWrite, assertWritable } from '../src/ui/guard.js';

test('只有 DESIGN_TEST 專案可以寫', () => {
  assert.equal(canWrite('DESIGN_TEST'), true);
  assert.equal(canWrite('DG'), false);
  assert.equal(canWrite('DESIGN_TEST2'), false);
  assert.doesNotThrow(() => assertWritable('957181', 'DESIGN_TEST', 113));
  assert.throws(() => assertWritable('955801', 'DG', 90), /只有 DESIGN_TEST/);
});
