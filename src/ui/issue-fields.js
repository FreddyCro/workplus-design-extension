// Issue 欄位存在描述尾端（純函式）。格式和「開始日期」一樣，一行一個欄位，人看得懂、原生介面也能直接改：
//   **專案類型**：Official Web
//   **專案路徑**：`C:\Design\NS4825`
//   **開始日期**：2026-04-15
//   **標籤**：UI、RWD
// 兩個清單欄位，標題行後面接 markdown 清單：
//   **時程**：
//   - 2026-04-20：完成首頁線稿，待主管確認方向
//   **項目紀錄**：
//   - [x] 首頁線稿
//   - [ ] 高保真設計稿（進行中）
// 讀寬鬆（粗體可有可無、全形半形冒號、值可包反引號），寫嚴格。描述裡沒有的欄位退回讀 WorkPlus 原生欄位。
// 日期一律當地午夜；絕不用 new Date('YYYY-MM-DD')（那會解成 UTC，差一天）。

export const PROJECT_TYPES = [
  'Official Web', 'Event Web', 'C2 Web', 'Advertisement', 'Brochures', 'Blog & News', 'Enews', 'Exhibition',
  'Flyer', 'GDN_Banner', 'Others', 'Product 3D', 'Package', 'Topology', 'Video',
];
export const COUNTRIES = ['總部', '美國', '英國', '法國', '德國', '日本', '中國'];
export const ITEM_STATUSES = ['待處理', '進行中', '已完成'];

// 優先級：描述裡寫中文，WorkPlus 原生是 enum
export const PRIORITY_TEXT = { CRITICAL: '緊急', HIGH: '高優先', MEDIUM: '中優先', LOW: '低優先' };
const PRIORITY_ENUM = Object.fromEntries(Object.entries(PRIORITY_TEXT).map(([k, v]) => [v, k]));

// kind: text = 原樣；code = 寫入時包反引號（路徑、連結，避免 markdown 吃掉 \ 和 _）；date；list = 、分隔
// aliases：舊名稱也讀得到，寫入一律用 label
export const FIELDS = [
  { key: 'projectType', label: '專案類型', kind: 'text' },
  { key: 'country', label: '國家', kind: 'text' },
  { key: 'title', label: '任務名稱', kind: 'text' },
  { key: 'assignee', label: '負責人', kind: 'text' },
  { key: 'projectPath', label: '專案路徑', kind: 'code' },
  { key: 'requirementPath', label: '需求路徑', kind: 'code' },
  { key: 'figmaPath', label: 'Figma 路徑', kind: 'code' },
  { key: 'priority', label: '優先級', kind: 'text' },
  { key: 'startDate', label: '開始日期', kind: 'date' },
  { key: 'dueDate', label: '截止日期', kind: 'date' },
  { key: 'receivedDate', label: '收到需求', kind: 'date' },
  { key: 'draftDate', label: '提供初稿', kind: 'date', aliases: ['設計初稿'] },
  { key: 'confirmDate', label: '窗口確認', kind: 'date' },
  { key: 'tags', label: '標籤', kind: 'list' },
];
const SCHEDULE_LABEL = '時程';
const ITEMS_LABEL = '項目紀錄';

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const LABEL_TO_FIELD = new Map();
for (const f of FIELDS) for (const name of [f.label, ...(f.aliases ?? [])]) LABEL_TO_FIELD.set(name, f);
const ALL_LABELS = [...LABEL_TO_FIELD.keys(), SCHEDULE_LABEL, ITEMS_LABEL];
// 長的名稱放前面，避免前綴互相吃掉
const LINE_RE = new RegExp(
  `^\\s*[*_]{0,2}\\s*(${ALL_LABELS.sort((a, b) => b.length - a.length).map(esc).join('|')})\\s*[*_]{0,2}\\s*[：:]\\s*(.*?)\\s*$`
);
const LIST_ITEM_RE = /^\s*[-*+]\s+(.*?)\s*$/;
const DATE_RE = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/;

function validLocal(y, m, d) {
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date.getTime();
}

export function parseYMD(s) {
  const m = String(s ?? '').trim().match(DATE_RE);
  return m ? validLocal(Number(m[1]), Number(m[2]), Number(m[3])) : null;
}

export function formatYMD(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function unquote(v) {
  const m = v.match(/^`+([\s\S]*?)`+$/);
  return (m ? m[1] : v).trim();
}

function parseValue(f, raw) {
  const v = unquote(raw);
  if (!v) return null;
  if (f.kind === 'date') return parseYMD(v);
  if (f.kind === 'list') {
    const items = v.split(/[、,，]/).map((s) => s.trim()).filter(Boolean);
    return items.length ? items : null;
  }
  return v;
}

// 「2026-04-20：內容」
function parseScheduleItem(text) {
  const m = text.match(/^(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})\s*[：:]?\s*(.*)$/);
  if (!m) return null;
  const date = parseYMD(m[1]);
  return date == null ? null : { date, text: m[2].trim() };
}

