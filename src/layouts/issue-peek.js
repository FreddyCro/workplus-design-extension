// Issue 彈出視窗：單欄、860px，內容由 issue-body.js 產生。有 edit 時就地編輯，存檔後用最新資料重畫。
import { el } from '../app/dom.js';
import { icon, typeIcon, typeClass } from '../app/icons.js';
import { issueDetail } from '../api.js';
import { openModal } from '../ui/modal.js';
import { issueBody } from './issue-body.js';

export { stripAttachmentMarkup } from './issue-body.js';

export const PEEK_CSS = `
  .peek { min-height: 120px; }
  .peek .loading { color: var(--txt-3); font-style: italic; padding: 24px 0; }
  .open-orig { display: inline-flex; align-items: center; gap: 4px; color: var(--txt-3); white-space: nowrap; }
  .open-orig:hover { color: var(--brand); }
`;

// edit：{ members, save(issueId, apply) → 最新 detail, onSaved(detail), remove(issueId), onRemoved(issueId) }
export async function openIssuePeek(root, { project, issue: brief, today, onClose, edit }) {
  const content = el('div', 'peek');
  content.append(el('div', 'loading', '載入中…'));
  const label = [el('span', typeClass(brief.type?.name)), el('span', '', String(brief.serialNumber))];
  label[0].append(typeIcon(brief.type?.name, 14));
  const modal = openModal(root, { label, content, side: null, width: 860, onClose });

  let issue;
  try {
    issue = await issueDetail(brief.id);
  } catch (err) {
    content.replaceChildren(el('div', 'msg error', `載入失敗：${err.message}`));
    return modal;
  }
  const mount = (d) => content.replaceChildren(issueBody(project, d, {
    today,
    edit: edit && {
      members: edit.members,
      save: async (apply) => {
        const next = await edit.save(d.id, apply);
        mount(next);
        edit.onSaved?.(next);
      },
      remove: edit.remove && (async () => {
        await edit.remove(d.id);
        modal.close();
        edit.onRemoved?.(d.id);
      }),
    },
  }));
  mount(issue);
  return modal;
}
