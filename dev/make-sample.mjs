// 產生假資料的 fixture：dev/fixtures-sample/DEMO.json（沒有任何真實資料，可以 commit）。
//   node dev/make-sample.mjs
// 做法和 record.js 一樣：載入 src/api.js、跑一遍 app 會打的查詢，只是 fetch 換成產生假資料的函式，
// 所以 query / variables 和 app 送出的完全一致。日期以「執行當天」為基準，過一陣子重跑一次即可。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'dev', 'fixtures-sample', 'DEMO.json');
const DAY = 86400000;

// ---- 可重現的亂數 ----
let seed = 20261115;
const rand = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const now = new Date();
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
const day = (offset) => today + offset * DAY;

const STATUS = {
  todo: { id: '1', name: 'To do', category: { id: '1', name: 'new' } },
  doing: { id: '16', name: 'In Process', category: { id: '2', name: 'in_process' } },
  done: { id: '25', name: 'Done', category: { id: '4', name: 'done' } },
};
const TYPES = [{ id: '1', name: 'Bug' }, { id: '2', name: 'Feature' }, { id: '4', name: 'Task' }];
const LABELS = [
  { id: '11', text: 'changelog', color: '#c9567a' },
  { id: '12', text: 'icon', color: '#3f7fc6' },
  { id: '13', text: 'illustration', color: '#30a46c' },
  { id: '14', text: 'guideline', color: '#e79b3d' },
];
const USERS = [
  { id: '101', account: 'alice', nickname: 'Alice' },
  { id: '102', account: 'bob', nickname: 'Bob' },
  { id: '103', account: 'carol', nickname: 'Carol' },
  { id: '104', account: 'dave', nickname: 'Dave' },
];
const ME = { id: '101', account: 'alice' };
const AREA = { id: '801', name: 'general' };
const PROJECT = { id: '9001', key: 'DEMO', name: 'Demo 專案（假資料）', schema: { status: Object.values(STATUS) } };
const PROJECTS = [
  { id: '9001', key: 'DEMO', name: 'Demo 專案（假資料）' },
  { id: '9002', key: 'OTHER', name: '其他專案（沒有 fixture）' },
];
const MILESTONES = [
  { id: '701', name: 'v2.0.0', endDate: day(20), closed: false, level: 'PROJECT', stages: [{ name: 'Design freeze', dueDate: day(6), order: 1 }, { name: 'QA', dueDate: day(14), order: 2 }] },
  { id: '702', name: 'v1.9.0', endDate: day(-25), closed: true, level: 'PROJECT', stages: [] },
];
const EPICS = [
  { id: '601', name: 'Icon 2.0 改版', startDate: day(-10), dueDate: day(25), status: 'OPEN', progress: { all: 8, closed: 3 } },
  { id: '602', name: '插圖資源整理', startDate: day(-40), dueDate: day(-5), status: 'CLOSE', progress: { all: 5, closed: 5 } },
];

const TITLES = [
  'Release note 版型調整', 'Icon 尺寸規範補充', '按鈕 hover 狀態不一致', '新增 empty state 插圖', '表單錯誤訊息樣式',
  'Dark mode 色票草案', 'Resources Icons 連結失效', '設計規範首頁改版', 'Tooltip 位置偏移', 'Changelog 自動產生',
  '品牌色調整提案', 'Illustration 授權整理', 'Figma library 更新', 'Spacing token 命名', '對話框動畫規範',
  'Loading 動畫重繪', 'Toast 文案統一', '圖表色票', '行動版導覽列', 'Avatar 預設圖',
  '字級階層調整', 'Table 斑馬紋', '日期選擇器規格', 'Badge 色彩對比不足', '頁尾版權年份',
  'Logo 使用規範', '多語系文案長度', 'Icon 匯出流程', '無障礙對比檢查', '[demo] 可拖曳的 issue',
];

