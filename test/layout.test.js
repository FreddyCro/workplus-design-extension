import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeScale } from '../src/timeline/scale.js';
import { layoutRows, layoutArrows, sortRows, ROW_HEIGHT, DEFAULT_BLOCK_WIDTH } from '../src/timeline/layout.js';

const scale = makeScale({ view: 'month', start: new Date(2026, 10, 1), end: new Date(2026, 11, 31) });

test('常數照 Plane：列高 44、預設條寬 60', () => {
  assert.equal(ROW_HEIGHT, 44);
  assert.equal(DEFAULT_BLOCK_WIDTH, 60);
});

test('只有終點：60px 寬、右端貼齊終點格的右邊', () => {
  const [b] = layoutRows([{ id: 'a', start: null, end: new Date(2026, 10, 10) }], scale);
  assert.equal(b.width, 60);
  assert.equal(b.x + b.width, scale.xOf(new Date(2026, 10, 10)) + 20);
  assert.equal(b.hasStart, false);
  assert.equal(b.hasEnd, true);
  assert.equal(b.rowIndex, 0);
  assert.equal(b.y, 0);
});

test('有頭有尾：寬度含首尾兩天', () => {
  const [b] = layoutRows([{ id: 'a', start: new Date(2026, 10, 10), end: new Date(2026, 10, 12) }], scale);
  assert.equal(b.width, 60);
  assert.equal(b.x, scale.xOf(new Date(2026, 10, 10)));
  assert.equal(b.hasStart, true);
});

test('沒日期的列不產生 Block 但佔列高', () => {
  const blocks = layoutRows(
    [{ id: 'a', start: null, end: null }, { id: 'b', start: null, end: new Date(2026, 10, 10) }],
    scale
  );
  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].id, 'b');
  assert.equal(blocks[0].rowIndex, 1);
  assert.equal(blocks[0].y, 44);
});

test('箭頭：從 from 條右端中點到 to 條左端中點的折線', () => {
  const blocks = layoutRows(
    [
      { id: 'a', start: new Date(2026, 10, 2), end: new Date(2026, 10, 4) },
      { id: 'b', start: new Date(2026, 10, 8), end: new Date(2026, 10, 9) },
    ],
    scale
  );
  const [arrow] = layoutArrows([{ from: 'a', to: 'b' }], blocks);
  assert.equal(arrow.from, 'a');
  assert.equal(arrow.to, 'b');
  // a: x=20 w=60 → 右端 80，中線 y=22；b: x=140，中線 y=66
  assert.equal(arrow.d, 'M 80 22 H 88 V 66 H 140');
});

test('箭頭一端沒有 Block 就略過', () => {
  const blocks = layoutRows([{ id: 'a', start: null, end: new Date(2026, 10, 10) }], scale);
  assert.deepEqual(layoutArrows([{ from: 'a', to: 'zzz' }], blocks), []);
  assert.deepEqual(layoutArrows([{ from: 'zzz', to: 'a' }], blocks), []);
});

test('sortRows 依 end 升冪，無日期排最後且保持原順序', () => {
  const rows = sortRows([
    { id: 'x', end: null },
    { id: 'y', end: new Date(2026, 10, 2) },
    { id: 'w', end: null },
    { id: 'z', end: new Date(2026, 10, 1) },
  ]);
  assert.deepEqual(rows.map((r) => r.id), ['z', 'y', 'x', 'w']);
});