// 「[x] 名稱」「[ ] 名稱（進行中）」
function parseChecklistItem(text) {
  const m = text.match(/^\[([ xX])\]\s*(.*)$/);
  if (!m) return null;
  let name = m[2].trim();
  let status = '待處理';
  const s = name.match(/^(.*?)\s*[（(](待處理|進行中|已完成)[）)]$/);
  if (s) {
    name = s[1].trim();
    status = s[2];
  }
  if (m[1].toLowerCase() === 'x') status = '已完成';
  else if (status === '已完成') status = '待處理'; // 沒勾但寫已完成：以勾選為準
  return name ? { name, done: status === '已完成', status } : null;
}

// 舊格式（xlsx 匯入）：「Description：」下面一行一筆「MM/DD 內容」或「MM/DD-DD 內容」，沒有年份。
// 讀的時候併進時程、從內文拿掉；年份取 baseTs（開始日期或建立日）那年，比 baseTs 早半年以上就算下一年。
const LEGACY_HEAD_RE = /^\s*Description\s*[：:]\s*$/i;
const LEGACY_ITEM_RE = /^\s*(\d{1,2})\/(\d{1,2})(?:\s*[-~～]\s*((?:\d{1,2}\/)?\d{1,2}))?\s+(.+?)\s*$/;
const HALF_YEAR = 183 * 86400000;

function resolveLegacy(raw, baseTs) {
  const base = new Date(baseTs ?? Date.now());
  const out = [];
  for (const { m, d, until, text } of raw) {
    let date = validLocal(base.getFullYear(), m, d);
    if (date != null && date < base.getTime() - HALF_YEAR) date = validLocal(base.getFullYear() + 1, m, d);
    if (date != null) out.push({ date, text: until ? `${text}（至 ${until}）` : text });
  }
  return out;
}

const stripUntil = (t) => t.replace(/（至 [^）]*）$/, '');
const sameEntry = (a, b) => a.date === b.date && stripUntil(a.text) === stripUntil(b.text);

// 回 { values, schedule, items, body }。values 只有描述裡真的有寫的欄位；同一欄位多行取最後一行。
// body = 拿掉欄位行與清單後的描述（其他內容一字不動，只去掉尾端空行）。
export function parseFields(md, { baseTs = null } = {}) {
  const values = {};
  let schedule = null;
  let items = null;
  const keep = [];
  const legacy = [];
  const lines = (md ?? '').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (LEGACY_HEAD_RE.test(lines[i]) && LEGACY_ITEM_RE.test(lines[i + 1] ?? '')) {
      for (let lm; i + 1 < lines.length && (lm = lines[i + 1].match(LEGACY_ITEM_RE)); i++) {
        legacy.push({ m: Number(lm[1]), d: Number(lm[2]), until: lm[3] ?? null, text: lm[4] });
      }
      // 拿掉區塊後不要留下連續兩個空行
      if ((keep.length === 0 || keep[keep.length - 1].trim() === '') && (lines[i + 1] ?? '').trim() === '') i++;
      continue;
    }
    const m = lines[i].match(LINE_RE);
    if (!m) {
      keep.push(lines[i]);
      continue;
    }
    const [, name, raw] = m;
    if (name === SCHEDULE_LABEL || name === ITEMS_LABEL) {
      // 標題行後面有字，或第一行就不是合格的清單項目：不是我們的欄位，原樣留在內文
      const parse = name === SCHEDULE_LABEL ? parseScheduleItem : parseChecklistItem;
      const itemAt = (j) => {
        const lm = j < lines.length && lines[j].match(LIST_ITEM_RE);
        return lm ? parse(lm[1]) : null;
      };
      if (raw || !itemAt(i + 1)) {
        keep.push(lines[i]);
        continue;
      }
      const list = [];
      for (let item; (item = itemAt(i + 1)); i++) list.push(item);
      if (name === SCHEDULE_LABEL) schedule = list;
      else items = list;
      continue;
    }
    const f = LABEL_TO_FIELD.get(name);
    const v = parseValue(f, raw);
    if (v == null) delete values[f.key];
    else values[f.key] = v;
  }
  while (keep.length && keep[keep.length - 1].trim() === '') keep.pop();
  while (keep.length && keep[0].trim() === '') keep.shift();
  schedule = schedule ?? [];
  for (const e of resolveLegacy(legacy, values.startDate ?? baseTs)) if (!schedule.some((x) => sameEntry(x, e))) schedule.push(e);
  schedule.sort((a, b) => a.date - b.date);
  return { values, schedule, items: items ?? [], body: keep.join('\n') };
}

function formatValue(f, v) {
  if (f.kind === 'date') return formatYMD(v);
  if (f.kind === 'list') return v.join('、');
  const s = String(v).replace(/\r?\n/g, ' ').trim();
  return f.kind === 'code' ? `\`${s.replace(/`/g, '')}\`` : s;
}

