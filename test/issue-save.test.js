import test from 'node:test';
import assert from 'node:assert/strict';
import { buildUpdate, toModel } from '../src/layouts/issue-save.js';
import { parseFields } from '../src/ui/issue-fields.js';

const d = (y, m, day) => new Date(y, m - 1, day).getTime();

const ISSUE = {
  id: '1', title: '舊標題', priority: 'LOW', dueDate: d(2026, 11, 6), createdDate: d(2026, 11, 2),
  assignee: { id: '10', account: 'maoliihsu' },
  labels: [{ id: 'L1', text: 'Others' }],
  descriptionMd: '說明\n\n**國家**：總部\n**標籤**：UI\n\n**項目紀錄**：\n- [ ] A',
};
const ctx = { usersByAccount: new Map([['freddyyang', '2244']]), labelsByText: new Map([['Others', 'L1'], ['UI', 'L2'], ['Video', 'L3']]) };

test('toModel：原生欄位也進 model（第一次存檔會把全部欄位寫進描述）', () => {
  const m = toModel(ISSUE);
  assert.equal(m.values.title, '舊標題');
  assert.equal(m.values.priority, '低優先');
  assert.equal(m.values.projectType, 'Others');
  assert.deepEqual(m.values.tags, ['UI']);
  assert.equal(m.body, '說明');
});

test('buildUpdate：只送有變的原生欄位；描述含全部欄位；label 同步專案類型 + 標籤', () => {
  const { params, missingTags } = buildUpdate(ISSUE, (m) => {
    m.values.title = '新標題';
    m.values.priority = '高優先';
    m.values.assignee = 'freddyyang';
    m.values.projectType = 'Video';
    m.items[0].done = true;
  }, ctx);
  assert.deepEqual(missingTags, []);
  assert.equal(params.title, '新標題');
  assert.equal(params.priority, 'HIGH');
  assert.equal(params.assignee, '2244');
  assert.equal('dueDate' in params, false);
  assert.deepEqual(params.addLabels, ['L3', 'L2']);
  assert.deepEqual(params.removeLabels, ['L1']);
  const p = parseFields(params.description);
  assert.equal(p.values.title, '新標題');
  assert.equal(p.values.projectType, 'Video');
  assert.equal(p.values.dueDate, d(2026, 11, 6));
  assert.deepEqual(p.items, [{ name: 'A', done: true, status: '已完成' }]);
  assert.equal(p.body, '說明');
});

test('buildUpdate：專案還沒有的標籤回 missingTags；清掉截止日期送 null', () => {
  const { params, missingTags } = buildUpdate(ISSUE, (m) => {
    m.values.tags.push('新標籤');
    m.values.dueDate = null;
  }, ctx);
  assert.deepEqual(missingTags, ['新標籤']);
  assert.equal(params.dueDate, null);
});

test('buildUpdate：不認得的負責人不送 assignee，避免誤清空', () => {
  const { params } = buildUpdate(ISSUE, (m) => { m.values.assignee = 'nobody'; }, ctx);
  assert.equal('assignee' in params, false);
});

test('buildUpdate：沒改標題時不送 title，即使描述裡的任務名稱和原生標題不同', () => {
  const issue = { ...ISSUE, title: '[欄位測試] 舊標題', descriptionMd: '**任務名稱**：舊標題' };
  const { params } = buildUpdate(issue, (m) => { m.values.country = '美國'; }, ctx);
  assert.equal('title' in params, false);
  const { params: p2 } = buildUpdate(issue, (m) => { m.values.title = '改過的'; }, ctx);
  assert.equal(p2.title, '改過的');
});

import { buildCreate, createDefaults } from '../src/layouts/issue-save.js';

const PROJECT = { key: 'DESIGN_TEST', schema: { types: [{ id: '1', name: 'Bug' }, { id: '4', name: 'Task' }], status: [{ id: '1', name: 'To do' }, { id: '16', name: 'In Process' }] } };

test('createDefaults：類型用 Task、區域用 general、狀態用指定的或第一個', () => {
  const areas = [{ id: '9', name: 'other' }, { id: '11494', name: 'general' }];
  assert.deepEqual(createDefaults(PROJECT, areas, null), { typeId: '4', areaId: '11494', statusId: '1' });
  assert.equal(createDefaults(PROJECT, areas, '16').statusId, '16');
  assert.throws(() => createDefaults(PROJECT, [], null), /區域/);
});

test('buildCreate：必填欄位、描述含全部欄位、原生欄位同步、缺的 label 回 missingTags', () => {
  const values = {
    projectType: 'Official Web', country: '總部', title: '[Design request] 新頁面', assignee: 'freddyyang',
    projectPath: 'C:\\Design\\proj', requirementPath: null, figmaPath: null, priority: '高優先',
    startDate: d(2026, 11, 20), dueDate: d(2026, 12, 5), receivedDate: null, draftDate: null, confirmDate: null, tags: ['UI', '新標籤'],
  };
  const { params, missingTags } = buildCreate(values, {
    projectKey: 'DESIGN_TEST', statusId: '1', typeId: '4', areaId: '11494', reporterId: '2244',
    usersByAccount: new Map([['freddyyang', '2244']]), labelsByText: new Map([['Official Web', 'L9'], ['UI', 'L2']]),
  });
  assert.deepEqual(missingTags, ['新標籤']);
  assert.equal(params.title, '[Design request] 新頁面');
  assert.equal(params.priority, 'HIGH');
  assert.equal(params.assignee, '2244');
  assert.equal(params.dueDate, d(2026, 12, 5));
  assert.equal(params.confidentiality, false);
  assert.deepEqual(params.labels, ['L9', 'L2']);
  const p = parseFields(params.description);
  assert.equal(p.values.projectType, 'Official Web');
  assert.equal(p.values.projectPath, 'C:\\Design\\proj');
  assert.equal(p.values.startDate, d(2026, 11, 20));
  assert.deepEqual(p.values.tags, ['UI', '新標籤']);
  assert.equal(p.body, '');
});

test('buildCreate：沒選負責人、沒截止日期時不送這兩個欄位', () => {
  const { params } = buildCreate({ title: 'x', priority: '中優先', tags: [] }, { projectKey: 'DESIGN_TEST', statusId: '1', typeId: '4', areaId: '1', reporterId: '2244' });
  assert.equal('assignee' in params, false);
  assert.equal('dueDate' in params, false);
  assert.equal(params.priority, 'MEDIUM');
});
