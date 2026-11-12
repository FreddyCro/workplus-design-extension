import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readRoute, LAYOUTS } from '../src/app/router.js';

test('五種 layout', () => {
  assert.deepEqual(LAYOUTS, ['list', 'board', 'calendar', 'gantt', 'timeline']);
});

test('沒有 layout 參數時預設 board', () => {
  assert.deepEqual(readRoute(new URL('https://workplus.synology.inc/key/DG/issues')), { key: 'DG', layout: 'board', issue: null });
});

test('layout=gantt', () => {
  assert.equal(readRoute(new URL('https://workplus.synology.inc/key/DG/issues?layout=gantt')).layout, 'gantt');
});

test('非專案頁 key 為 null', () => {
  assert.equal(readRoute(new URL('https://workplus.synology.inc/projects')).key, null);
});

test('不認識的 layout 退回 board', () => {
  assert.equal(readRoute(new URL('https://workplus.synology.inc/key/DG/issues?layout=xxx')).layout, 'board');
});

test('key 會解碼', () => {
  assert.equal(readRoute(new URL('https://workplus.synology.inc/key/A%20B/issues')).key, 'A B');
});

test('issue 參數', () => {
  assert.equal(readRoute(new URL('https://workplus.synology.inc/key/DG/issues?layout=board&issue=90')).issue, '90');
});
