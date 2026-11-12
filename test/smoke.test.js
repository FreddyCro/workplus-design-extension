import { test } from 'node:test';
import assert from 'node:assert/strict';

test('api.js 可以在 node 載入並輸出 listIssues', async () => {
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ data: {} }) });
  const api = await import('../src/api.js');
  assert.equal(typeof api.listIssues, 'function');
});
