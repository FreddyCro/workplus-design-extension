// 「新增任務」表單（原型 NewTaskModal 的欄位）。送出時由呼叫端的 onSubmit(values) 建立 issue
// （見 layouts/issue-save.js createIssueFromForm）：欄位寫進描述尾端，原生欄位同步寫。
// 不能寫的專案（見 ui/guard.js）只顯示、不能送出。「貼上需求文字 / 自動填入」尚未接上。
import { el } from '../app/dom.js';
import { icon } from '../app/icons.js';
import { openModal } from './modal.js';
import { discussTag } from './discuss.js';
import { PROJECT_TYPES, COUNTRIES, PRIORITY_TEXT, parseYMD, formatYMD } from './issue-fields.js';

export const FORM_CSS = `
  .tform { padding: 2px 2px 6px; }
  .tform .notice { display: flex; align-items: center; gap: 8px; padding: 8px 12px; margin-bottom: 14px; border-radius: var(--radius-md);
                   background: var(--amber-soft); color: var(--amber); font-size: 12px; font-weight: 600; }
  .tform .head { margin-bottom: 16px; }
  .tform .head .st { font-size: 11px; font-weight: 700; letter-spacing: .06em; margin-bottom: 3px; color: var(--txt-2); }
  .tform .head .t { font-size: 17px; font-weight: 700; color: #111; letter-spacing: -.02em; }
  .tform .f { margin-bottom: 12px; min-width: 0; }
  .tform label { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--txt-3); font-weight: 700; margin-bottom: 5px; text-transform: uppercase; letter-spacing: .06em; }
  .tform input, .tform select, .tform textarea { width: 100%; padding: 8px 10px; border: 1px solid var(--border-strong); border-radius: var(--radius-md); font: inherit; font-size: 13px;
                                                 color: var(--txt-1); background: var(--bg-layer-1); outline: none; }
  .tform input:focus, .tform select:focus, .tform textarea:focus { border-color: var(--border-focus); background: var(--bg-surface-1); }
  .tform input:disabled, .tform select:disabled, .tform textarea:disabled { opacity: 1; color: var(--txt-3); cursor: not-allowed; }
  .tform input[type=date] { font-size: 12px; padding: 7px 6px; }
  .tform input.invalid { border-color: var(--red); }
  .tform textarea { resize: none; height: 72px; line-height: 1.6; }
  .tform .ai { width: 100%; justify-content: center; height: 36px; margin: -4px 0 14px; color: var(--txt-4); }
  .tform .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .tform .grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .tform .err { color: var(--red); font-size: 12px; margin-top: 12px; word-break: break-all; }
  .tform .foot { display: flex; gap: 8px; margin-top: 20px; }
  .tform .foot .btn { height: 36px; justify-content: center; font-size: 13px; font-weight: 600; border-radius: 9px; }
  .tform .foot .cancel { flex: 1; }
  .tform .foot .submit { flex: 2; }
  .tform .foot .submit:disabled { background: #ccc; border-color: #ccc; opacity: 1; }
`;

function field(labelText, control) {
  const f = el('div', 'f');
  f.append(el('label', '', labelText), control);
  return f;
}

function select(options, value) {
  const s = el('select');
  for (const [v, text] of options) {
    const o = el('option', '', text);
    o.value = v;
    s.append(o);
  }
  s.value = value ?? '';
  return s;
}

function input(placeholder = '', type = 'text') {
  const i = el('input');
  i.type = type;
  i.placeholder = placeholder;
  return i;
}

function dateInput(ts) {
  const i = input('', 'date');
  if (ts) i.value = formatYMD(ts);
  return i;
}

