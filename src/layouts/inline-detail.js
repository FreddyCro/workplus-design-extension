// 看板上下排列時，列下方就地展開的 issue 內容（同視窗，不含活動）。
import { el } from '../app/dom.js';
import { issueDetail } from '../api.js';
import { issueBody } from './issue-body.js';

export const INLINE_CSS = `
  .inline-detail { background: var(--bg-surface-1); border: 1px solid #c8d8f8; border-top: 0; border-radius: 0 0 var(--radius-lg) var(--radius-lg); padding: 0 16px; margin-bottom: 4px; }
  .inline-detail .loading { color: var(--txt-3); font-style: italic; padding: 16px 4px; font-size: 12px; }
  .inline-detail .ibody .top { padding-top: 12px; }
`;

// edit：同 issue-peek。存檔後由 edit.onSaved 重畫看板（會重新展開、重抓）
export function renderInlineDetail(container, { project, issue, today, edit }) {
  const box = el('div', 'inline-detail');
  box.append(el('div', 'loading', '載入中…'));
  container.append(box);
  let alive = true;
  issueDetail(issue.id)
    .then((detail) => {
      if (!alive) return;
      box.replaceChildren(issueBody(project, detail, {
        today,
        showActivity: false,
        edit: edit && {
          members: edit.members,
          save: async (apply) => edit.onSaved?.(await edit.save(detail.id, apply)),
          remove: edit.remove && (async () => { await edit.remove(detail.id); edit.onRemoved?.(detail.id); }),
        },
      }));
    })
    .catch((err) => {
      if (alive) box.replaceChildren(el('div', 'msg error', `載入失敗：${err.message}`));
    });
  return { destroy: () => { alive = false; box.remove(); } };
}
