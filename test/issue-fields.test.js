import test from 'node:test';
import assert from 'node:assert/strict';
import { parseFields, serializeFields, fieldsOf, parseYMD, FIELDS, splitBody, joinBody } from '../src/ui/issue-fields.js';

const d = (y, m, day) => new Date(y, m - 1, day).getTime();

const SAMPLE = [
  '需求描述：統一 bug list',
  '測試站：2026-11-12',
  '',
  '**專案類型**：Official Web',
  '**國家**：總部',
  '**任務名稱**：[Design request] Surveillance Station UI 更新',
  '**負責人**：Alex',
  '**專案路徑**：`C:\\Design\\Surveillance_Station`',
  '**需求路徑**：`https://office.synology.com/x`',
  '**Figma 路徑**：`https://www.figma.com/design/abc?node-id=1-2`',
  '**優先級**：高優先',
  '**開始日期**：2026-04-15',
  '**截止日期**：2026-04-28',
  '**收到需求**：2026-04-15',
  '**提供初稿**：2026-04-20',
  '**窗口確認**：2026-04-25',
  '**標籤**：UI、RWD',
  '',
  '**時程**：',
  '- 2026-04-23：修改後開始進行高保真設計',
  '- 2026-04-20：完成首頁線稿，待主管確認方向',
  '',
  '**項目紀錄**：',
  '- [x] 首頁線稿',
  '- [ ] 高保真設計稿（進行中）',
  '- [ ] RWD 手機版',
].join('\n');

test('parseFields：讀出所有欄位、時程依日期排序、項目紀錄的勾選與狀態', () => {
  const r = parseFields(SAMPLE);
  assert.equal(r.values.projectType, 'Official Web');
  assert.equal(r.values.country, '總部');
  assert.equal(r.values.projectPath, 'C:\\Design\\Surveillance_Station');
  assert.equal(r.values.figmaPath, 'https://www.figma.com/design/abc?node-id=1-2');
  assert.equal(r.values.priority, '高優先');
  assert.equal(r.values.startDate, d(2026, 4, 15));
  assert.equal(r.values.draftDate, d(2026, 4, 20));
  assert.deepEqual(r.values.tags, ['UI', 'RWD']);
  assert.deepEqual(r.schedule, [
    { date: d(2026, 4, 20), text: '完成首頁線稿，待主管確認方向' },
    { date: d(2026, 4, 23), text: '修改後開始進行高保真設計' },
  ]);
  assert.deepEqual(r.items, [
    { name: '首頁線稿', done: true, status: '已完成' },
    { name: '高保真設計稿', done: false, status: '進行中' },
    { name: 'RWD 手機版', done: false, status: '待處理' },
  ]);
  assert.equal(r.body, '需求描述：統一 bug list\n測試站：2026-11-12');
});

test('parseFields：舊名「設計初稿」讀成提供初稿；無粗體、半形冒號、CRLF 也接受', () => {
  const r = parseFields('設計初稿: 2026/4/20\r\n__國家__：美國');
  assert.equal(r.values.draftDate, d(2026, 4, 20));
  assert.equal(r.values.country, '美國');
});

test('parseFields：不合法日期、空值當作沒有；同欄位多行取最後一行', () => {
  const r = parseFields('**開始日期**：2026-02-30\n**國家**：\n**專案類型**：Video\n**專案類型**：Flyer');
  assert.equal(r.values.startDate, undefined);
  assert.equal(r.values.country, undefined);
  assert.equal(r.values.projectType, 'Flyer');
});

test('parseFields：「時程：」後面不是合格清單時，原樣留在內文', () => {
  const md = '時程：\n- 06/17 提供初稿\n- 06/26 完稿';
  const r = parseFields(md);
  assert.deepEqual(r.schedule, []);
  assert.equal(r.body, md);
  const r2 = parseFields('時程：見下方表格');
  assert.equal(r2.body, '時程：見下方表格');
});

test('parseFields：項目紀錄沒勾但寫（已完成）以勾選為準；勾了就是已完成', () => {
  const r = parseFields('**項目紀錄**：\n- [ ] A（已完成）\n- [X] B（進行中）');
  assert.deepEqual(r.items, [
    { name: 'A', done: false, status: '待處理' },
    { name: 'B', done: true, status: '已完成' },
  ]);
});

test('serializeFields → parseFields 來回一致', () => {
  const r = parseFields(SAMPLE);
  const md = serializeFields(r);
  assert.deepEqual(parseFields(md), r);
});

test('serializeFields：路徑包反引號、空欄位不寫、順序照 FIELDS', () => {
  const md = serializeFields({
    body: '內文',
    values: { tags: [], country: '總部', projectPath: 'C:\\a_b', startDate: d(2026, 1, 5), title: '' },
  });
  assert.equal(md, '內文\n\n**國家**：總部\n**專案路徑**：`C:\\a_b`\n**開始日期**：2026-01-05');
});

