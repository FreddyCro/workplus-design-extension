// 看板：依專案 schema 的狀態分欄；卡片可拖到別欄改狀態（updateIssue { status, autoAssignee: false }）。
import { el } from '../app/dom.js';
import { icon } from '../app/icons.js';
import { issueCard, statusDot } from '../ui/issue-card.js';
import { updateStatus } from '../api.js';
import { toast } from '../ui/toast.js';
import { assertWritable } from '../ui/guard.js';

export const BOARD_CSS = `
  .board { display: flex; gap: 12px; overflow: auto; align-items: flex-start; padding: 12px 16px; flex: 1; min-height: 0; }
  .col { width: 300px; flex: none; background: var(--bg-layer-1); border-radius: var(--radius-lg); padding: 8px; display: flex; flex-direction: column; gap: 8px;
         max-height: 100%; }
  .col.over { outline: 2px solid var(--brand); outline-offset: -2px; }
  .col .colhead { display: flex; align-items: center; gap: 8px; padding: 4px 6px; font-size: 13px; font-weight: 500; color: var(--txt-1); }
  .col .colhead .count { color: var(--txt-3); font-weight: 400; }
  .col .colhead .spacer { flex: 1; }
  .col .colhead .iconbtn { width: 22px; height: 22px; }
  .col .cards { display: flex; flex-direction: column; gap: 8px; overflow: auto; min-height: 24px; }
  .col .add { display: flex; align-items: center; gap: 6px; padding: 6px; color: var(--txt-3); font-size: 12px; border-radius: var(--radius-sm); }
  .col .add:hover { background: var(--bg-layer-2); color: var(--txt-1); }
  .card[draggable="true"] { cursor: grab; }
`;

export function renderBoard(main, state, { onOpen, filter } = {}) {
  const { project, issues } = state;
  const root = main.getRootNode();
  const board = el('div', 'board');
  const visible = filter ? issues.filter(filter) : issues;

  for (const status of project.schema.status) {
    const cards = visible.filter((i) => i.status?.id === status.id);
    const col = el('section', 'col');
    col.dataset.statusId = status.id;
    const head = el('div', 'colhead');
    const collapse = el('button', 'iconbtn');
    collapse.append(icon('collapse', 14));
    collapse.title = '收合（尚未支援）';
    const plus = el('button', 'iconbtn');
    plus.append(icon('plus', 14));
    plus.disabled = true;
    plus.title = '建 issue 尚未支援';
    head.append(statusDot(status), el('span', '', status.name), el('span', 'count', String(cards.length)), el('span', 'spacer'), collapse, plus);
    const list = el('div', 'cards');
    for (const issue of cards) {
      const card = issueCard(project.key, issue, { onOpen });
      card.draggable = true;
      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', issue.id);
        e.dataTransfer.effectAllowed = 'move';
        card.classList.add('dragging');
      });
      card.addEventListener('dragend', () => card.classList.remove('dragging'));
      list.append(card);
    }
    const add = el('button', 'add');
    add.append(icon('plus', 12), el('span', '', 'New work item'));
    add.disabled = true;
    col.append(head, list, add);

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
      renderBoard(main, state, { onOpen, filter });
      try {
        assertWritable(id, project.key, issue.serialNumber);
        await updateStatus(id, status.id);
        toast(root, `${project.key}-${issue.serialNumber} 狀態改為 ${status.name}`);
      } catch (err) {
        issue.status = before;
        renderBoard(main, state, { onOpen, filter });
        toast(root, `更新狀態失敗：${err.message}`, { kind: 'error' });
      }
    });
    board.append(col);
  }
  main.replaceChildren(board);
}

