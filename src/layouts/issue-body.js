// Issue 內容區（原型 TaskModal 版面）：視窗與看板就地展開共用。唯讀；討論用欄位停用並標記。
import { el, initials } from '../app/dom.js';
import { icon } from '../app/icons.js';
import { renderMarkdown, attachmentUrl } from '../ui/markdown.js';
import { statusGlyph, priorityPill, labelChip, dueBadge, memberAvatar } from '../ui/issue-card.js';
import { discussTag, ghostButton } from '../ui/discuss.js';
import { findFigmaUrl } from '../ui/links.js';
import { formatMD, formatYMD, dueStatus } from '../ui/due.js';

export const ISSUE_BODY_CSS = `
  .ibody { display: flex; flex-direction: column; font-size: 13px; }
  .ibody .top { padding: 4px 2px 14px; border-bottom: 1px solid var(--border-subtle); }
  .ibody .row { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; min-width: 0; }
  .ibody .row .spacer { flex: 1; }
  .ibody .actions { display: flex; gap: 6px; align-items: center; flex: none; }
  .ibody .actions .btn.edit { border-color: color-mix(in srgb, var(--brand) 27%, white); background: color-mix(in srgb, var(--brand) 6%, white); color: var(--brand); }
  .ibody h2 { font-size: 19px; font-weight: 700; color: #111; letter-spacing: -.02em; line-height: 1.3; margin: 8px 0 0;
              display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .ibody .who { display: flex; align-items: center; gap: 6px; margin-top: 10px; font-size: 12.5px; color: var(--txt-2); font-weight: 500; }
  .ibody .who .avatar { width: 20px; height: 20px; }
  .ibody .links { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; }
  .ibody .strip { display: flex; align-items: stretch; flex-wrap: wrap; margin-top: 10px; background: var(--bg-layer-1); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 6px 8px; }
  .ibody .strip .stage { display: flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 6px; border: 1px solid transparent; }
  .ibody .strip .stage .k { font-size: 10px; color: var(--txt-3); font-weight: 700; letter-spacing: .04em; }
  .ibody .strip .stage .v { font-size: 11.5px; font-weight: 600; color: var(--txt-1); font-variant-numeric: tabular-nums; }
  .ibody .strip .stage.discuss { border: 1px dashed var(--border-strong); }
  .ibody .strip .stage.discuss .v { color: var(--txt-4); font-weight: 400; }
  .ibody .strip .stage.due.none { background: color-mix(in srgb, var(--brand) 8%, white); }
  .ibody .strip .stage.due.overdue { background: var(--red-soft); border-color: color-mix(in srgb, var(--red) 20%, white); }
  .ibody .strip .stage.due.overdue .k, .ibody .strip .stage.due.overdue .v { color: var(--red); }
  .ibody .strip .stage.due.today, .ibody .strip .stage.due.upcoming { background: var(--amber-soft); border-color: color-mix(in srgb, var(--amber) 20%, white); }
  .ibody .strip .stage.due.today .k, .ibody .strip .stage.due.today .v, .ibody .strip .stage.due.upcoming .k, .ibody .strip .stage.due.upcoming .v { color: var(--amber); }
  .ibody .strip .arrow { display: flex; align-items: center; color: var(--txt-4); font-size: 11px; padding: 0 2px; }
  .ibody .meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 10px; }
  .ibody .meta .prop { font-size: 11px; color: var(--txt-3); background: var(--bg-layer-2); border-radius: var(--radius-sm); padding: 2px 8px; white-space: nowrap; }
  .ibody .meta .prop b { color: var(--txt-2); font-weight: 500; }
  .ibody .meta a.prop { text-decoration: underline; }
  .ibody .desc { margin-top: 12px; }
  .ibody .desc .md.clamp { max-height: 4.8em; overflow: hidden; position: relative; }
  .ibody .desc .md.clamp::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 1.6em; background: linear-gradient(transparent, var(--bg-surface-1)); }
  .ibody .desc .more { font-size: 11.5px; color: var(--brand); font-weight: 600; margin-top: 4px; }
  .ibody .cols { display: grid; grid-template-columns: 1fr 1fr; min-height: 0; }
  .ibody .cols > div { display: flex; flex-direction: column; min-width: 0; }
  .ibody .cols > div:first-child { border-right: 1px solid var(--border-subtle); }
  .ibody .sec { padding: 10px 16px 6px; font-size: 11px; font-weight: 700; color: var(--txt-2); letter-spacing: .04em; display: flex; align-items: center; gap: 6px; border-bottom: 1px solid var(--bg-layer-2); }
  .ibody .sec .n { color: var(--txt-3); font-weight: 400; font-size: 10.5px; }
  .ibody .thead, .ibody .trow { display: grid; grid-template-columns: 56px 1fr 72px; gap: 8px; padding: 5px 16px; align-items: start; }
  .ibody .thead { background: var(--bg-layer-1); font-size: 10px; color: var(--txt-4); font-weight: 700; text-transform: uppercase; letter-spacing: .06em; border-bottom: 1px solid var(--border-subtle); }
  .ibody .trow { border-bottom: 1px solid var(--bg-layer-1); font-size: 11.5px; }
  .ibody .trow:hover { background: var(--bg-layer-1); }
  .ibody .trow .d { color: var(--txt-3); font-weight: 500; white-space: nowrap; padding-top: 1px; }
  .ibody .trow .a { color: var(--txt-3); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ibody .trow .md p { margin: 0 0 4px; }
  .ibody .tlist { flex: 1; overflow: auto; max-height: 200px; }
  .ibody .empty { color: var(--txt-4); font-size: 12px; text-align: center; padding: 20px 0; }
  .ibody .addrow { display: flex; gap: 6px; align-items: center; padding: 8px 16px 12px; border-top: 1px solid var(--border-subtle); }
  .ibody .addrow input, .ibody .addrow .fakebtn { padding: 5px 10px; border: 1px solid var(--border-strong); border-radius: 6px; font: inherit; font-size: 11.5px; background: var(--bg-surface-1); color: var(--txt-1); }
  .ibody .addrow input { flex: 1; min-width: 0; }
  .ibody .addrow .fakebtn { display: inline-flex; align-items: center; gap: 5px; color: var(--txt-4); white-space: nowrap; }
  .ibody .addrow .btn.primary { height: 26px; }
  .ibody .activity-sec { border-top: 1px solid var(--border-subtle); padding: 8px 16px 12px; }
  .ibody .activity-sec .toggle { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: var(--txt-2); }
  .ibody .activity-sec .toggle .chev { transition: transform .15s; color: var(--txt-3); }
  .ibody .activity-sec.open .toggle .chev { transform: rotate(90deg); }
  .ibody .activity-sec .alist { display: none; margin-top: 6px; }
  .ibody .activity-sec.open .alist { display: block; }
  .ibody .activity { display: flex; gap: 8px; padding: 3px 0; font-size: 12px; color: var(--txt-2); }
  .ibody .activity .when { color: var(--txt-3); flex: none; width: 118px; }

  .md { color: var(--txt-1); font-size: 13px; }
  .md p { margin: 0 0 8px; white-space: pre-wrap; }
  .md h3, .md h4, .md h5, .md h6 { margin: 12px 0 6px; font-size: 14px; }
  .md pre { background: var(--bg-layer-1); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 8px 10px; overflow: auto; font-size: 12px; }
  .md code { font-family: ui-monospace, Consolas, monospace; font-size: 12px; background: var(--bg-layer-1); padding: 0 4px; border-radius: 3px; }
  .md pre code { background: none; padding: 0; }
  .md a { color: var(--brand); text-decoration: underline; }
  .md ul, .md ol { margin: 0 0 8px; padding-left: 22px; }
  .md blockquote { margin: 0 0 8px; padding: 4px 12px; border-left: 3px solid var(--border-strong); color: var(--txt-2); }
  .md hr { border: 0; border-top: 1px solid var(--border-subtle); margin: 12px 0; }
  .md del { color: var(--txt-3); }
  .md .mention { color: var(--brand); background: var(--brand-soft); border-radius: 3px; padding: 0 3px; font-weight: 500; }
  .md a.img { display: block; margin: 6px 0; text-decoration: none; }
  .md img { display: block; max-width: 100%; max-height: 480px; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); background: var(--bg-layer-1); }
  .muted { color: var(--txt-3); font-style: italic; }
`;