test('fieldsOf：描述沒有的欄位退回原生欄位；優先級轉 enum；進度', () => {
  const f = fieldsOf({
    title: '原生標題', priority: 'LOW', dueDate: d(2026, 5, 1), assignee: { account: 'freddyyang' },
    labels: [{ text: 'Web40' }],
    descriptionMd: '**優先級**：高優先\n\n**項目紀錄**：\n- [x] A\n- [ ] B\n- [ ] C',
  });
  assert.equal(f.title, '原生標題');
  assert.equal(f.priority, 'HIGH');
  assert.equal(f.dueDate, d(2026, 5, 1));
  assert.equal(f.assignee, 'freddyyang');
  assert.deepEqual(f.tags, ['Web40']);
  assert.equal(f.country, null);
  assert.deepEqual(f.progress, { done: 1, all: 3 });
});

test('parseYMD 與 FIELDS 的標籤', () => {
  assert.equal(parseYMD('2026-4-5'), d(2026, 4, 5));
  assert.equal(parseYMD('明天'), null);
  assert.deepEqual(FIELDS.map((f) => f.label), [
    '專案類型', '國家', '任務名稱', '負責人', '專案路徑', '需求路徑', 'Figma 路徑', '優先級',
    '開始日期', '截止日期', '收到需求', '提供初稿', '窗口確認', '標籤',
  ]);
});

test('parseFields：舊格式「Description：」的 MM/DD 行併進時程、從內文拿掉；年份取開始日期那年；與時程重複的不重複列', () => {
  const md = [
    '（欄位格式測試）', '', 'Description：', '11/04 需求確認', '11/05-06 圖稿製作 + review', '01/10 隔年的事', '', 'Schedule：2026-11-06',
    '', '**開始日期**：2026-11-02', '', '**時程**：', '- 2026-11-04：需求確認', '- 2026-11-05：圖稿製作 + review',
  ].join('\n');
  const r = parseFields(md);
  assert.deepEqual(r.schedule, [
    { date: d(2026, 11, 4), text: '需求確認' },
    { date: d(2026, 11, 5), text: '圖稿製作 + review' },
    { date: d(2027, 1, 10), text: '隔年的事' },
  ]);
  assert.equal(r.body, '（欄位格式測試）\n\nSchedule：2026-11-06');
});

test('parseFields：沒有開始日期時用 baseTs 的年份；「Description：」後面不是日期行就原樣保留', () => {
  assert.deepEqual(parseFields('Description：\n3/2 開會', { baseTs: d(2025, 2, 1) }).schedule, [{ date: d(2025, 3, 2), text: '開會' }]);
  const md = 'Description：\n這是一般說明';
  assert.equal(parseFields(md).body, md);
});

test('fieldsOf：原生 label 裡的專案類型名稱當專案類型，其餘當標籤', () => {
  const f = fieldsOf({ labels: [{ text: 'Website' }, { text: 'Official Web' }] });
  assert.equal(f.projectType, 'Official Web');
  assert.deepEqual(f.tags, ['Website']);
});

const IMPORTED = [
  '（欄位格式測試，複製自 DESIGN_TEST-113。假資料欄位：國家）',
  '',
  'Description：',
  '11/04 需求確認',
  '',
  'Schedule：2026-11-06',
  '完稿資料夾：https://office.synology.com/drive#file_id=1',
  '備註（文案）：https://office.synology.com/oo/r/abc',
  '實際上線頁面：https://www.synology.com/x',
  '',
  '---',
  '匯入來源：2026-06~12.xlsx／工作表「Maolii」第 421 列',
  '原負責人：Maolii',
  '原類別：Others；Region：HQ-BPM',
  '',
  '**開始日期**：2026-11-02',
].join('\n');

test('fieldsOf：content 不含欄位相關資訊；舊連結當專案路徑 / 需求路徑的退回值；body 保留完整內文', () => {
  const f = fieldsOf({ descriptionMd: IMPORTED });
  assert.equal(f.content, '實際上線頁面：https://www.synology.com/x');
  assert.equal(f.projectPath, 'https://office.synology.com/drive#file_id=1');
  assert.equal(f.requirementPath, 'https://office.synology.com/oo/r/abc');
  assert.match(f.body, /匯入來源/);
  assert.match(f.body, /完稿資料夾/);
});

test('splitBody / joinBody：Schedule 區塊含 MM/DD 行一起隱藏；編輯後隱藏部分接回', () => {
  const s = splitBody('說明\nSchedule：\n06/17 Design 提供初稿\n06/23 PM 確認\n其他');
  assert.equal(s.visible, '說明\n其他');
  assert.equal(s.hidden, 'Schedule：\n06/17 Design 提供初稿\n06/23 PM 確認');
  assert.equal(joinBody('新說明\n', s.hidden), '新說明\n\nSchedule：\n06/17 Design 提供初稿\n06/23 PM 確認');
  assert.equal(splitBody('A\n---\nB').visible, 'A\n---\nB');
});
