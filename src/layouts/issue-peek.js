// Issue 彈出視窗（Plane 的 peek）：左邊標題 + 描述 + 留言 + 活動，右邊屬性表。唯讀。
import { el, initials } from '../app/dom.js';
import { icon, typeIcon, typeClass } from '../app/icons.js';
import { issueDetail } from '../api.js';
import { renderMarkdown, attachmentUrl } from '../ui/markdown.js';
import { openModal } from '../ui/modal.js';
import { statusDot } from '../ui/issue-card.js';
import { formatDate } from '../ui/chips.js';

export const PEEK_CSS = `
  .peek h1 { font-size: 20px; font-weight: 600; margin: 0 0 16px; line-height: 1.35; }
  .peek .section { font-size: 12px; font-weight: 600; color: var(--txt-3); margin: 24px 0 8px; display: flex; align-items: center; gap: 6px; }
  .peek .md { color: var(--txt-1); font-size: 13px; }
  .peek .md p { margin: 0 0 8px; white-space: pre-wrap; }
  .peek .md h3, .peek .md h4, .peek .md h5, .peek .md h6 { margin: 12px 0 6px; font-size: 14px; }
  .peek .md pre { background: var(--bg-layer-1); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 8px 10px; overflow: auto; font-size: 12px; }
  .peek .md code { font-family: ui-monospace, Consolas, monospace; font-size: 12px; background: var(--bg-layer-1); padding: 0 4px; border-radius: 3px; }
  .peek .md pre code { background: none; padding: 0; }
  .peek .md a { color: var(--brand); text-decoration: underline; }
  .peek .md ul, .peek .md ol { margin: 0 0 8px; padding-left: 22px; }
  .peek .md blockquote { margin: 0 0 8px; padding: 4px 12px; border-left: 3px solid var(--border-strong); color: var(--txt-2); }
  .peek .md hr { border: 0; border-top: 1px solid var(--border-subtle); margin: 12px 0; }
  .peek .md del { color: var(--txt-3); }
  .peek .md .mention { color: var(--brand); background: var(--brand-soft); border-radius: 3px; padding: 0 3px; font-weight: 500; }
  .peek .md a.img { display: block; margin: 6px 0; text-decoration: none; }
  .peek .md img { display: block; max-width: 100%; max-height: 480px; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); background: var(--bg-layer-1); }
  .peek .muted { color: var(--txt-3); font-style: italic; }
  .peek .comment { display: flex; gap: 10px; padding: 10px 0; border-top: 1px solid var(--border-subtle); }
  .peek .comment .who { font-weight: 500; font-size: 12px; display: flex; gap: 8px; align-items: baseline; }
  .peek .comment .when { color: var(--txt-3); font-weight: 400; }
  .peek .activity { display: flex; gap: 8px; padding: 4px 0; font-size: 12px; color: var(--txt-2); }
  .peek .activity .when { color: var(--txt-3); flex: none; width: 110px; }
  .props { display: grid; grid-template-columns: 90px 1fr; gap: 10px 8px; font-size: 12px; align-items: center; }
  .props .k { color: var(--txt-3); }
  .props .v { display: flex; align-items: center; gap: 6px; min-width: 0; color: var(--txt-1); }
  .props .v .avatar { width: 18px; height: 18px; font-size: 8px; }
  .props .pill { border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 1px 6px; background: var(--bg-surface-1); }
  .open-orig { display: inline-flex; align-items: center; gap: 4px; color: var(--txt-3); white-space: nowrap; }
  .open-orig:hover { color: var(--brand); }
`;

function formatDateTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return `${formatDate(ts)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// WorkPlus 的描述和留言用 `$$attachment ![name](id)$$` 包附件；渲染時把 $$ 標記拿掉，圖片會變成「[圖片：name]」
export function stripAttachmentMarkup(md) {
  return (md ?? '')
    .replace(/\$\$attachment\s*([\s\S]*?)\s*\$\$/g, '$1')
    .replace(/\$\$attachment\s*/g, '');
}

function activityText(a) {
  const d = a.params?.data;
  if (!d) return a.category ?? '';
  if (d.commentId) return '留言';
  if (d.changes) {
    const keys = Object.keys(d.changes);
    return keys.map((k) => `${k} → ${describe(d.latest?.[k])}`).join('，');
  }
  if (d.value) return '建立 issue';
  return a.category ?? '';
}

function describe(v) {
  if (v == null) return '（空）';
  if (typeof v !== 'object') return String(v);
  if (Object.values(v).every((x) => x == null)) return '（空）';
  return v.statusName ?? v.userName ?? v.milestoneName ?? v.typeName ?? v.areaName ?? v.text ?? JSON.stringify(v).slice(0, 40);
}

export async function openIssuePeek(root, { project, issue: brief, onClose }) {
  const content = el('div', 'peek');
  content.append(el('div', 'muted', '載入中…'));
  const side = el('div', 'props');
  const label = [el('span', typeClass(brief.type?.name)), el('span', '', `${project.key}-${brief.serialNumber}`)];
  label[0].append(typeIcon(brief.type?.name, 14));
  const orig = el('a', 'open-orig');
  orig.href = `/key/${encodeURIComponent(project.key)}/issues/${encodeURIComponent(brief.serialNumber)}`;
  orig.title = '在原介面開啟（需先關掉新介面）';
  orig.append(icon('external', 12), el('span', '', '原介面'));
  label.push(orig);
  const modal = openModal(root, { label, content, side, onClose });

  let issue;
  try {
    issue = await issueDetail(brief.id);
  } catch (err) {
    content.replaceChildren(el('div', 'msg error', `載入失敗：${err.message}`));
    return modal;
  }

  // 左側
  content.replaceChildren();
  content.append(el('h1', '', issue.title));
  const desc = el('div', 'md');
  if (issue.descriptionMd?.trim()) desc.append(renderMarkdown(stripAttachmentMarkup(issue.descriptionMd)));
  else desc.append(el('span', 'muted', '沒有描述'));
  content.append(desc);

  const cSec = el('div', 'section');
  cSec.append(icon('comment', 14), el('span', '', `留言 ${issue.comments?.length ?? 0}`));
  content.append(cSec);
  for (const c of issue.comments ?? []) {
    const row = el('div', 'comment');
    const body = el('div');
    const who = el('div', 'who');
    who.append(el('span', '', c.author?.account ?? '?'), el('span', 'when', formatDateTime(c.createdDate)));
    const md = el('div', 'md');
    md.append(renderMarkdown(stripAttachmentMarkup(c.descriptionMd)));
    body.append(who, md);
    row.append(el('span', 'avatar soft', initials(c.author?.account)), body);
    content.append(row);
  }

  const aSec = el('div', 'section');
  aSec.append(icon('list', 14), el('span', '', `活動 ${issue.activities?.length ?? 0}`));
  content.append(aSec);
  for (const a of [...(issue.activities ?? [])].reverse()) {
    const row = el('div', 'activity');
    row.append(el('span', 'when', formatDateTime(a.createTime)), el('span', '', `${a.sender?.account ?? ''} ${activityText(a)}`));
    content.append(row);
  }

  // 右側屬性
  const prop = (k, ...v) => {
    side.append(el('span', 'k', k));
    const cell = el('span', 'v');
    cell.append(...v.filter(Boolean));
    side.append(cell);
  };
  const pill = (t) => el('span', 'pill', t);
  prop('狀態', statusDot(issue.status), el('span', '', issue.status?.name ?? '—'));
  prop('指派', issue.assignee ? el('span', 'avatar soft', initials(issue.assignee.account)) : null, el('span', '', issue.assignee?.account ?? '未指派'));
  prop('優先度', icon('priority', 12), el('span', '', issue.priority ?? '—'));
  prop('類型', pill(issue.type?.name ?? '—'));
  prop('區域', pill(issue.area?.name ?? '—'));
  prop('里程碑', issue.milestone ? pill(issue.milestone.name) : el('span', 'muted', '—'));
  prop('到期日', icon('calendar', 12), el('span', '', issue.dueDate ? formatDate(issue.dueDate) : '—'));
  prop('標籤', ...(issue.labels?.length ? issue.labels.map((l) => pill(l.text)) : [el('span', 'muted', '—')]));
  prop('回報人', el('span', '', issue.reporter?.account ?? '—'));
  prop('建立', el('span', '', formatDateTime(issue.createdDate)));
  prop('更新', el('span', '', formatDateTime(issue.updatedDate)));
  if (issue.doneDate) prop('完成', el('span', '', formatDateTime(issue.doneDate)));
  if (issue.issueRelations?.nodes?.length) {
    prop('關聯', ...issue.issueRelations.nodes.map((r) => pill(`${r.type} ${project.key}-${r.target?.serialNumber ?? '?'}`)));
  }
  if (issue.attachments?.length) {
    prop('附件', ...issue.attachments.map((f) => {
      const a = el('a', 'pill', f.filename);
      a.href = attachmentUrl(f.id, f.filename);
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      return a;
    }));
  }
  return modal;
}
