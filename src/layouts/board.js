// 看板：依專案 schema 的狀態分欄；左右排列是卡片、上下排列是列（點列在下方就地展開）。
// 卡片 / 列可拖到別欄改狀態（updateIssue { status, autoAssignee: false }）。版面照設計師原型。
import { el } from '../app/dom.js';
import { icon } from '../app/icons.js';
import { issueCard, boardRow, statusGlyph } from '../ui/issue-card.js';
import { renderInlineDetail } from './inline-detail.js';
import { updateStatus } from '../api.js';
import { toast } from '../ui/toast.js';
import { assertWritable } from '../ui/guard.js';

export const BOARD_CSS = `
  .board-toolbar { display: flex; align-items: center; justify-content: flex-end; gap: 8px; padding: 8px 20px 0; flex: none; }
  .board-toolbar .seg { display: flex; border: 1px solid var(--border-strong); border-radius: var(--radius-md); overflow: hidden; background: var(--bg-surface-1); }
  .board-toolbar .seg button { display: grid; place-items: center; width: 34px; height: 28px; color: var(--txt-4); }
  .board-toolbar .seg button + button { border-left: 1px solid var(--border-strong); }
  .board-toolbar .seg button.active { background: var(--brand-soft); color: var(--brand); }
  .board { display: flex; gap: 10px; overflow: auto; align-items: flex-start; padding: 12px 20px 16px; flex: 1; min-height: 0; }
  .col { width: 268px; flex: none; border-radius: 12px; padding: 0; display: flex; flex-direction: column; max-height: 100%; border: 1.5px solid transparent; transition: background .15s; }
  .col.over { background: var(--brand-soft); border: 1.5px dashed var(--brand); }
  .col .colhead { display: flex; align-items: center; gap: 6px; padding: 6px 10px 10px; font-size: 13px; font-weight: 600; color: var(--txt-1); }
  .col .colhead .count { margin-left: auto; background: var(--border-subtle); color: var(--txt-2); font-size: 11px; font-weight: 700; border-radius: 6px; padding: 1px 7px; }
  .col .colhead .iconbtn { width: 22px; height: 22px; }
  .col .colhead .btn.addv { height: 24px; font-size: 12px; color: var(--brand); border-color: color-mix(in srgb, var(--brand) 27%, white); background: transparent; }
  .col .cards { display: flex; flex-direction: column; gap: 6px; padding: 0 6px 8px; overflow: auto; min-height: 24px; }
  .col .add { display: flex; align-items: center; justify-content: center; gap: 4px; padding: 7px; margin: 0 6px 8px; border: 1px dashed var(--border-strong); border-radius: var(--radius-md);
              color: var(--txt-4); font-size: 12.5px; transition: all .15s; }
  .col .add:hover { border-color: var(--brand); color: var(--brand); }
  .card[draggable="true"] { cursor: grab; }

  /* 上下排列 */
  .board.vertical { flex-direction: column; align-items: stretch; overflow: auto; padding: 8px 28px 16px; gap: 8px; }
  .board.vertical .col { width: auto; max-height: none; flex: none; }
  .board.vertical .col .cards { overflow: visible; gap: 4px; padding: 0 6px 12px; }
  .board.vertical .sep { height: 1px; background: var(--border-subtle); margin: 4px 0; }
`;

export function renderBoard(main, state, { onOpen, onAdd, onEdit, filter, today } = {}) {
  const { project, issues, prefs } = state;
  const root = main.getRootNode();
  const vertical = prefs?.boardLayout === 'vertical';
  const visible = filter ? issues.filter(filter) : issues;
  state.boardExpanded ??= null; // 上下排列時展開的 issue id（同時只一個）
  const redraw = () => renderBoard(main, state, { onOpen, onAdd, onEdit, filter, today });

  const toolbar = el('div', 'board-toolbar');
  const seg = el('div', 'seg');
  for (const [mode, ico, title] of [['horizontal', 'cols', '左右排列'], ['vertical', 'rows', '上下排列']]) {
    const b = el('button', (vertical ? 'vertical' : 'horizontal') === mode ? 'active' : '');
    b.title = title;
    b.append(icon(ico));
    b.addEventListener('click', () => {
      if (prefs) { prefs.boardLayout = mode; state.savePrefs?.(); }
      redraw();
    });
    seg.append(b);
  }
  toolbar.append(seg);

  const board = el('div', `board${vertical ? ' vertical' : ''}`);
  const statuses = project.schema.status;
  statuses.forEach((status, idx) => {
    const items = visible.filter((i) => i.status?.id === status.id);
    const col = el('section', 'col');
    col.dataset.statusId = status.id;
    const head = el('div', 'colhead');
    head.append(statusGlyph(status), el('span', 'count', String(items.length)));
    if (vertical) {
      const addv = el('button', 'btn addv');
      addv.append(icon('plus', 12), el('span', '', '新增'));
      addv.addEventListener('click', () => onAdd?.(status.id));
      head.append(addv);
    } else {
      const plus = el('button', 'iconbtn');
      plus.append(icon('plus', 14));
      plus.title = '新增任務（討論用表單）';
      plus.addEventListener('click', () => onAdd?.(status.id));
      head.append(plus);
    }
    const list = el('div', 'cards');
    for (const issue of items) {
      const expanded = vertical && state.boardExpanded === issue.id;
      const node = vertical
        ? boardRow(project.key, issue, { expanded, today, onToggle: () => { state.boardExpanded = expanded ? null : issue.id; redraw(); } })
        : issueCard(project.key, issue, { onOpen, today });
      node.draggable = true;
      node.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', issue.id);
        e.dataTransfer.effectAllowed = 'move';
        node.classList.add('dragging');
      });
      node.addEventListener('dragend', () => node.classList.remove('dragging'));
      if (vertical) {
        const wrap = el('div');
        wrap.append(node);
        if (expanded) renderInlineDetail(wrap, { project, issue, today, onEdit });
        list.append(wrap);
      } else list.append(node);
    }
    col.append(head, list);
    if (!vertical) {
      const add = el('button', 'add');
      add.append(icon('plus', 12), el('span', '', 'New work item'));
      add.addEventListener('click', () => onAdd?.(status.id));
      col.append(add);
    }

    col.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      col.classList.add('over');
    });
    col.addEventListener('dragleave', (e) => {
      if (!col.contains(e.relatedTarget)) col.classList.remove('over');
    });
    col.addEventListener('drop', async (e) => {
      e.preventDefault();
      col.classList.remove('over');
      const id = e.dataTransfer.getData('text/plain');
      const issue = issues.find((i) => i.id === id);
      if (!issue || issue.status?.id === status.id) return; // 放回同一欄不送請求
      const before = issue.status;
      issue.status = status;
      redraw();
      try {
        assertWritable(id, project.key, issue.serialNumber);
        await updateStatus(id, status.id);
        toast(root, `${project.key}-${issue.serialNumber} 狀態改為 ${status.name}`);
      } catch (err) {
        issue.status = before;
        redraw();
        toast(root, `更新狀態失敗：${err.message}`, { kind: 'error' });
      }
    });
    board.append(col);
    if (vertical && idx < statuses.length - 1) board.append(el('div', 'sep'));
  });
  main.replaceChildren(toolbar, board);
}
