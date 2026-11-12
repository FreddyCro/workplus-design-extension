import { test } from 'node:test';
import assert from 'node:assert/strict';
import { epicToRow } from '../src/layouts/timeline.js';

test('epicToRow：起訖日期、完成比例', () => {
  const r = epicToRow({ id: '7', name: 'E', startDate: 1702569600000, dueDate: 1703174400000, status: 'OPEN', progress: { all: 4, closed: 1 } });
  assert.equal(r.id, 'epic-7');
  assert.equal(r.start.getTime(), 1702569600000);
  assert.equal(r.end.getTime(), 1703174400000);
  assert.equal(r.done, false);
  assert.equal(r.progress, 25);
});

test('epicToRow：沒日期、沒 issue 時 start/end 為 null、progress 為 null', () => {
  const r = epicToRow({ id: '8', name: 'E', startDate: null, dueDate: null, status: 'CLOSE', progress: { all: 0, closed: 0 } });
  assert.equal(r.start, null);
  assert.equal(r.end, null);
  assert.equal(r.done, true);
  assert.equal(r.progress, null);
});