// members：負責人選項（account）；me：目前使用者 account（預設負責人）
// onSubmit(values) → Promise；成功後關閉表單
export function openTaskForm(root, { project, members = [], me = null, dueDate = null, canSubmit = true, onSubmit, onClose }) {
  const form = el('div', 'tform');
  if (!canSubmit) {
    const notice = el('div', 'notice');
    notice.append(discussTag('唯讀'), el('span', '', `目前只有 DESIGN_TEST 專案可以新增任務（這裡是 ${project.key}）`));
    form.append(notice);
  }
  const head = el('div', 'head');
  head.append(el('div', 'st', '待處理'), el('div', 't', '新增任務'));
  form.append(head);

  const projectType = select([['', '— 選擇專案類型 —'], ...PROJECT_TYPES.map((t) => [t, t])], '');
  const country = select(COUNTRIES.map((c) => [c, c]), '總部');
  form.append(field('專案類型', projectType), field('國家', country));

  const paste = el('textarea');
  paste.placeholder = '貼上需求信件內容，AI 將自動分析並填入：\n・任務名稱\n・需求文件連結\n・專案路徑\n・截止日期\n・專案類型、標籤';
  paste.disabled = true;
  paste.title = '自動填入尚未接上';
  form.append(field('貼上需求文字', paste));
  const ai = el('button', 'btn ai');
  ai.append(icon('sparkle', 13), el('span', '', '自動填入（尚未接上）'));
  ai.disabled = true;
  form.append(ai);

  const title = input('輸入任務名稱…');
  form.append(field('任務名稱 *', title));

  const people = [...new Set([...(me ? [me] : []), ...members])];
  const assignee = select([['', '— 未指派 —'], ...people.map((m) => [m, m])], me ?? '');
  const projectPath = input('輸入專案路徑…');
  const requirementPath = input('輸入需求路徑…');
  const figmaPath = input('輸入 Figma 路徑…');
  const priority = select(['HIGH', 'MEDIUM', 'LOW'].map((k) => [PRIORITY_TEXT[k], PRIORITY_TEXT[k]]), PRIORITY_TEXT.MEDIUM);
  const startDate = dateInput(null);
  const g1 = el('div', 'grid2');
  g1.append(field('負責人', assignee), field('專案路徑', projectPath));
  const g2 = el('div', 'grid2');
  g2.append(field('需求路徑', requirementPath), field('Figma 路徑', figmaPath));
  const g3 = el('div', 'grid2');
  g3.append(field('優先級', priority), field('開始日期', startDate));
  form.append(g1, g2, g3);

  const due = dateInput(dueDate);
  const received = dateInput(null);
  const draft = dateInput(null);
  const confirm = dateInput(null);
  const dates = el('div', 'grid4');
  dates.append(field('截止日期', due), field('收到需求', received), field('提供初稿', draft), field('窗口確認', confirm));
  form.append(dates);

  const tags = input('輸入標籤，用「、」或逗號分隔');
  form.append(field('標籤', tags));

  const err = el('div', 'err');
  form.append(err);
  const foot = el('div', 'foot');
  const cancel = el('button', 'btn cancel', '取消');
  const submit = el('button', 'btn primary submit', '建立任務');
  foot.append(cancel, submit);
  form.append(foot);

  const controls = [projectType, country, title, assignee, projectPath, requirementPath, figmaPath, priority, startDate, due, received, draft, confirm, tags];
  // 輸入時不要讓 Esc 以外的按鍵冒泡到頁面的快捷鍵
  for (const c of controls) {
    c.disabled = !canSubmit;
    c.addEventListener('keydown', (e) => { if (e.key !== 'Escape') e.stopPropagation(); });
  }
  const refresh = () => { submit.disabled = !canSubmit || !title.value.trim(); };
  title.addEventListener('input', () => { title.classList.remove('invalid'); refresh(); });
  refresh();

  const values = () => ({
    projectType: projectType.value || null,
    country: country.value || null,
    title: title.value.trim(),
    assignee: assignee.value || null,
    projectPath: projectPath.value.trim() || null,
    requirementPath: requirementPath.value.trim() || null,
    figmaPath: figmaPath.value.trim() || null,
    priority: priority.value,
    startDate: parseYMD(startDate.value),
    dueDate: parseYMD(due.value),
    receivedDate: parseYMD(received.value),
    draftDate: parseYMD(draft.value),
    confirmDate: parseYMD(confirm.value),
    tags: [...new Set(tags.value.split(/[、,，]/).map((s) => s.trim()).filter(Boolean))],
  });

  const modal = openModal(root, { label: [el('span', '', project.key)], content: form, side: null, width: 520, stack: true, onClose });
  cancel.addEventListener('click', () => modal.close());
  submit.addEventListener('click', async () => {
    if (!title.value.trim()) {
      title.classList.add('invalid');
      title.focus();
      return;
    }
    submit.disabled = true;
    submit.textContent = '建立中…';
    err.textContent = '';
    try {
      await onSubmit(values());
      modal.close();
    } catch (e) {
      console.error('[wp-skin save]', '建立失敗', e);
      err.textContent = `建立失敗：${e.message}`;
      submit.textContent = '建立任務';
      refresh();
    }
  });
  setTimeout(() => title.focus(), 0);
  return modal;
}
