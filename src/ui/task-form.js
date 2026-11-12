// 討論用的「新增 / 編輯任務」表單（原型 NewTaskModal / EditTaskModal 的版面）。
// 所有欄位停用、不能送出；每個欄位標「WorkPlus 欄位」或「討論中」，讓設計師看得出哪些已經有、哪些還要談。
import { el } from '../app/dom.js';
import { icon } from '../app/icons.js';
import { openModal } from './modal.js';
import { discussTag, wpTag } from './discuss.js';
import { statusGlyph } from './issue-card.js';
import { PROJECT_TYPE_COLORS, PRIORITY } from './palette.js';
import { findFigmaUrl } from './links.js';
import { formatMD } from './due.js';

export const FORM_CSS = `
  .tform { padding: 2px 2px 6px; }
  .tform .notice { display: flex; align-items: center; gap: 8px; padding: 8px 12px; margin-bottom: 14px; border-radius: var(--radius-md);
                   background: var(--amber-soft); color: var(--amber); font-size: 12px; font-weight: 600; }
  .tform .head { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 16px; }
  .tform .head .st { font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; margin-bottom: 3px; }
  .tform .head .t { font-size: 17px; font-weight: 700; color: #111; letter-spacing: -.02em; }
  .tform .f { margin-bottom: 12px; min-width: 0; }
  .tform label { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--txt-3); font-weight: 700; margin-bottom: 5px; text-transform: uppercase; letter-spacing: .06em; }
  .tform label .hint { font-weight: 400; color: var(--txt-4); text-transform: none; letter-spacing: 0; }
  .tform input, .tform select, .tform textarea { width: 100%; padding: 8px 10px; border: 1px solid var(--border-strong); border-radius: var(--radius-md); font: inherit; font-size: 13px;
                                                 color: var(--txt-1); background: var(--bg-layer-1); outline: none; }
  .tform input:disabled, .tform select:disabled, .tform textarea:disabled { opacity: 1; color: var(--txt-2); cursor: not-allowed; }
  .tform .discuss-field:disabled { color: var(--txt-4); }
  .tform textarea { resize: none; height: 72px; line-height: 1.6; }
  .tform .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .tform .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
  .tform .grid4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
  .tform .group { font-size: 10.5px; color: var(--txt-3); font-weight: 700; letter-spacing: .06em; text-transform: uppercase; margin: 2px 0 6px; display: flex; align-items: baseline; gap: 6px; }
  .tform .group .hint { font-weight: 400; color: var(--txt-4); text-transform: none; letter-spacing: 0; font-size: 10px; }
  .tform .datebtn { display: flex; align-items: center; gap: 6px; padding: 8px 10px; border: 1px solid var(--border-strong); border-radius: var(--radius-md); font-size: 13px; color: var(--txt-2);
                    background: var(--bg-layer-1); cursor: not-allowed; }
  .tform .datebtn.discuss-field { color: var(--txt-4); }
  .tform .sched { border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); background: var(--bg-layer-1); margin-bottom: 14px; overflow: hidden; }
  .tform .sched .dates { padding: 10px 12px; background: var(--bg-surface-1); }
  .tform .sched .empty { padding: 10px 12px; font-size: 12px; color: var(--txt-4); border-top: 1px solid var(--border-subtle); }
  .tform .sched .addrow { display: flex; gap: 6px; padding: 8px; border-top: 1px solid var(--border-subtle); background: var(--bg-surface-1); }
  .tform .sched .addrow .datebtn { padding: 7px 10px; font-size: 12px; white-space: nowrap; }
  .tform .sched .addrow input { flex: 1; font-size: 12px; padding: 7px 10px; }
  .tform .sched .addrow .btn { height: auto; }
  .tform .foot { display: flex; gap: 8px; margin-top: 20px; }
  .tform .foot .btn { height: 36px; justify-content: center; font-size: 13px; font-weight: 600; border-radius: 9px; }
  .tform .foot .cancel { flex: 1; }
  .tform .foot .submit { flex: 2; }
  .tform .foot .submit:disabled { background: #ccc; border-color: #ccc; opacity: 1; }
`;