const issues = TITLES.map((title, i) => {
  const serialNumber = i + 1;
  // 最後一張用 guard.js 允許寫入的 id，拖曳、改日期都能在本機試
  const id = serialNumber === TITLES.length ? '955801' : String(950000 + serialNumber);
  const statusKey = serialNumber > 24 ? pick(['todo', 'todo', 'doing']) : serialNumber > 18 ? pick(['todo', 'doing']) : 'done';
  const status = STATUS[statusKey];
  const created = day(-60 + serialNumber * 2);
  const due = statusKey === 'done' ? (rand() < 0.3 ? created + 7 * DAY : null) : rand() < 0.8 ? day(Math.round(rand() * 30 - 8)) : null;
  const assignee = rand() < 0.85 ? pick(USERS) : null;
  const labels = rand() < 0.6 ? [pick(LABELS)] : [];
  const commentCount = Math.floor(rand() * 4);
  const startLine = serialNumber % 7 === 0 && due ? `\n\n**開始日期**：${new Date(due - 10 * DAY).toISOString().slice(0, 10)}` : '';
  return {
    id,
    serialNumber,
    title,
    priority: pick(['LOW', 'MEDIUM', 'MEDIUM', 'HIGH', serialNumber % 11 === 0 ? 'CRITICAL' : 'MEDIUM']),
    createdDate: created,
    updatedDate: created + DAY,
    dueDate: due,
    doneDate: statusKey === 'done' ? created + Math.round(rand() * 10 + 1) * DAY : null,
    resolvedDate: null,
    customFields: [],
    epic: null,
    confidentiality: 'NORMAL',
    status,
    assignee: assignee && { id: assignee.id, account: assignee.account, nickname: assignee.nickname },
    reporter: USERS[serialNumber % USERS.length],
    participants: USERS.slice(0, 2).map(({ id: uid, account }) => ({ id: uid, account })),
    type: pick(TYPES),
    labels,
    area: AREA,
    milestone: serialNumber > 18 && rand() < 0.6 ? { id: '701', name: 'v2.0.0', endDate: MILESTONES[0].endDate } : null,
    issueRelations: serialNumber === 26 ? { count: 1, nodes: [{ type: 'BLOCKS', target: { id: '955801' } }] } : { count: 0, nodes: [] },
    descriptionMd: `## 背景\n\n這是假資料，用來在本機預覽介面。\n\n- 參考稿：https://www.figma.com/file/demo\n- 第二點說明${startLine}`,
    attachments: [],
    comments: Array.from({ length: commentCount }, (_, c) => ({
      id: `${id}-c${c}`,
      createdDate: created + (c + 1) * DAY,
      descriptionMd: pick(['看起來不錯 👍', '再確認一下間距', '已更新 Figma', '這個需要和 PM 討論']),
      author: pick(USERS),
    })),
    activities: [
      { id: `${id}-a0`, createTime: created, category: 'CREATE', params: { data: { value: { title } } }, sender: { id: '101', account: 'alice' } },
      { id: `${id}-a1`, createTime: created + DAY, category: 'UPDATE', params: { data: { latest: { status: status.name }, changes: { status: 'To do' } } }, sender: { id: '102', account: 'bob' } },
    ],
  };
});

// issuesByIds 只要的欄位（和 api.js 一致，避免假資料比真資料多欄位而誤導）
const BRIEF = ['id', 'serialNumber', 'title', 'priority', 'createdDate', 'dueDate', 'doneDate', 'customFields', 'epic', 'status', 'type', 'labels', 'area', 'milestone', 'issueRelations', 'descriptionMd'];
const brief = (x) => ({
  ...Object.fromEntries(BRIEF.map((k) => [k, x[k]])),
  assignee: x.assignee && { id: x.assignee.id, account: x.assignee.account },
  comments: x.comments.map((c) => ({ createdDate: c.createdDate })),
});
const detail = (x) => ({ ...x, issueRelations: { count: x.issueRelations.count, nodes: x.issueRelations.nodes.map((n) => { const t = issues.find((y) => y.id === n.target.id); return { type: n.type, target: { id: t.id, serialNumber: t.serialNumber, title: t.title } }; }) } });

function respond(query, v) {
  if (query.includes('userProfile')) return { userProfile: ME };
  if (query.includes('issueSearch')) {
    const { offset, pageSize } = v.offset;
    const sorted = [...issues].sort((a, b) => b.serialNumber - a.serialNumber);
    return { issueSearch: { totalCount: issues.length, nodes: sorted.slice(offset, offset + pageSize).map((x) => ({ id: x.id })) } };
  }
  if (query.includes('issue(params: { ids: $ids }, offset')) return { issue: { nodes: v.ids.map((id) => brief(issues.find((x) => x.id === id))) } };
  if (query.includes('issue(params: { ids: $ids })')) return { issue: { nodes: v.ids.map((id) => detail(issues.find((x) => x.id === id))) } };
  if (query.includes('project(params')) return { project: { nodes: v.p.key ? (v.p.key === 'DEMO' ? [PROJECT] : []) : PROJECTS } };
  if (query.includes('milestone(params')) return { milestone: { nodes: MILESTONES } };
  if (query.includes('epic(params')) return { epic: { nodes: EPICS } };
  throw new Error(`make-sample 不認得這個查詢：${query.slice(0, 80)}`);
}

const entries = [];
globalThis.fetch = async (_url, init) => {
  const { query, variables } = JSON.parse(init.body);
  const response = { data: respond(query, variables) };
  entries.push({ query, variables: variables ?? null, response });
  return { ok: true, json: async () => response };
};

const api = await import('../src/api.js');
await api.me();
await api.listProjects();
const project = await api.projectByKey('DEMO');
const list = await api.listIssues(project.id);
await api.listMilestones(project.id);
await api.listEpics(project.id);
for (const x of list) await api.issueDetail(x.id);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ recordedAt: now.toISOString(), origin: 'sample', keys: ['DEMO'], entries }, null, 1));
console.log(`寫入 ${path.relative(ROOT, OUT)}：${entries.length} 筆查詢、${list.length} 張 issue`);
