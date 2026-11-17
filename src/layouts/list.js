// List：依狀態分組的列表，每列是 type icon + key + 標題 + 屬性 chip。點列開彈出視窗。
import { el } from '../app/dom.js';
import { icon, typeIcon, typeClass } from '../app/icons.js';
import { chipsFor, statusDot } from '../ui/issue-card.js';

export const LIST_CSS = `
  .list { flex: 1; min-height: 0; overflow: auto; }
  .list .group { border-bottom: 1px solid var(--border-subtle); }
  .list .ghead { display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: var(--bg-surface-2); font-weight: 500; position: sticky; top: 0; z-index: 2; cursor: pointer; }
  .list .ghead .chev { margin-left: auto; color: var(--txt-3); transition: transform .15s; }
  .list .group.closed .chev { transform: rotate(-90deg); }
  .list .group.closed .rows { display: none; }
  .list .row { display: flex; align-items: center; gap: 10px; padding: 7px 16px 7px 24px; border-top: 1px solid var(--border-subtle); cursor: pointer; min-width: 0; }
  .list .row:hover { background: var(--bg-layer-1); }
  .list .row .key { font-size: 12px; font-weight: 500; color: var(--txt-3); flex: none; width: 32px; text-align: right; font-variant-numeric: tabular-nums; }
  .list .row .title { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .list .row .chips { flex: none; flex-wrap: nowrap; }
  .list .empty-group { padding: 8px 24px; color: var(--txt-placeholder); font-size: 12px; }
`;

export function renderList(main, state, { onOpen, filter } = {}) {
  const { project, issues } = state;
  const list = el('div', 'list');
  const visible = filter ? issues.filter(filter) : issues;
  for (const status of project.schema.status) {
    const items = visible.filter((i) => i.status?.id === status.id);
    const group = el('section', 'group');
    const head = el('div', 'ghead');
    const chev = el('span', 'chev');
    chev.append(icon('chevron', 14));
    head.append(statusDot(status), el('span', '', status.name), el('span', 'count qty', `${items.length} 項`), chev);
    head.addEventListener('click', () => group.classList.toggle('closed'));
    const rows = el('div', 'rows');
    if (!items.length) rows.append(el('div', 'empty-group', '沒有 issue'));
    for (const issue of items) {
      const row = el('div', 'row');
      row.dataset.issueId = issue.id;
      const t = el('span', typeClass(issue.type?.name));
      t.append(typeIcon(issue.type?.name));
      row.append(t, el('span', 'key', String(issue.serialNumber)), el('span', 'title', issue.title), chipsFor(issue));
      if (onOpen) row.addEventListener('click', () => onOpen(issue));
      rows.append(row);
    }
    group.append(head, rows);
    list.append(group);
  }
  main.replaceChildren(list);
}