function field(labelText, tag, control, { hint } = {}) {
  const f = el('div', 'f');
  const label = el('label');
  label.append(el('span', '', labelText), tag === 'wp' ? wpTag() : discussTag());
  if (hint) label.append(el('span', 'hint', hint));
  control.disabled = true;
  if (tag === 'discuss') control.classList.add('discuss-field');
  f.append(label, control);
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

function input(value = '', placeholder = '') {
  const i = el('input');
  i.value = value;
  i.placeholder = placeholder;
  return i;
}

function dateBtn(ts) {
  const b = el('div', 'datebtn');
  b.append(icon('calendar', 12), el('span', '', ts ? formatMD(ts) : '—'));
  return b;
}

function dateField(labelText, tag, ts) {
  const f = el('div', 'f');
  const label = el('label');
  label.append(el('span', '', labelText), tag === 'wp' ? wpTag() : discussTag());
  const b = dateBtn(ts);
  if (tag === 'discuss') b.classList.add('discuss-field');
  b.title = tag === 'discuss' ? 'WorkPlus 尚無此欄位，討論中' : '';
  f.append(label, b);
  return f;
}

// mode: 'new' | 'edit'；edit 時從 issue / detail 預填 WorkPlus 有的欄位
export function openTaskForm(root, { project, mode = 'new', issue = null, detail = null, members = [], dueDate = null, onClose }) {
  const src = detail ?? issue ?? {};
  const form = el('div', 'tform');
  const notice = el('div', 'notice');
  notice.append(discussTag('討論用'), el('span', '', '欄位尚未接上 WorkPlus，無法送出'));
  form.append(notice);

  const head = el('div', 'head');
  const hl = el('div');
  const st = el('div', 'st');
  if (mode === 'edit' && src.status) st.append(statusGlyph(src.status));
  else st.append(el('span', '', '待處理'));
  hl.append(st, el('div', 't', mode === 'edit' ? '編輯任務' : '新增任務'));
  head.append(hl);
  form.append(head);

  form.append(field('任務名稱 *', 'wp', input(src.title ?? '', '輸入任務名稱…')));

  const memberOpts = members.map((m) => [m, m]);
  if (src.assignee?.account && !members.includes(src.assignee.account)) memberOpts.unshift([src.assignee.account, src.assignee.account]);
  if (!memberOpts.length) memberOpts.push(['', '—']);
  const priorityOpts = [['HIGH', '高優先'], ['MEDIUM', '中優先'], ['LOW', '低優先']];
  if (src.priority === 'CRITICAL') priorityOpts.unshift(['CRITICAL', `${PRIORITY.CRITICAL.label}優先`]);
  // edit 模式忠實反映 issue：沒指派、沒優先度就顯示「—」，不要預填成別人或中優先（討論時會誤導）
  const editMemberOpts = [['', '— 未指派 —'], ...memberOpts.filter(([v]) => v)];
  const editPriorityOpts = [['', '—'], ...priorityOpts];
  const typeOpts = [['', '— 未分類 —'], ...Object.keys(PROJECT_TYPE_COLORS).map((t) => [t, t])];

  if (mode === 'edit') {
    const g = el('div', 'grid2');
    g.append(
      field('狀態', 'wp', select((project.schema?.status ?? []).map((s) => [s.id, s.name]), src.status?.id)),
      field('負責人', 'wp', select(editMemberOpts, src.assignee?.account ?? ''))
    );
    const g2 = el('div', 'grid2');
    g2.append(field('專案類型', 'discuss', select(typeOpts, '')), field('優先級', 'wp', select(editPriorityOpts, src.priority ?? '')));
    form.append(g, g2);
  } else {
    const g = el('div', 'grid3');
    g.append(
      field('負責人', 'wp', select(memberOpts, memberOpts[0][0])),
      field('專案類型', 'discuss', select(typeOpts, '')),
      field('優先級', 'wp', select(priorityOpts, 'MEDIUM'))
    );
    form.append(g);
  }

  form.append(el('div', 'group', '連結／路徑'));
  const links = el('div', 'grid2');
  links.append(
    field('需求路徑', 'discuss', input('', '輸入需求連結…')),
    field('Figma 路徑', 'discuss', input(findFigmaUrl(src.descriptionMd) ?? '', '輸入 Figma 連結…')),
    field('完稿資料夾', 'discuss', input('', '輸入完稿資料夾連結…'))
  );
  form.append(links);

  const group = el('div', 'group');
  group.append(el('span', '', mode === 'edit' ? '時程規劃' : '時程'));
  if (mode === 'edit') group.append(el('span', 'hint', '（原型：可由信件截圖／連結自動解析）'));
  form.append(group);
  const dates = el('div', 'grid4');
  dates.append(
    dateField('收到需求', 'discuss', null),
    dateField('設計初稿', 'discuss', null),
    dateField('窗口確認', 'discuss', null),
    dateField('截止', 'wp', src.dueDate ?? dueDate)
  );
  if (mode === 'edit') {
    const sched = el('div', 'sched');
    const d = el('div', 'dates');
    d.append(dates);
    const empty = el('div', 'empty');
    empty.append(el('span', '', '尚無自訂時程項目 '), discussTag());
    const addrow = el('div', 'addrow');
    const db = el('div', 'datebtn discuss-field');
    db.append(icon('calendar', 12), el('span', '', '年 / 月 / 日'));
    const inp = input('', '輸入時程項目…');
    inp.disabled = true;
    inp.classList.add('discuss-field');
    const add = el('button', 'btn', '加入');
    add.disabled = true;
    addrow.append(db, inp, add);
    sched.append(d, empty, addrow);
    form.append(sched);
    const ta = el('textarea');
    ta.value = src.descriptionMd ?? '';
    ta.placeholder = '輸入任務描述…';
    form.append(field('任務描述', 'wp', ta));
  } else {
    dates.style.marginBottom = '2px';
    form.append(dates);
  }

  form.append(field('標籤', 'wp', input((src.labels ?? []).map((l) => l.text).join(', '), '例如：視覺, RWD, 規範'), { hint: '（用逗號分隔）' }));

  const foot = el('div', 'foot');
  const cancel = el('button', 'btn cancel', '取消');
  const submit = el('button', 'btn primary submit', mode === 'edit' ? '儲存變更' : '建立任務');
  submit.disabled = true;
  submit.title = '討論用表單，不能送出';
  foot.append(cancel, submit);
  form.append(foot);

  const label = [el('span', '', mode === 'edit' && issue ? `${project.key}-${issue.serialNumber}` : project.key)];
  const modal = openModal(root, { label, content: form, side: null, width: 520, stack: true, onClose });
  cancel.addEventListener('click', () => modal.close());
  return modal;
}
