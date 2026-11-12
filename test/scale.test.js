import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeScale, headerCells, rangeFor, VIEWS } from '../src/timeline/scale.js';

test('VIEWS 的 dayWidth 照 Plane：週 60、月 20', () => {
  assert.equal(VIEWS.week.dayWidth, 60);
  assert.equal(VIEWS.month.dayWidth, 20);
});

test('xOf 與 dateAt 互逆，月檢視每日 20px', () => {
  const s = makeScale({ view: 'month', start: new Date(2026, 10, 1), end: new Date(2026, 11, 31) });
  assert.equal(s.xOf(new Date(2026, 10, 1)), 0);
  assert.equal(s.xOf(new Date(2026, 10, 2)), 20);
  assert.equal(s.dateAt(20 * 30).getTime(), new Date(2026, 11, 1).getTime());
  assert.equal(s.days, 61);
  assert.equal(s.width, 61 * 20);
});

test('start/end 會正規化成當地 00:00', () => {
  const s = makeScale({ view: 'month', start: new Date(2026, 10, 1, 13, 30), end: new Date(2026, 10, 3, 1) });
  assert.equal(s.start.getTime(), new Date(2026, 10, 1).getTime());
  assert.equal(s.end.getTime(), new Date(2026, 10, 3).getTime());
  assert.equal(s.xOf(new Date(2026, 10, 2, 23, 59)), 20);
});

test('跨年連續：12/31 到 1/1 相差一個 dayWidth', () => {
  const s = makeScale({ view: 'week', start: new Date(2026, 11, 25), end: new Date(2027, 0, 10) });
  assert.equal(s.xOf(new Date(2027, 0, 1)) - s.xOf(new Date(2026, 11, 31)), 60);
});

test('閏年 2 月有 29 格', () => {
  const s = makeScale({ view: 'month', start: new Date(2028, 1, 1), end: new Date(2028, 1, 29) });
  assert.equal(s.days, 29);
  assert.equal(headerCells(s).bottom.length, 29);
});

test('月檢視 header：上層是年月、下層是日，含週末與今天標記', () => {
  const s = makeScale({ view: 'month', start: new Date(2026, 10, 9), end: new Date(2026, 10, 15) });
  const cells = headerCells(s, new Date(2026, 10, 12));
  assert.deepEqual(cells.top.map((c) => c.label), ['2026 年 11 月']);
  assert.equal(cells.top[0].x, 0);
  assert.equal(cells.top[0].width, 7 * 20);
  assert.equal(cells.bottom.filter((c) => c.weekend).length, 2);
  assert.equal(cells.bottom.find((c) => c.today).label, '12');
  assert.equal(cells.bottom[1].x, 20);
});

test('月檢視跨兩個月時上層有兩格，寬度對應各自的天數', () => {
  const s = makeScale({ view: 'month', start: new Date(2026, 10, 29), end: new Date(2026, 11, 2) });
  const { top } = headerCells(s);
  assert.deepEqual(top.map((c) => [c.label, c.x, c.width]), [['2026 年 11 月', 0, 40], ['2026 年 12 月', 40, 40]]);
});

test('週檢視 header：上層是週的日期範圍、下層是星期加日', () => {
  const s = makeScale({ view: 'week', start: new Date(2026, 10, 9), end: new Date(2026, 10, 15) });
  const cells = headerCells(s, new Date(2026, 10, 12));
  assert.deepEqual(cells.top.map((c) => c.label), ['11/9 – 11/15']);
  assert.equal(cells.bottom[0].label, '一 9');
  assert.equal(cells.bottom[6].label, '日 15');
  assert.equal(cells.bottom[3].today, true);
});

test('rangeFor 空陣列只涵蓋今天前後三個月', () => {
  const r = rangeFor([], new Date(2026, 10, 12));
  assert.equal(r.start.getTime(), new Date(2026, 7, 12).getTime());
  assert.equal(r.end.getTime(), new Date(2027, 1, 12).getTime());
});

test('rangeFor 取 min-1 個月、max+1 個月，再和今天 ±3 個月聯集', () => {
  const r = rangeFor([new Date(2023, 7, 18), new Date(2026, 11, 5)], new Date(2026, 10, 12));
  assert.equal(r.start.getTime(), new Date(2023, 6, 18).getTime());
  assert.equal(r.end.getTime(), new Date(2027, 1, 12).getTime());
});
