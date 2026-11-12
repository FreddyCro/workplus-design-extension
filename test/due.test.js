import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatMD, formatYMD, dueStatus, dueText } from '../src/ui/due.js';

const today = new Date(2026, 10, 12);
const d = (m, day, y = 2026) => new Date(y, m, day).getTime();

test('formatMD / formatYMD', () => {
  assert.equal(formatMD(d(0, 5)), '1/5');
  assert.equal(formatYMD(d(0, 5)), '2026 年 1 月 5 日');
});

test('dueStatus：昨天 overdue、今天 today、1 與 3 天 upcoming、4 天 null、無日期 null', () => {
  assert.deepEqual(dueStatus(d(10, 11), today), { level: 'overdue', days: -1 });
  assert.deepEqual(dueStatus(d(10, 12), today), { level: 'today', days: 0 });
  assert.deepEqual(dueStatus(d(10, 13), today), { level: 'upcoming', days: 1 });
  assert.deepEqual(dueStatus(d(10, 15), today), { level: 'upcoming', days: 3 });
  assert.equal(dueStatus(d(10, 16), today), null);
  assert.equal(dueStatus(null, today), null);
});

test('dueStatus 跨年：12/31 看 1/2 是 2 天', () => {
  assert.deepEqual(dueStatus(d(0, 2, 2027), new Date(2026, 11, 31)), { level: 'upcoming', days: 2 });
});

test('dueText 文字', () => {
  assert.deepEqual(dueText(d(10, 11), today), { text: '已過期 11/11', level: 'overdue' });
  assert.deepEqual(dueText(d(10, 12), today), { text: '今日到期', level: 'today' });
  assert.deepEqual(dueText(d(10, 14), today), { text: '11/14 將到期 (2 天)', level: 'upcoming' });
  assert.deepEqual(dueText(d(10, 20), today), { text: '11/20', level: 'none' });
  assert.equal(dueText(null, today), null);
});
