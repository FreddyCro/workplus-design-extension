import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutWeek } from '../src/timeline/week-lanes.js';

const W = ['2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21'];
const r = (item, start, end = start) => ({ item, start, end });

test('跨日條：欄位與長度；跨出本週的標記左右延續', () => {
  const { bars } = layoutWeek(W, [r('a', '2026-11-10', '2026-11-17'), r('b', '2026-11-19', '2026-11-25')], 3);
  assert.deepEqual(bars.map(({ item, col, span, contLeft, contRight }) => [item, col, span, contLeft, contRight]),
    [['a', 0, 3, true, false], ['b', 4, 3, false, true]]);
});

test('重疊的放下一條車道，不重疊的共用車道', () => {
  const { bars } = layoutWeek(W, [r('a', '2026-11-16', '2026-11-18'), r('b', '2026-11-17'), r('c', '2026-11-19')], 3);
  const lane = Object.fromEntries(bars.map((b) => [b.item, b.lane]));
  assert.deepEqual(lane, { a: 0, b: 1, c: 0 });
});

test('超過車道上限的算進每欄的 hidden', () => {
  const { bars, hidden } = layoutWeek(W, [r('a', '2026-11-17'), r('b', '2026-11-17'), r('c', '2026-11-16', '2026-11-18')], 2);
  assert.equal(bars.length, 2);
  assert.deepEqual(hidden, [0, 0, 1, 0, 0, 0, 0]);
});

test('隱藏週末：只落在週末的條不畫，跨週末的被切到平日', () => {
  const wd = W.slice(1, 6);
  const { bars } = layoutWeek(wd, [r('sat', '2026-11-21'), r('x', '2026-11-14', '2026-11-16')], 3);
  assert.deepEqual(bars.map((b) => [b.item, b.col, b.span, b.contLeft]), [['x', 0, 1, true]]);
});

test('rank 小的先擺：已完成的長條不會擠掉未完成的', () => {
  const { bars, hidden } = layoutWeek(W, [{ item: 'done', start: '2026-11-01', end: '2026-11-30', rank: 1 }, r('open', '2026-11-18')], 1);
  assert.deepEqual(bars.map((b) => b.item), ['open']);
  assert.equal(hidden[3], 1);
});
