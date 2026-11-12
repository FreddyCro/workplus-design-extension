import { test } from 'node:test';
import assert from 'node:assert/strict';
import { issueToRow, issueRelations, milestoneMarkers } from '../src/layouts/gantt.js';

const base = { id: '1', serialNumber: '90', title: 'T', status: { category: { name: 'new' } }, assignee: { account: 'freddyyang' } };

test('issueToRow：有 dueDate 時終點是 dueDate', () => {
  const r = issueToRow({ ...base, dueDate: 1702569600000 }, 'DG');
  assert.equal(r.key, 'DG-90');
  assert.equal(r.start, null);
  assert.equal(r.end.getTime(), 1702569600000);
  assert.equal(r.endSource, 'dueDate');
  assert.equal(r.done, false);
});

test('issueToRow：已完成且沒 dueDate 時用 doneDate', () => {
  const r = issueToRow({ ...base, status: { category: { name: 'done' } }, dueDate: null, doneDate: 1700000000000 }, 'DG');
  const d = new Date(1700000000000);
  assert.equal(r.end.getTime(), new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime());
  assert.equal(r.endSource, 'doneDate');
  assert.equal(r.done, true);
});

test('issueToRow：未完成且沒 dueDate 時沒有終點（不拿 doneDate）', () => {
  const r = issueToRow({ ...base, dueDate: null, doneDate: 1700000000000 }, 'DG');
  assert.equal(r.end, null);
  assert.equal(r.endSource, 'none');
});

test('issueRelations：BLOCKS 取 issue→target，BLOCKED_BY 反向，鏡像去重，其他型別略過', () => {
  const issues = [
    { id: 'a', issueRelations: { nodes: [{ type: 'BLOCKS', target: { id: 'b' } }, { type: 'RELATES_TO', target: { id: 'c' } }] } },
    { id: 'b', issueRelations: { nodes: [{ type: 'BLOCKED_BY', target: { id: 'a' } }] } },
    { id: 'c' },
  ];
  assert.deepEqual(issueRelations(issues), [{ from: 'a', to: 'b' }]);
});

test('milestoneMarkers：closed 預設隱藏，endDate 與 stages 都成為 marker', () => {
  const ms = [
    { id: '1', name: 'v1', endDate: 1702569600000, closed: true, stages: [] },
    { id: '2', name: 'v2', endDate: null, closed: false, stages: [{ name: 'RC', dueDate: 1702569600000, order: 1 }] },
  ];
  assert.deepEqual(milestoneMarkers(ms, false).map((m) => [m.id, m.kind, m.label]), [['ms-2-s0', 'stage', 'v2 · RC']]);
  assert.equal(milestoneMarkers(ms, true).length, 2);
  assert.equal(milestoneMarkers(ms, true)[0].kind, 'milestone');
});

test('C1：doneDate 來源的 end 正規化成當天 00:00，且不可拖', () => {
  const r = issueToRow({ ...base, status: { category: { name: 'done' } }, dueDate: null, doneDate: new Date(2023, 10, 14, 22, 13, 20).getTime() }, 'DG');
  assert.equal(r.end.getTime(), new Date(2023, 10, 14).getTime());
  assert.equal(r.draggable, false);
});

test('dueDate 來源的列可拖', () => {
  assert.equal(issueToRow({ ...base, dueDate: 1702569600000 }, 'DG').draggable, true);
});

test('M6：closed 的里程碑 showClosed=true 時 stages 也出現，id 不重複', () => {
  const ms = [{ id: '1', name: 'v1', endDate: 1702569600000, closed: true, stages: [{ name: 'a', dueDate: 1702569600000, order: 1 }, { name: 'b', dueDate: 1702569600000, order: 1 }] }];
  const out = milestoneMarkers(ms, true);
  assert.equal(out.length, 3);
  assert.equal(new Set(out.map((m) => m.id)).size, 3);
});

test('issueToRow：描述尾端有「開始日期」行時當起點，來源 description；這一階段不能拖', () => {
  const r = issueToRow({ ...base, dueDate: 1702569600000, descriptionMd: '說明\n\n**開始日期**：2023-12-10' }, 'DG');
  assert.equal(r.start.getTime(), new Date(2023, 11, 10).getTime());
  assert.equal(r.startSource, 'description');
  assert.equal(r.end.getTime(), 1702569600000);
  assert.equal(r.draggable, false);
});

test('issueToRow：開始日期晚於終點、或沒有終點時，忽略開始日期', () => {
  const late = issueToRow({ ...base, dueDate: 1702569600000, descriptionMd: '**開始日期**：2023-12-20' }, 'DG');
  assert.equal(late.start, null);
  assert.equal(late.startSource, 'none');
  assert.equal(late.draggable, true);
  const noEnd = issueToRow({ ...base, dueDate: null, descriptionMd: '**開始日期**：2023-12-10' }, 'DG');
  assert.equal(noEnd.start, null);
});
