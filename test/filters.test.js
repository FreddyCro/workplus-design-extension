import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyFilters, hasFilter, matchesFilters, membersOf, labelsOf } from '../src/ui/filters.js';

const t = (y, m, d) => new Date(y, m, d).getTime();
const a = { id: '1', assignee: { account: 'alex' }, labels: [{ id: 'L1', text: 'Enews' }], dueDate: t(2026, 10, 12) };
const b = { id: '2', assignee: null, labels: [], dueDate: null };

test('空篩選全部通過；hasFilter false', () => {
  const f = emptyFilters();
  assert.equal(hasFilter(f), false);
  assert.ok(matchesFilters(a, f) && matchesFilters(b, f));
});

test('成員：空陣列 = 全部；選了就只留那些；assignee null 不丟錯', () => {
  const f = { ...emptyFilters(), members: ['alex'] };
  assert.equal(hasFilter(f), true);
  assert.equal(matchesFilters(a, f), true);
  assert.equal(matchesFilters(b, f), false);
});

test('label 比對 id', () => {
  const f = { ...emptyFilters(), label: 'L1' };
  assert.equal(matchesFilters(a, f), true);
  assert.equal(matchesFilters(b, f), false);
});

test('區間：只填一端只限一端；有區間時沒 dueDate 被濾掉', () => {
  assert.equal(matchesFilters(a, { ...emptyFilters(), to: '2026-11-12' }), true);
  assert.equal(matchesFilters(a, { ...emptyFilters(), to: '2026-11-11' }), false);
  assert.equal(matchesFilters(a, { ...emptyFilters(), from: '2026-11-13' }), false);
  assert.equal(matchesFilters(a, { ...emptyFilters(), from: '2026-11-01', to: '2026-11-30' }), true);
  assert.equal(matchesFilters(b, { ...emptyFilters(), to: '2026-12-31' }), false);
});

test('membersOf / labelsOf 去重排序', () => {
  assert.deepEqual(membersOf([a, b, { assignee: { account: 'alex' } }, { assignee: { account: 'ann' } }]), ['alex', 'ann']);
  assert.deepEqual(labelsOf([a, { labels: [{ id: 'L1', text: 'Enews' }, { id: 'L0', text: 'Ad' }] }]), [
    { id: 'L0', text: 'Ad', color: undefined },
    { id: 'L1', text: 'Enews', color: undefined },
  ]);
});
