// 行事曆右側面板（原型）：選取日的「當日截止任務」與「即將截止（14 天內）」。
import { el } from '../app/dom.js';
import { icon } from '../app/icons.js';
import { dayKey } from '../timeline/calendar-grid.js';
import { addDays } from '../timeline/scale.js';
import { statusGlyph, labelChip, memberAvatar } from '../ui/issue-card.js';
import { priorityStyle } from '../ui/palette.js';
import { formatMD } from '../ui/due.js';

export const CAL_PANEL_CSS = `
  .cal-panel { width: 340px; flex: none; border-left: 1px solid var(--border-subtle); background: var(--bg-surface-1); display: flex; flex-direction: column; min-height: 0; }
  .cal-panel[hidden] { display: none; }
  .cal-panel .ph { padding: 18px 18px 14px; border-bottom: 1px solid var(--border-subtle); display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
  .cal-panel .ph .d { font-size: 18px; font-weight: 700; color: #111; letter-spacing: -.01em; display: flex; align-items: center; gap: 7px; }
  .cal-panel .ph .d .tt { font-size: 10.5px; color: var(--brand); background: var(--brand-soft); border-radius: 5px; padding: 2px 6px; font-weight: 700; letter-spacing: .04em; }
  .cal-panel .ph .n { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--txt-3); margin-top: 3px; }
  .cal-panel .ph .plus { width: 28px; height: 28px; border-radius: 50%; background: var(--brand); color: #fff; font-size: 16px; display: grid; place-items: center; flex: none; line-height: 1; }
  .cal-panel .ph .plus:hover { background: var(--brand-hover); }
  .cal-panel .pb { flex: 1; overflow: auto; padding: 14px 16px; }
  .cal-panel .sec { margin-bottom: 16px; }
  .cal-panel .sec .st { width: 100%; display: flex; align-items: center; justify-content: space-between; padding: 6px 2px; font-size: 12px; font-weight: 700; color: var(--txt-2); }
  .cal-panel .sec .st > span:first-child { display: inline-flex; align-items: center; }
  .cal-panel .sec .st .n { margin-left: 6px; }
  .cal-panel .sec .st .chev { color: var(--txt-3); transition: transform .15s; display: flex; }
  .cal-panel .sec.closed .st .chev { transform: rotate(-90deg); }
  .cal-panel .sec .rows { display: flex; flex-direction: column; gap: 6px; margin-top: 6px; }
  .cal-panel .sec.closed .rows { display: none; }
  .cal-panel .empty { color: var(--txt-4); font-size: 12px; text-align: center; padding: 20px 0; }
  .cal-panel .trow { padding: 10px 12px; border: 1px solid var(--border-subtle); border-radius: 9px; background: var(--bg-surface-1); cursor: pointer; transition: all .12s; }
  .cal-panel .trow:hover { border-color: color-mix(in srgb, var(--brand) 55%, white); background: #fafbff; }
  .cal-panel .trow .l1 { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; min-width: 0; }
  .cal-panel .trow .l1 .pd { width: 5px; height: 5px; border-radius: 50%; flex: none; }
  .cal-panel .trow .l1 .t { flex: 1; min-width: 0; font-size: 12.5px; font-weight: 600; color: var(--txt-1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cal-panel .trow.done .l1 .t { color: var(--txt-3); text-decoration: line-through; }
  .cal-panel .trow .l2 { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 11.5px; color: var(--txt-2); }
  .cal-panel .trow .l2 .who { display: flex; align-items: center; gap: 6px; min-width: 0; }
  .cal-panel .trow .l2 .who .avatar { width: 18px; height: 18px; font-size: 8px; }
  .cal-panel .trow .l2 .right { display: flex; align-items: center; gap: 6px; }
  .cal-panel .trow .l2 .glyph { font-size: 11px; }
  .cal-panel .trow .l2 .md { font-size: 10.5px; color: var(--txt-3); }
`;

function row(issue, { selectedKey, onOpen }) {
  const cat = issue.status?.category?.name;
  const done = cat === 'done' || /取消|cancel/i.test(issue.status?.name ?? '');
  const r = el('div', `trow${done ? ' done' : ''}`);
  const l1 = el('div', 'l1');
  const pd = el('span', 'pd');
  pd.style.background = priorityStyle(issue.priority).color;
  l1.append(pd, el('span', 't', issue.title));
  l1.lastChild.title = issue.title;
  const [first] = issue.labels ?? [];
  if (first) l1.append(labelChip(first, { primary: true }));
  const l2 = el('div', 'l2');
  const who = el('div', 'who');
  if (issue.assignee) who.append(memberAvatar(issue.assignee.account, 18), el('span', '', issue.assignee.account));
  else who.append(el('span', '', '—'));
  const right = el('div', 'right');
  right.append(statusGlyph(issue.status));
  const k = dayKey(new Date(issue.dueDate));
  if (k !== selectedKey) right.append(el('span', 'md', formatMD(issue.dueDate)));
  l2.append(who, right);
  r.append(l1, l2);
  if (onOpen) r.addEventListener('click', () => onOpen(issue));
  return r;
}

function section(title, items, { key, expanded, onToggle, emptyText, selectedKey, onOpen }) {
  const sec = el('div', `sec${expanded[key] ? '' : ' closed'}`);
  const st = el('button', 'st');
  const left = el('span');
  left.append(el('span', '', title));
  if (items.length) left.append(el('span', 'n qty', `${items.length} 項`));
  const chev = el('span', 'chev');
  chev.append(icon('chevron', 10));
  st.append(left, chev);
  st.addEventListener('click', () => onToggle(key));
  const rows = el('div', 'rows');
  if (!items.length) rows.append(el('div', 'empty', emptyText));
  for (const i of items) rows.append(row(i, { selectedKey, onOpen }));
  sec.append(st, rows);
  return sec;
}

// onAdd(dayKey)、onToggle('today' | 'upcoming')
export function renderCalendarPanel(aside, { project, dayKey: selectedKey, issues, today = new Date(), expanded, onOpen, onAdd, onToggle }) {
  const [y, m, d] = selectedKey.split('-').map(Number);
  const sel = new Date(y, m - 1, d);
  const endKey = dayKey(addDays(sel, 14));
  const withDue = issues.filter((i) => i.dueDate);
  const dayIssues = withDue.filter((i) => dayKey(new Date(i.dueDate)) === selectedKey);
  const upcoming = withDue
    .filter((i) => { const k = dayKey(new Date(i.dueDate)); return k > selectedKey && k <= endKey; })
    .sort((a, b) => a.dueDate - b.dueDate);

  const ph = el('div', 'ph');
  const hl = el('div');
  const dd = el('div', 'd');
  dd.append(el('span', '', `${m} 月 ${d} 日`));
  if (selectedKey === dayKey(today)) dd.append(el('span', 'tt', '今天'));
  const n = el('div', 'n');
  n.append(el('span', '', '截止任務'), el('span', 'qty', `${dayIssues.length} 項`));
  hl.append(dd, n);
  const plus = el('button', 'plus', '+');
  plus.title = '新增任務（討論用表單，截止日預填此日）';
  plus.addEventListener('click', () => onAdd?.(selectedKey));
  ph.append(hl, plus);

  const pb = el('div', 'pb');
  pb.append(
    section('當日截止任務', dayIssues, { key: 'today', expanded, onToggle, emptyText: '當日無截止任務', selectedKey, onOpen }),
    section('即將截止（14 天內）', upcoming, { key: 'upcoming', expanded, onToggle, emptyText: '這段期間無其他截止任務', selectedKey, onOpen })
  );
  aside.replaceChildren(ph, pb);
}
