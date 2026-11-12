// 共用的 issue 卡片（看板、月曆）與屬性 chip 列。文字一律 textContent。
import { el, initials } from '../app/dom.js';
import { icon, typeIcon, typeClass } from '../app/icons.js';
import { dueDateLabel, labelsSummary } from './chips.js';

export const CARD_CSS = `
  .card { display: block; background: var(--bg-surface-1); border: 1px solid var(--border-subtle); border-radius: var(--radius-md);
          padding: 10px 12px; box-shadow: 0 1px 2px rgb(0 0 0 / 4%); cursor: pointer; }
  .card:hover { border-color: var(--border-strong); box-shadow: 0 2px 6px rgb(0 0 0 / 8%); }
  .card.dragging { opacity: .5; }
  .card .head { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 500; color: var(--txt-3); }
  .card .title { margin: 4px 0 8px; color: var(--txt-1); font-size: 13px; line-height: 1.4; }
  .chips { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
  .chip { display: inline-flex; align-items: center; gap: 4px; height: 22px; padding: 0 6px; border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm); font-size: 11px; color: var(--txt-2); background: var(--bg-surface-1); white-space: nowrap; }
  .chip.overdue { color: var(--red); border-color: color-mix(in oklch, var(--red), white 60%); }
  .chip .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--bg-layer-2); flex: none; }
  .chip .avatar { width: 16px; height: 16px; font-size: 8px; }
  .chip.pri-CRITICAL { color: var(--red); } .chip.pri-HIGH { color: var(--amber); }
  .chip .status-dot { width: 9px; height: 9px; }
  .mini { display: flex; align-items: center; gap: 5px; padding: 2px 6px; border-radius: var(--radius-sm); font-size: 11px; cursor: pointer;
          background: var(--bg-surface-1); border: 1px solid var(--border-subtle); min-width: 0; }
  .mini:hover { border-color: var(--border-strong); }
  .mini .t { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--txt-1); }
  .mini .k { color: var(--txt-3); font-weight: 500; flex: none; }
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

export function issueCard(projectKey, issue, { onOpen, today } = {}) {
  const card = el('div', 'card');
  card.dataset.issueId = issue.id;
  const head = el('div', 'head');
  const t = el('span', typeClass(issue.type?.name));
  t.append(typeIcon(issue.type?.name));
  head.append(t, el('span', '', `${projectKey}-${issue.serialNumber}`));
  card.append(head, el('div', 'title', issue.title), chipsFor(issue, { today }));
  if (onOpen) card.addEventListener('click', () => onOpen(issue));
  return card;
}

// 月曆用的小卡
export function miniCard(projectKey, issue, { onOpen } = {}) {
  const m = el('div', 'mini');
  m.dataset.issueId = issue.id;
  const t = el('span', typeClass(issue.type?.name));
  t.append(typeIcon(issue.type?.name, 12));
  m.append(t, el('span', 'k', `${projectKey}-${issue.serialNumber}`), el('span', 't', issue.title));
  m.title = issue.title;
  if (onOpen) m.addEventListener('click', () => onOpen(issue));
  return m;
}
