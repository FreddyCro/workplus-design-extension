// 共用的 issue 卡片與屬性元件。卡片、列、月曆小卡照設計師原型；chipsFor / statusDot 留給 List。文字一律 textContent。
import { el, initials } from '../app/dom.js';
import { icon, typeIcon, typeClass } from '../app/icons.js';
import { dueDateLabel, labelsSummary } from './chips.js';
import { statusStyle, priorityStyle, memberColor, labelColor } from './palette.js';
import { dueText } from './due.js';

export const CARD_CSS = `
  /* 原型卡片 */
  .card { display: block; background: var(--bg-surface-1); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg);
          padding: 13px; box-shadow: var(--shadow-card); cursor: pointer; transition: all .12s; }
  .card:hover { border-color: var(--border-focus); box-shadow: var(--shadow-card-hover); transform: translateY(-1px); }
  .card.dragging { opacity: .5; }
  .card .head { display: flex; align-items: center; gap: 5px; margin-bottom: 7px; min-width: 0; }
  .card .head .key { margin-left: auto; font-size: 11px; color: var(--txt-4); font-weight: 500; white-space: nowrap; }
  .card .title { font-size: 13.5px; font-weight: 600; color: var(--txt-1); line-height: 1.4; margin-bottom: 9px;
                 display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .card .labels { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 9px; }
  .card .foot { display: flex; align-items: center; justify-content: space-between; gap: 6px; min-height: 22px; }
  .card .foot .left { display: flex; align-items: center; gap: 6px; }

  /* 共用小元件 */
  .pill.pri { display: inline-flex; align-items: center; font-size: 10px; font-weight: 600; border-radius: var(--radius-sm); padding: 1px 6px; white-space: nowrap; }
  .chip.label { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 500; color: var(--txt-2); background: var(--bg-layer-2);
                border-radius: var(--radius-sm); padding: 1px 7px; white-space: nowrap; max-width: 160px; overflow: hidden; text-overflow: ellipsis; }
  .chip.label.primary { font-weight: 600; letter-spacing: .02em; }
  .glyph { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; white-space: nowrap; }
  .glyph .g { font-size: 13px; line-height: 1; }
  .due { display: inline-flex; align-items: center; font-size: 10.5px; font-weight: 700; border-radius: var(--radius-sm); padding: 1px 6px; white-space: nowrap; }
  .due.none { color: var(--txt-4); font-weight: 400; font-size: 11px; padding: 0; }
  .due.overdue { color: var(--red); background: var(--red-soft); }
  .due.today, .due.upcoming { color: var(--amber); background: var(--amber-soft); }
  .avatar.member { color: #333; border: 1.5px solid rgb(0 0 0 / 6%); font-size: 9px; width: 22px; height: 22px; }

  /* List 用的舊 chip 列（不動） */
  .chips { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
  .chip:not(.label) { display: inline-flex; align-items: center; gap: 4px; height: 22px; padding: 0 6px; border: 1px solid var(--border-subtle);
          border-radius: 4px; font-size: 11px; color: var(--txt-2); background: var(--bg-surface-1); white-space: nowrap; }
  .chip.overdue { color: var(--red); border-color: color-mix(in oklch, var(--red), white 60%); }
  .chip .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--bg-layer-2); flex: none; }
  .chip .avatar { width: 16px; height: 16px; font-size: 8px; }
  .chip.pri-CRITICAL { color: var(--red); } .chip.pri-HIGH { color: var(--amber); }
  .chip .status-dot { width: 9px; height: 9px; }

  /* 看板上下排列的列（原型 list mode） */
  .brow { display: flex; align-items: center; gap: 12px; padding: 8px 14px; background: var(--bg-surface-1); border: 1px solid var(--border-subtle); border-radius: var(--radius-md);
          cursor: pointer; transition: all .12s; min-width: 0; }
  .brow:hover { border-color: var(--border-focus); box-shadow: 0 2px 10px rgb(0 0 0 / 7%); }
  .brow.expanded { background: var(--brand-faint); border-color: #c8d8f8; border-radius: var(--radius-md) var(--radius-md) 0 0; border-bottom: 0; box-shadow: none; }
  .brow .chev { color: var(--txt-4); flex: none; transition: transform .15s; display: flex; }
  .brow.expanded .chev { color: var(--brand); transform: rotate(180deg); }
  .brow .title { flex: 1 1 0; min-width: 0; font-size: 13px; font-weight: 600; color: var(--txt-1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .brow .key { font-size: 11px; color: var(--txt-4); flex: none; }
  .brow .due { flex: none; min-width: 30px; justify-content: flex-end; }
  .brow .chip.label { flex: none; }
  .brow .avatar.member { width: 22px; height: 22px; }
  .brow[draggable="true"] { cursor: pointer; }

  /* 月曆小卡 */
  .citem { display: flex; align-items: center; padding: 2px 5px; border-radius: 4px; border-left: 3px solid transparent; font-size: 10.5px; font-weight: 500;
           color: var(--txt-1); cursor: pointer; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; min-width: 0; }
  .citem:hover { filter: brightness(.96); }
  .citem.done { color: var(--txt-3); text-decoration: line-through; background: var(--bg-layer-2) !important; }
  .citem[draggable="true"] { cursor: grab; }
`;

