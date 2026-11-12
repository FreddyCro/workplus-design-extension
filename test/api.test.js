import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localMidnight, updateDueDate, updateStatus, issueDetail, listProjects, WorkPlusApiError } from '../src/api.js';

// 測試要在 TZ=Asia/Taipei 下跑：PowerShell `$env:TZ='Asia/Taipei'; node --test "test/**/*.test.js"`
test('守門：時區必須是 Asia/Taipei', () => {
  assert.equal(new Date(2023, 11, 15).getTime(), 1702569600000, '請先設定 TZ=Asia/Taipei 再跑測試');
});

test('localMidnight 產生當地 00:00 的 timestamp', () => {
  assert.equal(localMidnight(2023, 11, 15), 1702569600000);
});

test('updateDueDate 只送 dueDate 與 autoAssignee:false', async () => {
  let body;
  globalThis.fetch = async (_, init) => {
    body = JSON.parse(init.body);
    return { ok: true, json: async () => ({ data: { updateIssue: { modifiedCount: 1 } } }) };
  };
  await updateDueDate('955801', 1702569600000);
  assert.deepEqual(body.variables, { id: '955801', p: { dueDate: 1702569600000, autoAssignee: false } });
  assert.match(body.query, /updateIssue/);
});

test('updateDueDate 可以清成 null', async () => {
  let body;
  globalThis.fetch = async (_, init) => {
    body = JSON.parse(init.body);
    return { ok: true, json: async () => ({ data: { updateIssue: { modifiedCount: 1 } } }) };
  };
  await updateDueDate('955801', null);
  assert.equal(body.variables.p.dueDate, null);
});

test('modifiedCount 不是 1 時丟錯', async () => {
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ data: { updateIssue: { modifiedCount: 0 } } }) });
  await assert.rejects(updateDueDate('955801', 0), WorkPlusApiError);
});

test('listProjects 回傳未封存專案的 id/key/name', async () => {
  let body;
  globalThis.fetch = async (_, init) => {
    body = JSON.parse(init.body);
    return { ok: true, json: async () => ({ data: { project: { nodes: [{ id: '1312', key: 'DG', name: 'Design Guidelines' }] } } }) };
  };
  const projects = await listProjects();
  assert.deepEqual(projects, [{ id: '1312', key: 'DG', name: 'Design Guidelines' }]);
  assert.deepEqual(body.variables, { p: { archived: false } });
});

test('updateStatus 只送 status 與 autoAssignee:false', async () => {
  let body;
  globalThis.fetch = async (_, init) => {
    body = JSON.parse(init.body);
    return { ok: true, json: async () => ({ data: { updateIssue: { modifiedCount: 1 } } }) };
  };
  await updateStatus('955801', '16');
  assert.deepEqual(body.variables, { id: '955801', p: { status: '16', autoAssignee: false } });
});

test('issueDetail 回傳單一 issue，查詢含描述、留言、活動', async () => {
  let body;
  globalThis.fetch = async (_, init) => {
    body = JSON.parse(init.body);
    return { ok: true, json: async () => ({ data: { issue: { nodes: [{ id: '955801', title: 'T', descriptionMd: 'x', comments: [], activities: [] }] } } }) };
  };
  const d = await issueDetail('955801');
  assert.equal(d.id, '955801');
  assert.deepEqual(body.variables, { ids: ['955801'] });
  for (const f of ['descriptionMd', 'comments', 'activities', 'attachments', 'participants', 'labels', 'milestone']) assert.match(body.query, new RegExp(f));
});

test('issueDetail 找不到時丟 WorkPlusApiError', async () => {
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ data: { issue: { nodes: [] } } }) });
  await assert.rejects(issueDetail('0'), WorkPlusApiError);
});

test('listIssues 的 issue 查詢帶 comments { createdDate }', async () => {
  const { listIssues } = await import('../src/api.js');
  const bodies = [];
  globalThis.fetch = async (_, init) => {
    bodies.push(JSON.parse(init.body));
    if (bodies.length === 1) return { ok: true, json: async () => ({ data: { issueSearch: { totalCount: 1, nodes: [{ id: '1' }] } } }) };
    return { ok: true, json: async () => ({ data: { issue: { nodes: [{ id: '1' }] } } }) };
  };
  await listIssues('1312');
  assert.match(bodies[1].query, /comments \{ createdDate \}/);
  assert.match(bodies[1].query, /\bdescriptionMd\b/); // 開始日期行要從列表查詢的描述讀
});