// 把 body 和欄位組回描述。values 裡 null / 空字串 / 空陣列的欄位不寫。順序固定照 FIELDS。
export function serializeFields({ body = '', values = {}, schedule = [], items = [] } = {}) {
  const lines = [];
  for (const f of FIELDS) {
    const v = values[f.key];
    if (v == null || v === '' || (Array.isArray(v) && !v.length)) continue;
    lines.push(`**${f.label}**：${formatValue(f, v)}`);
  }
  const blocks = [];
  if (body.trim()) blocks.push(body.replace(/\s+$/, ''));
  if (lines.length) blocks.push(lines.join('\n'));
  if (schedule.length) {
    const sorted = [...schedule].sort((a, b) => a.date - b.date);
    blocks.push([`**${SCHEDULE_LABEL}**：`, ...sorted.map((s) => `- ${formatYMD(s.date)}：${s.text.replace(/\r?\n/g, ' ').trim()}`)].join('\n'));
  }
  if (items.length) {
    blocks.push([`**${ITEMS_LABEL}**：`, ...items.map((it) => {
      const done = it.done || it.status === '已完成';
      const tail = !done && it.status === '進行中' ? '（進行中）' : '';
      return `- [${done ? 'x' : ' '}] ${it.name.replace(/\r?\n/g, ' ').trim()}${tail}`;
    })].join('\n'));
  }
  return blocks.join('\n\n');
}

// 內文裡屬於欄位的資訊（extension 不顯示，描述原文不動）：
// xlsx 匯入的「---」＋「匯入來源」尾段、Schedule 區塊、完稿資料夾 / 備註（文案）/ Figma Link 連結行、欄位測試說明行。
// 回 { visible, hidden, legacy }：legacy 是可當欄位退回值的舊連結。
const LEGACY_LINK_RE = /^\s*(完稿資料夾|完稿路徑|備註（文案）|Figma Link)\s*[：:]\s*(.+?)\s*$/;
const LEGACY_LINK_FIELD = { 完稿資料夾: 'projectPath', 完稿路徑: 'projectPath', '備註（文案）': 'requirementPath', 'Figma Link': 'figmaPath' };
const MMDD_LINE_RE = /^\s*\d{1,2}\/\d{1,2}\b/;

export function splitBody(body) {
  const lines = (body ?? '').split(/\r?\n/);
  const visible = [];
  const hidden = [];
  const legacy = {};
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*-{3,}\s*$/.test(line)) {
      const next = lines.slice(i + 1).find((l) => l.trim());
      if (next && /^\s*匯入來源\s*[：:]/.test(next)) {
        hidden.push(...lines.slice(i));
        break;
      }
    }
    if (/^\s*Schedule\s*[：:]/i.test(line)) {
      hidden.push(line);
      while (i + 1 < lines.length && MMDD_LINE_RE.test(lines[i + 1])) hidden.push(lines[++i]);
      continue;
    }
    const lm = line.match(LEGACY_LINK_RE);
    if (lm) {
      hidden.push(line);
      const key = LEGACY_LINK_FIELD[lm[1]];
      if (!legacy[key]) legacy[key] = unquote(lm[2]);
      continue;
    }
    if (/^\s*（欄位格式測試/.test(line)) {
      hidden.push(line);
      continue;
    }
    visible.push(line);
  }
  const text = visible.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return { visible: text, hidden: hidden.join('\n').trim(), legacy };
}

// 編輯內文後，把隱藏的部分接回去（放在最後）
export function joinBody(visible, hidden) {
  return [visible?.replace(/\s+$/, ''), hidden].filter((s) => s && s.trim()).join('\n\n');
}

export function priorityFromText(text) {
  return PRIORITY_ENUM[text] ?? null;
}

// 畫面用：描述優先，描述沒有的退回 WorkPlus 原生欄位。priority 一律回 enum。
// 原生 label 中是專案類型名稱的當專案類型，其餘當標籤（存檔同步時兩者都寫成原生 label）。
export function fieldsOf(issue) {
  const { values, schedule, items, body } = parseFields(issue?.descriptionMd, { baseTs: issue?.createdDate ?? null });
  const labelTexts = (issue?.labels ?? []).map((l) => l.text);
  const projectType = values.projectType ?? labelTexts.find((t) => PROJECT_TYPES.includes(t)) ?? null;
  const nativeTags = labelTexts.filter((t) => t !== projectType);
  const native = {
    title: issue?.title || null,
    assignee: issue?.assignee?.account ?? null,
    priority: issue?.priority ?? null,
    dueDate: issue?.dueDate ?? null,
    projectType,
    tags: nativeTags.length ? nativeTags : null,
  };
  const split = splitBody(body);
  const out = { ...native, ...split.legacy };
  for (const f of FIELDS) if (values[f.key] != null) out[f.key] = values[f.key];
  if (values.priority != null) out.priority = priorityFromText(values.priority) ?? native.priority;
  for (const f of FIELDS) if (!(f.key in out)) out[f.key] = null;
  out.tags = out.tags ?? [];
  const done = items.filter((it) => it.done).length;
  // body = 欄位以外的完整內文（存檔用）；content = 畫面上顯示的內文（再拿掉欄位相關的舊資訊）
  return { ...out, schedule, items, progress: { done, all: items.length }, body, content: split.visible, fromDescription: Object.keys(values) };
}