export function statusDot(status) {
  return el('span', `status-dot ${status?.category?.name ?? ''}`);
}

export function chip(className, children, title) {
  const c = el('span', `chip ${className}`.trim());
  c.append(...children.filter(Boolean));
  if (title) c.title = title;
  return c;
}

// List 用的 chip 列（Plane 樣式，保留）
export function chipsFor(issue, { today = new Date() } = {}) {
  const row = el('div', 'chips');
  row.append(chip('', [statusDot(issue.status), el('span', '', issue.status?.name ?? '—')]));
  if (issue.priority) row.append(chip(`pri-${issue.priority}`, [icon('priority', 12)], `優先度 ${issue.priority}`));
  const due = dueDateLabel(issue.dueDate, today);
  if (due) row.append(chip(due.overdue ? 'overdue' : '', [icon('calendar', 12), el('span', '', due.text)], due.overdue ? '已逾期' : '到期日'));
  const rel = issue.issueRelations?.count;
  if (rel) row.append(chip('', [icon('link', 12), el('span', '', String(rel))], `${rel} 個關聯`));
  if (issue.assignee) row.append(chip('', [el('span', 'avatar soft', initials(issue.assignee.account))], issue.assignee.account));
  const labels = labelsSummary(issue.labels);
  if (labels) {
    for (const l of labels.items) {
      const dot = el('span', 'dot');
      if (l.color && /^#[0-9a-f]{3,8}$/i.test(l.color)) dot.style.background = l.color;
      row.append(chip('', [dot, el('span', '', l.text)]));
    }
    if (labels.more) row.append(chip('', [el('span', 'dot'), el('span', '', labels.more)], issue.labels.map((l) => l.text).join(', ')));
  }
  if (issue.milestone) row.append(chip('', [icon('tag', 12), el('span', '', issue.milestone.name)], '里程碑'));
  return row;
}

// ── 原型小元件 ─────────────────────────────────────────────

// 狀態字元 + 名稱（顏色由 palette 決定）
export function statusGlyph(status, { withName = true } = {}) {
  const s = statusStyle(status);
  const g = el('span', 'glyph');
  g.style.color = s.color;
  g.append(el('span', 'g', s.glyph));
  if (withName) g.append(el('span', '', status?.name ?? '—'));
  return g;
}

export function priorityPill(priority) {
  const p = priorityStyle(priority);
  const pill = el('span', 'pill pri', p.label);
  pill.style.color = p.color;
  pill.style.background = p.bg;
  pill.title = `優先度 ${priority ?? '—'}`;
  return pill;
}

// primary：原型的「專案類型」chip，用 label 的顏色；否則灰底標籤
export function labelChip(label, { primary = false } = {}) {
  const c = el('span', `chip label${primary ? ' primary' : ''}`, label.text);
  c.title = label.text;
  if (primary) {
    const color = labelColor(label);
    c.style.color = color;
    c.style.background = `color-mix(in srgb, ${color} 12%, white)`;
  }
  return c;
}

export function dueBadge(ts, today = new Date()) {
  const t = dueText(ts, today);
  if (!t) return null;
  return el('span', `due ${t.level}`, t.text);
}

export function memberAvatar(account, size = 22) {
  const a = el('span', 'avatar member', initials(account));
  a.style.background = memberColor(account);
  a.style.width = `${size}px`;
  a.style.height = `${size}px`;
  a.title = account ?? '';
  return a;
}

// 看板卡片（原型 TaskCard 的 card mode）
export function issueCard(projectKey, issue, { onOpen, today } = {}) {
  const card = el('div', 'card');
  card.dataset.issueId = issue.id;
  const head = el('div', 'head');
  head.append(priorityPill(issue.priority));
  const [first, ...rest] = issue.labels ?? [];
  if (first) head.append(labelChip(first, { primary: true }));
  head.append(el('span', 'key', `${projectKey}-${issue.serialNumber}`));
  card.append(head, el('div', 'title', issue.title));
  if (rest.length) {
    const labels = el('div', 'labels');
    labels.append(...rest.map((l) => labelChip(l)));
    card.append(labels);
  }
  const due = dueBadge(issue.dueDate, today);
  if (issue.assignee || due) {
    // 沒指派人也沒到期日就不放底列，標題下不留白
    const foot = el('div', 'foot');
    const left = el('div', 'left');
    if (issue.assignee) left.append(memberAvatar(issue.assignee.account));
    foot.append(left);
    if (due) foot.append(due);
    card.append(foot);
  }
  card.title = issue.title;
  if (onOpen) card.addEventListener('click', () => onOpen(issue));
  return card;
}

// 看板上下排列的列。expanded 時右側 chip 隱藏（展開的內容區會重複顯示）
export function boardRow(projectKey, issue, { expanded = false, onToggle, today } = {}) {
  const row = el('div', `brow${expanded ? ' expanded' : ''}`);
  row.dataset.issueId = issue.id;
  const chev = el('span', 'chev');
  chev.append(icon('chevron', 12));
  row.append(chev, el('span', 'title', issue.title));
  row.firstChild.nextSibling.title = issue.title;
  if (!expanded) {
    const [first, ...rest] = issue.labels ?? [];
    if (first) row.append(labelChip(first, { primary: true }));
    row.append(...rest.slice(0, 2).map((l) => labelChip(l)));
    row.append(priorityPill(issue.priority));
    if (issue.assignee) row.append(memberAvatar(issue.assignee.account));
    const due = dueBadge(issue.dueDate, today);
    if (due) row.append(due);
  }
  row.append(el('span', 'key', `${projectKey}-${issue.serialNumber}`));
  if (onToggle) row.addEventListener('click', () => onToggle(issue));
  return row;
}

// 月曆小卡（原型：底色 = 負責人色、左框 = 優先度色、只有標題）
export function calendarItem(issue, { onOpen } = {}) {
  const done = issue.status?.category?.name === 'done';
  const m = el('div', `citem${done ? ' done' : ''}`, issue.title);
  m.dataset.issueId = issue.id;
  m.style.background = memberColor(issue.assignee?.account);
  m.style.borderLeftColor = priorityStyle(issue.priority).color;
  m.title = `${issue.status?.name ?? '—'} · ${issue.title}`;
  if (onOpen) m.addEventListener('click', (e) => { e.stopPropagation(); onOpen(issue); });
  return m;
}

export { typeIcon, typeClass };
