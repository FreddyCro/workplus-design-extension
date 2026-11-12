import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeScale } from '../src/timeline/scale.js';
import { layoutRows } from '../src/timeline/layout.js';
import { dragResult } from '../src/timeline/drag.js';

const scale = makeScale({ view: 'month', start: new Date(2026, 10, 1), end: new Date(2026, 11, 31) });
const row = { id: 'a', start: null, end: new Date(2026, 10, 10) };
const [block] = layoutRows([row], scale);

test('移動 3 格 = 到期日 +3 天', () => {
  assert.deepEqual(dragResult({ block, row, scale, mode: 'move', dx: 60 }), {
    end: new Date(2026, 10, 13),
    changed: true,
    outOfRange: false,
  });
});

test('往左移動 2 格 = 到期日 -2 天', () => {
  assert.equal(dragResult({ block, row, scale, mode: 'move', dx: -40 }).end.getTime(), new Date(2026, 10, 8).getTime());
});

test('位移不到半格視為沒變', () => {
  const r = dragResult({ block, row, scale, mode: 'move', dx: 9 });
  assert.equal(r.changed, false);
  assert.equal(r.end.getTime(), row.end.getTime());
});

test('沒有終點的列回 null', () => {
  assert.equal(dragResult({ block, row: { id: 'b', start: null, end: null }, scale, mode: 'move', dx: 100 }), null);
});

test('右端拉伸 +1 格 = 到期日 +1 天', () => {
  assert.equal(dragResult({ block, row, scale, mode: 'resize-right', dx: 20 }).end.getTime(), new Date(2026, 10, 11).getTime());
});

test('右端拉伸不能早於起點', () => {
  const r2 = { id: 'c', start: new Date(2026, 10, 10), end: new Date(2026, 10, 12) };
  const [b2] = layoutRows([r2], scale);
  assert.equal(
    dragResult({ block: b2, row: r2, scale, mode: 'resize-right', dx: -200 }).end.getTime(),
    new Date(2026, 10, 10).getTime()
  );
});

test('C1：row.end 帶時分秒、dx=0 → changed false（點一下不會寫入）', () => {
  const r = { id: 'd', start: null, end: new Date(2023, 10, 14, 22, 13, 20) };
  const [b] = layoutRows([r], scale);
  const res = dragResult({ block: b, row: r, scale, mode: 'move', dx: 0 });
  assert.equal(res.changed, false);
  assert.equal(res.end.getTime(), new Date(2023, 10, 14).getTime());
});


test('I1：拖出圖的範圍 → changed false、outOfRange true', () => {
  const res = dragResult({ block, row, scale, mode: 'move', dx: -5000 });
  assert.equal(res.changed, false);
  assert.equal(res.outOfRange, true);
  const res2 = dragResult({ block, row, scale, mode: 'move', dx: 5000 });
  assert.equal(res2.changed, false);
});
