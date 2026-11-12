import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monthGrid, dayKey } from '../src/timeline/calendar-grid.js';

test('2026-11：週一開頭的格子從 10/26 開始，共 6 週', () => {
  const g = monthGrid(2026, 10, { today: new Date(2026, 10, 12) });
  assert.equal(g.weeks.length, 6);
  assert.equal(dayKey(g.weeks[0][0].date), '2026-10-26');
  assert.equal(g.weeks[0][0].inMonth, false);
  assert.equal(g.weeks[5][6].date.getDate(), 6);
  assert.equal(g.weeks[2][3].today, true);
  assert.equal(g.title, '2026 年 11 月');
});

test('2026-06-01 是週一：第一格就是 6/1，共 5 週', () => {
  const g = monthGrid(2026, 5);
  assert.equal(dayKey(g.weeks[0][0].date), '2026-06-01');
  assert.equal(g.weeks.length, 5);
});

test('閏年 2 月 2028：29 天都 inMonth', () => {
  const g = monthGrid(2028, 1);
  assert.equal(g.weeks.flat().filter((d) => d.inMonth).length, 29);
});

test('跨年：2026-12 的尾格進到 2027-01', () => {
  const g = monthGrid(2026, 11);
  const last = g.weeks.at(-1).at(-1).date;
  assert.equal(last.getFullYear(), 2027);
});

test('dayKey 用當地日期，不受時分影響', () => {
  assert.equal(dayKey(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
});