// WorkPlus 的描述和留言用 `$$attachment ![name](id)$$` 包附件；渲染時把 $$ 標記拿掉
export function stripAttachmentMarkup(md) {
  return (md ?? '')
    .replace(/\$\$attachment\s*([\s\S]*?)\s*\$\$/g, '$1')
    .replace(/\$\$attachment\s*/g, '');
}

function formatDateTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
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

function stage(k, v, cls) {
  const s = el('span', `stage ${cls}`.trim());
  s.append(el('span', 'k', k), el('span', 'v', v));
  if (cls.includes('discuss')) s.title = 'WorkPlus 尚無此欄位，討論中';
  return s;
}

function prop(k, v) {
  const p = el('span', 'prop');
  p.append(el('span', '', `${k} `), el('b', '', v));
  return p;
}

export function issueBody(project, issue, { today = new Date(), onEdit, showActivity = true } = {}) {
  const body = el('div', 'ibody');

  // ── 上半：chip 列、動作、標題、指派、連結、時程條、標籤與屬性、描述
  const top = el('div', 'top');
  const row = el('div', 'row');
  row.append(statusGlyph(issue.status));
  const [first, ...rest] = issue.labels ?? [];
  if (first) row.append(labelChip(first, { primary: true }));
  row.append(priorityPill(issue.priority));
  const due = dueBadge(issue.dueDate, today);
  if (due) row.append(due);
  row.append(el('span', 'spacer'));
  const actions = el('div', 'actions');
  const edit = el('button', 'btn edit', '編輯任務');
  edit.addEventListener('click', () => onEdit?.(issue));
  const orig = el('a', 'btn');
  orig.href = `/key/${encodeURIComponent(project.key)}/issues/${encodeURIComponent(issue.serialNumber)}`;
  orig.title = '在原介面開啟（需先關掉新介面）';
  orig.append(icon('external', 12), el('span', '', '原介面'));
  actions.append(edit, orig);
  row.append(actions);
  top.append(row, el('h2', '', issue.title));
  top.lastChild.title = issue.title;

  const who = el('div', 'who');
  if (issue.assignee) who.append(memberAvatar(issue.assignee.account, 20), el('span', '', issue.assignee.nickname || issue.assignee.account));
  else who.append(el('span', 'avatar soft', '?'), el('span', 'muted', '未指派'));
  top.append(who);

  const links = el('div', 'links');
  links.append(ghostButton('需求'));
  const figma = findFigmaUrl(issue.descriptionMd);
  if (figma) {
    const a = el('a', 'cta');
    a.href = figma;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.title = figma;
    a.append(el('span', '', 'Figma'), icon('external', 12));
    links.append(a);
  } else links.append(ghostButton('Figma'));
  links.append(ghostButton('完稿資料夾'));
  top.append(links);

  const strip = el('div', 'strip');
  strip.append(stage('收到需求', '—', 'discuss'), el('span', 'arrow', '›'), stage('設計初稿', '—', 'discuss'), el('span', 'arrow', '›'), stage('窗口確認', '—', 'discuss'), el('span', 'arrow', '›'));
  const ds = dueStatus(issue.dueDate, today);
  strip.append(stage('截止', issue.dueDate ? formatMD(issue.dueDate) : '—', issue.dueDate ? `due ${ds?.level ?? 'none'}` : ''));
  top.append(strip);

  const meta = el('div', 'meta');
  meta.append(...rest.map((l) => labelChip(l)));
  meta.append(prop('類型', issue.type?.name ?? '—'), prop('區域', issue.area?.name ?? '—'));
  if (issue.milestone) meta.append(prop('里程碑', issue.milestone.name));
  meta.append(prop('回報', issue.reporter?.account ?? '—'), prop('建立', formatDateTime(issue.createdDate)), prop('更新', formatDateTime(issue.updatedDate)));
  if (issue.doneDate) meta.append(prop('完成', formatDateTime(issue.doneDate)));
  for (const r of issue.issueRelations?.nodes ?? []) meta.append(prop(r.type, `${project.key}-${r.target?.serialNumber ?? '?'}`));
  for (const f of issue.attachments ?? []) {
    const a = el('a', 'prop', f.filename);
    a.href = attachmentUrl(f.id, f.filename);
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    meta.append(a);
  }
  top.append(meta);

  const desc = el('div', 'desc');
  if (issue.descriptionMd?.trim()) {
    const md = el('div', 'md clamp');
    md.append(renderMarkdown(stripAttachmentMarkup(issue.descriptionMd)));
    const more = el('button', 'more', '展開');
    more.addEventListener('click', () => {
      const clamped = md.classList.toggle('clamp');
      more.textContent = clamped ? '展開' : '收合';
    });
    desc.append(md, more);
  } else desc.append(el('span', 'muted', '沒有描述'));
  top.append(desc);
  body.append(top);

  // ── 兩欄：進度紀錄（留言）/ 項目紀錄（討論中）
  const cols = el('div', 'cols');
  const left = el('div');
  const comments = [...(issue.comments ?? [])].sort((a, b) => (b.createdDate ?? 0) - (a.createdDate ?? 0));
  const lsec = el('div', 'sec');
  lsec.append(el('span', '', '進度紀錄'), el('span', 'n', comments.length ? `${comments.length} 筆` : ''));
  left.append(lsec);
  if (comments.length) {
    const th = el('div', 'thead');
    th.append(el('span', '', '日期'), el('span', '', '內容'), el('span', '', '作者'));
    left.append(th);
  }
  const tlist = el('div', 'tlist');
  if (!comments.length) tlist.append(el('div', 'empty', '尚無紀錄'));
  for (const c of comments) {
    const tr = el('div', 'trow');
    const md = el('div', 'md');
    md.append(renderMarkdown(stripAttachmentMarkup(c.descriptionMd)));
    tr.append(el('span', 'd', c.createdDate ? formatMD(c.createdDate) : '—'), md, el('span', 'a', c.author?.nickname || c.author?.account || '?'));
    tr.title = c.createdDate ? formatYMD(c.createdDate) : '';
    tlist.append(tr);
  }
  left.append(tlist);
  const ladd = el('div', 'addrow');
  const dateBtn = el('span', 'fakebtn');
  dateBtn.append(icon('calendar', 11), el('span', '', '日期'));
  const noteIn = el('input');
  noteIn.placeholder = '輸入進度描述…（討論中，尚未接上）';
  noteIn.disabled = true;
  const addBtn = el('button', 'btn primary', '新增');
  addBtn.disabled = true;
  addBtn.title = 'WorkPlus 留言寫入尚未接上';
  ladd.append(dateBtn, noteIn, addBtn);
  left.append(ladd);

  const right = el('div');
  const rsec = el('div', 'sec');
  rsec.append(el('span', '', '項目紀錄'), discussTag());
  right.append(rsec, el('div', 'empty', '尚無項目'));
  const radd = el('div', 'addrow');
  const subIn = el('input');
  subIn.placeholder = '輸入項目名稱…（討論中）';
  subIn.disabled = true;
  const subBtn = el('button', 'btn primary', '新增');
  subBtn.disabled = true;
  subBtn.title = 'WorkPlus 尚無此欄位，討論中';
  radd.append(subIn, subBtn);
  right.append(radd);
  cols.append(left, right);
  body.append(cols);

  // ── 活動（預設收合）
  if (showActivity) {
    const sec = el('div', 'activity-sec');
    const toggle = el('button', 'toggle');
    const chev = el('span', 'chev');
    chev.append(icon('expand', 12));
    toggle.append(chev, el('span', '', `活動 ${issue.activities?.length ?? 0}`));
    toggle.addEventListener('click', () => sec.classList.toggle('open'));
    const alist = el('div', 'alist');
    for (const a of [...(issue.activities ?? [])].reverse()) {
      const r = el('div', 'activity');
      r.append(el('span', 'when', formatDateTime(a.createTime)), el('span', '', `${a.sender?.account ?? ''} ${activityText(a)}`));
      alist.append(r);
    }
    sec.append(toggle, alist);
    body.append(sec);
  }
  return body;
}
