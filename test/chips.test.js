import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dueDateLabel, labelsSummary, PRIORITY_ORDER } from '../src/ui/chips.js';

const today = new Date(2026, 10, 12);

test('dueDateLabel：英文月份縮寫 + 日 + 年', () => {
  assert.deepEqual(dueDateLabel(new Date(2026, 7, 11).getTime(), today), { text: 'Aug 11, 2026', overdue: true });
});

test('dueDateLabel：今天或之後不算逾期', () => {
  assert.equal(dueDateLabel(today.getTime(), today).overdue, false);
  assert.equal(dueDateLabel(new Date(2026, 10, 13).getTime(), today).overdue, false);
});

test('dueDateLabel：沒有日期回 null', () => {
  assert.equal(dueDateLabel(null, today), null);
});

test('labelsSummary：0 個回 null、1–2 個列出、3 個以上顯示數量', () => {
  assert.equal(labelsSummary([]), null);
  assert.deepEqual(labelsSummary([{ text: 'Backend', color: '#123' }]), { items: [{ text: 'Backend', color: '#123' }], more: null });
  assert.deepEqual(labelsSummary([{ text: 'a' }, { text: 'b' }, { text: 'c' }]), { items: [], more: '3 Labels' });
});

test('PRIORITY_ORDER：CRITICAL 最前', () => {
  assert.deepEqual(PRIORITY_ORDER, ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);
});
