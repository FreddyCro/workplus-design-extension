// Issue 內容區（原型 TaskModal 版面）：視窗與看板就地展開共用。
// 欄位讀自描述尾端（見 ui/issue-fields.js），描述沒有的退回 WorkPlus 原生欄位。
// 有 edit 時就地編輯：每次修改由 edit.save 整筆存回（見 layouts/issue-save.js）。
import { el } from '../app/dom.js';
import { icon } from '../app/icons.js';
import { renderMarkdown, attachmentUrl } from '../ui/markdown.js';
import { statusGlyph, labelChip, memberAvatar } from '../ui/issue-card.js';
import { findFigmaUrl } from '../ui/links.js';
import { formatMD, formatYMD, dueStatus } from '../ui/due.js';
import { fieldsOf, parseYMD, splitBody, joinBody, PROJECT_TYPES, COUNTRIES, PRIORITY_TEXT, ITEM_STATUSES } from '../ui/issue-fields.js';
import { labelColor, priorityStyle } from '../ui/palette.js';

export const ISSUE_BODY_CSS = `
  .ibody { display: flex; flex-direction: column; font-size: 13px; }
  .ibody .top { padding: 4px 2px 14px; border-bottom: 1px solid var(--border-subtle); }
  .ibody .row { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; min-width: 0; }
  .ibody .spacer { flex: 1; }
  .ibody .actions { display: flex; gap: 6px; align-items: center; flex: none; }
  .ibody .actions .btn.trash { color: var(--txt-3); }
  .ibody .actions .btn.trash:hover { color: var(--red); border-color: color-mix(in srgb, var(--red) 40%, white); }
  .ibody .actions .btn.trash.armed { color: #fff; background: var(--red); border-color: var(--red); }
  .ibody .actions .btn.edit { border-color: color-mix(in srgb, var(--brand) 27%, white); background: color-mix(in srgb, var(--brand) 6%, white); color: var(--brand); }
  .ibody h2 { font-size: 19px; font-weight: 700; color: #111; letter-spacing: -.02em; line-height: 1.3; margin: 6px 0 0;
              display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .ibody .links { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
  .ibody .lbtn { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border: 1px solid var(--border-strong); border-radius: 6px;
                 background: var(--bg-layer-2); color: var(--txt-2); font: inherit; font-size: 11.5px; font-weight: 600; line-height: 1.3; cursor: pointer; text-decoration: none; }
  .ibody .lbtn:hover { border-color: var(--txt-3); }
  .ibody .lbtn:disabled { color: var(--txt-4); background: transparent; border-style: dashed; cursor: not-allowed; }
  .ibody .who { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 12px; font-size: 12.5px; color: var(--txt-2); font-weight: 500; }
  .ibody .who .avatar { width: 20px; height: 20px; }
  .ibody .who .duelbl { color: var(--txt-3); margin: 0 4px; }
  .ibody .who .duelbl b { color: var(--txt-1); font-weight: 700; }
  .ibody .who .duelbl.overdue, .ibody .who .duelbl.overdue b { color: var(--red); }
  .ibody .who .duelbl.today b, .ibody .who .duelbl.upcoming b { color: var(--amber); }
  .ibody .strip { display: flex; align-items: stretch; flex-wrap: wrap; margin-top: 10px; background: var(--bg-layer-1); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 6px 8px; }
  .ibody .strip .stage { display: flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 6px; border: 1px solid transparent; }
  .ibody .strip .stage .k { font-size: 10px; color: var(--txt-3); font-weight: 700; letter-spacing: .04em; }
  .ibody .strip .stage .v { font-size: 11.5px; font-weight: 600; color: var(--txt-1); font-variant-numeric: tabular-nums; }
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
  .ibody .desc:empty { display: none; }
  .ibody .desc .md.clamp { max-height: 4.8em; overflow: hidden; position: relative; }
  .ibody .desc .md.clamp::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 1.6em; background: linear-gradient(transparent, var(--bg-surface-1)); }
  .ibody .desc .more { font-size: 11.5px; color: var(--brand); font-weight: 600; margin-top: 4px; }
  .ibody .cols { display: grid; grid-template-columns: 1fr 1fr; min-height: 0; }
  .ibody .cols > div { display: flex; flex-direction: column; min-width: 0; }
  .ibody .cols > div:first-child { border-right: 1px solid var(--border-subtle); }
  .ibody .sec { padding: 12px 16px 10px; font-size: 12.5px; font-weight: 700; color: var(--txt-1); display: flex; align-items: center; gap: 8px; border-bottom: 1px solid var(--border-subtle); }
  .ibody .sec .n { color: var(--txt-3); font-weight: 400; font-size: 11.5px; }
  .ibody .sec .pbar { width: 60px; height: 4px; border-radius: 2px; background: var(--bg-layer-2); overflow: hidden; }
  .ibody .sec .pbar .fill { display: block; height: 100%; background: var(--green); }
  .ibody .sec .pct { color: var(--green); font-size: 11.5px; }
  .ibody .tlist, .ibody .ilist { flex: 1; overflow: auto; max-height: 240px; padding: 10px 16px; }
  .ibody .empty { color: var(--txt-4); font-size: 12px; text-align: center; padding: 20px 0; }
  .ibody .tl-item { position: relative; padding: 0 0 10px 18px; }
  .ibody .tl-item::before { content: ''; position: absolute; left: 3px; top: 12px; bottom: -2px; width: 1px; background: var(--border-subtle); }
  .ibody .tl-item:last-child::before { display: none; }
  .ibody .tl-dot { position: absolute; left: 0; top: 5px; width: 7px; height: 7px; border-radius: 50%; background: var(--brand); }
  .ibody .tl-date { font-size: 11px; color: var(--txt-3); font-weight: 600; margin-bottom: 4px; }
  .ibody .tl-text { background: var(--bg-layer-1); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 7px 10px; }
  .ibody .tl-text p { margin: 0; }
  .ibody .item { display: flex; align-items: center; gap: 10px; padding: 9px 12px; margin-bottom: 8px; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); background: var(--bg-layer-1); }
  .ibody .item.done { background: color-mix(in srgb, var(--green) 6%, white); border-color: color-mix(in srgb, var(--green) 30%, white); }
  .ibody .item .box { width: 16px; height: 16px; flex: none; border: 1.5px solid var(--border-strong); border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #fff; }
  .ibody .item.done .box { background: var(--green); border-color: var(--green); }
  .ibody .item .name { flex: 1; min-width: 0; font-size: 12.5px; color: var(--txt-1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ibody .item.done .name { color: var(--txt-3); }
  .ibody .item .ist { flex: none; font-size: 11px; font-weight: 600; border-radius: 5px; padding: 1px 8px; border: 1px solid currentColor; }
  .ibody .item .ist.todo { color: var(--txt-3); }
  .ibody .item .ist.doing { color: var(--brand); }
  .ibody .item .ist.done { color: var(--green); }
  .ibody .addrow, .ibody .addcol { display: flex; gap: 6px; padding: 10px 16px 12px; border-top: 1px solid var(--border-subtle); }
  .ibody .addcol { flex-direction: column; }
  .ibody .addrow { align-items: center; }
  .ibody .addrow input, .ibody .addcol textarea, .ibody .fakebtn { padding: 6px 10px; border: 1px solid var(--border-strong); border-radius: 6px; font: inherit; font-size: 12px; background: var(--bg-surface-1); color: var(--txt-1); }
  .ibody .addrow input { flex: 1; min-width: 0; }
  .ibody .addcol textarea { resize: none; height: 48px; }
  .ibody .fakebtn { display: flex; align-items: center; gap: 6px; color: var(--txt-4); }
  .ibody .addrow .btn.primary { height: 28px; }
  .ibody .addcol .btn.primary { height: 30px; justify-content: center; }
  .ibody .activity-sec { border-top: 1px solid var(--border-subtle); padding: 8px 16px 12px; }
  .ibody .activity-sec .toggle { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: var(--txt-2); }
  .ibody .activity-sec .toggle .chev { transition: transform .15s; color: var(--txt-3); }
  .ibody .activity-sec.open .toggle .chev { transform: rotate(90deg); }
  .ibody .activity-sec .alist { display: none; margin-top: 6px; }
  .ibody .activity-sec.open .alist { display: block; }
  .ibody .activity { display: flex; gap: 8px; padding: 3px 0; font-size: 12px; color: var(--txt-2); }
  .ibody .activity .when { color: var(--txt-3); flex: none; width: 118px; }

  /* 就地編輯 */
  .ibody.saving { opacity: .6; pointer-events: none; }
  .ibody .savestate { font-size: 11.5px; color: var(--txt-3); }
  .ibody .savestate.error { color: var(--red); max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ibody .editable { cursor: text; border-radius: 4px; }
  .ibody h2.editable:hover { background: var(--bg-layer-1); }
  .ibody .inline-input { font: inherit; color: var(--txt-1); border: 1px solid var(--border-focus); border-radius: 6px; background: var(--bg-surface-1); outline: none; padding: 4px 8px; }
  .ibody .inline-input.title { display: block; width: 100%; margin-top: 6px; font-size: 19px; font-weight: 700; letter-spacing: -.02em; }
  .ibody .inline-input.path { width: 320px; font-size: 12px; }
  .ibody .inline-input.tag { width: 140px; font-size: 11.5px; padding: 1px 6px; }
  .ibody .isel { font: inherit; font-size: 11.5px; font-weight: 600; border: 1px solid transparent; border-radius: var(--radius-sm); padding: 1px 4px; background: var(--bg-layer-2); color: var(--txt-2); cursor: pointer; }
  .ibody .isel:hover:not(:disabled) { border-color: var(--border-strong); }
  .ibody .isel:disabled { cursor: default; appearance: none; }
  .ibody .isel.assignee { font-size: 12.5px; font-weight: 500; background: transparent; color: var(--txt-2); }
  .ibody .idate { font: inherit; font-size: 11.5px; font-weight: 600; color: var(--txt-1); border: 1px solid transparent; border-radius: 4px; background: transparent; padding: 0 2px; font-variant-numeric: tabular-nums; }
  .ibody .idate:hover { border-color: var(--border-strong); }
  .ibody .duelbl { display: inline-flex; align-items: center; gap: 4px; }
  .ibody .duelbl.overdue .idate { color: var(--red); }
  .ibody .duelbl.today .idate, .ibody .duelbl.upcoming .idate { color: var(--amber); }
  .ibody .strip .stage .idate.v { width: 112px; }
  .ibody .lwrap { display: inline-flex; align-items: center; gap: 2px; }
  .ibody .pen { border: 0; background: transparent; color: var(--txt-4); font-size: 12px; padding: 2px 4px; cursor: pointer; border-radius: 4px; }
  .ibody .pen:hover { color: var(--brand); background: var(--bg-layer-1); }
  .ibody .chip.label .x { border: 0; background: transparent; color: var(--txt-4); padding: 0 0 0 2px; cursor: pointer; font-size: 12px; line-height: 1; }
  .ibody .chip.label .x:hover { color: var(--red); }
  .ibody .addtag { font-size: 11px; color: var(--txt-4); border: 1px dashed var(--border-strong); border-radius: var(--radius-sm); padding: 0 7px; cursor: pointer; }
  .ibody .addtag:hover { color: var(--brand); border-color: var(--brand); }
  .ibody .desc .body-edit { width: 100%; min-height: 140px; resize: vertical; font: inherit; font-size: 12.5px; line-height: 1.6; border: 1px solid var(--border-focus); border-radius: 6px; padding: 8px 10px; outline: none; }
  .ibody .desc .body-actions { display: flex; justify-content: flex-end; gap: 6px; margin-top: 6px; }
  .ibody .desc .more + .more { margin-left: 10px; }
  .ibody .del { border: 0; background: transparent; color: var(--txt-4); font-size: 14px; line-height: 1; cursor: pointer; padding: 0 2px; opacity: 0; transition: opacity .1s; }
  .ibody .tl-text, .ibody .item { position: relative; }
  .ibody .tl-text .del { position: absolute; top: 4px; right: 6px; }
  .ibody .tl-item:hover .del, .ibody .item:hover .del { opacity: 1; }
  .ibody .del:hover { color: var(--red); }
  .ibody .item .box { background: var(--bg-surface-1); cursor: pointer; padding: 0; }
  .ibody .item .box:disabled { cursor: default; }
  .ibody .item .ist { font: inherit; font-size: 11px; font-weight: 600; background: transparent; cursor: pointer; }
  .ibody .item .ist:disabled { cursor: default; appearance: none; }
  .ibody .addcol input.idate { border: 1px solid var(--border-strong); border-radius: 6px; padding: 6px 10px; font-size: 12px; font-weight: 400; }

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

function stage(k, ts, cls = '') {
  const s = el('span', `stage ${cls}`.trim());
  s.append(el('span', 'k', k), el('span', 'v', ts ? formatMD(ts) : '—'));
  if (ts) s.title = formatYMD(ts);
  return s;
}

function prop(k, v) {
  const p = el('span', 'prop');
  p.append(el('span', '', `${k} `), el('b', '', v));
  return p;
}

// 專案路徑：按了複製；需求 / Figma：開新分頁。沒有值時停用。
function linkButton(text, value, { copy = false } = {}) {
  if (!value) {
    const b = el('button', 'lbtn', text);
    b.disabled = true;
    b.title = `沒有${text}路徑`;
    return b;
  }
  if (copy) {
    const b = el('button', 'lbtn');
    const t = el('span', '', text);
    b.append(t, icon('copy', 11));
    b.title = `複製：${value}`;
    b.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(value);
        t.textContent = '已複製';
      } catch {
        t.textContent = '複製失敗';
      }
      setTimeout(() => (t.textContent = text), 1200);
    });
    return b;
  }
  const a = el('a', 'lbtn');
  a.href = /^https?:\/\//i.test(value) ? value : '#';
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.title = value;
  a.append(el('span', '', text), icon('external', 11));
  return a;
}

const ITEM_STATUS_CLASS = { 待處理: 'todo', 進行中: 'doing', 已完成: 'done' };

const isoDate = (ts) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function options(select, opts, value) {
  for (const [v, text] of opts) {
    const o = el('option', '', text);
    o.value = v;
    select.append(o);
  }
  select.value = value ?? '';
  return select;
}

// 描述裡的值不在選項中時（舊資料、打錯字）也要顯示出來
const withValue = (opts, value) => (value && !opts.some(([o]) => o === value) ? [...opts, [value, value]] : opts);

// 點一下把 display 換成輸入框；Enter（多行時 Ctrl+Enter）或離開時存，Esc 取消
function inlineText(display, value, onCommit, { placeholder = '', multiline = false, cls = '' } = {}) {
  display.classList.add('editable');
  display.title = '點一下編輯';
  display.addEventListener('click', (e) => {
    e.stopPropagation();
    const input = el(multiline ? 'textarea' : 'input', `inline-input ${cls}`.trim());
    input.value = value ?? '';
    input.placeholder = placeholder;
    display.replaceWith(input);
    input.focus();
    let done = false;
    const finish = (save) => {
      if (done) return;
      done = true;
      const v = input.value.trim();
      input.replaceWith(display);
      if (save && v !== (value ?? '')) onCommit(v || null);
    };
    input.addEventListener('keydown', (ev) => {
      ev.stopPropagation();
      if (ev.key === 'Escape') finish(false);
      else if (ev.key === 'Enter' && !ev.isComposing && (!multiline || ev.ctrlKey || ev.metaKey)) {
        ev.preventDefault();
        finish(true);
      }
    });
    input.addEventListener('blur', () => finish(true));
  });
  return display;
}

function dateInput(ts, onCommit, cls = '') {
  const i = el('input', `idate ${cls}`.trim());
  i.type = 'date';
  i.value = ts ? isoDate(ts) : '';
  i.addEventListener('change', () => onCommit(i.value ? parseYMD(i.value) : null));
  i.addEventListener('keydown', (e) => e.stopPropagation());
  return i;
}

// 連結按鈕旁的小鉛筆：改路徑
function linkWithEdit(text, value, opts, onCommit) {
  const wrap = el('span', 'lwrap');
  const pen = el('button', 'pen', '✎');
  pen.title = `編輯${text}路徑`;
  wrap.append(linkButton(text, value, opts), pen);
  inlineText(pen, value, onCommit, { placeholder: `輸入${text}路徑…`, cls: 'path' });
  pen.title = `編輯${text}路徑`;
  return wrap;
}

// 刪除按鈕：按一次變成「確定刪除？」，3 秒內再按一次才刪除；移開或逾時就復原
function deleteButton(issue, remove) {
  const b = el('button', 'btn trash');
  const idle = () => {
    b.classList.remove('armed');
    b.replaceChildren(icon('trash', 12), el('span', '', '刪除'));
    b.title = '刪除這個 issue';
  };
  idle();
  let timer = null;
  b.addEventListener('click', async () => {
    if (!b.classList.contains('armed')) {
      b.classList.add('armed');
      b.replaceChildren(el('span', '', '確定刪除？'));
      b.title = `再按一次刪除 #${issue.serialNumber}，無法復原`;
      timer = setTimeout(idle, 3000);
      return;
    }
    clearTimeout(timer);
    b.disabled = true;
    b.replaceChildren(el('span', '', '刪除中…'));
    try {
      await remove();
    } catch (err) {
      console.error('[wp-skin save]', '刪除失敗', err);
      b.disabled = false;
      idle();
      b.replaceChildren(el('span', '', '刪除失敗'));
      b.title = err.message;
      timer = setTimeout(idle, 3000);
    }
  });
  b.addEventListener('mouseleave', () => { if (b.classList.contains('armed') && !b.disabled) { clearTimeout(timer); timer = setTimeout(idle, 800); } });
  return b;
}

// edit：{ members, save(apply), remove() }。沒有 edit 時唯讀。
export function issueBody(project, issue, { today = new Date(), edit = null, showActivity = true } = {}) {
  const f = fieldsOf(issue);
  const can = !!edit?.save;
  const body = el('div', 'ibody');
  const saveState = el('span', 'savestate');
  // 每次修改都整筆存檔；成功後呼叫端會用最新資料重畫整個內容區
  console.log('[wp-skin save]', `${project.key}-${issue.serialNumber}`, can ? '可編輯' : '唯讀（沒有 edit）');
  const commit = (apply) => {
    if (!can) return;
    console.log('[wp-skin save]', '使用者修改，開始存檔');
    body.classList.add('saving');
    saveState.className = 'savestate';
    saveState.textContent = '儲存中…';
    edit.save(apply).catch((err) => {
      console.error('[wp-skin save]', '失敗', err);
      body.classList.remove('saving');
      saveState.className = 'savestate error';
      saveState.textContent = `儲存失敗：${err.message}`;
      saveState.title = err.message;
    });
  };
  const setValue = (key) => (v) => commit((m) => { m.values[key] = v; });
  const sel = (cls, opts, value, key) => {
    const s = options(el('select', `isel ${cls}`), opts, value);
    s.disabled = !can;
    s.addEventListener('change', () => setValue(key)(s.value || null));
    return s;
  };

  // ── 上半：狀態列與動作、標題、連結、負責人列、時程條、屬性、描述內文
  const top = el('div', 'top');
  const row = el('div', 'row');
  row.append(statusGlyph(issue.status));
  const typeSel = sel('ptype', withValue([['', '專案類型'], ...PROJECT_TYPES.map((t) => [t, t])], f.projectType), f.projectType, 'projectType');
  if (f.projectType) {
    const c = labelColor({ text: f.projectType });
    typeSel.style.color = c;
    typeSel.style.background = `color-mix(in srgb, ${c} 12%, white)`;
  }
  row.append(typeSel, sel('country', withValue([['', '國家'], ...COUNTRIES.map((c) => [c, c])], f.country), f.country, 'country'));
  row.append(saveState, el('span', 'spacer'));
  const actions = el('div', 'actions');
  if (can && edit.remove) actions.append(deleteButton(issue, edit.remove));
  else {
    const orig = el('a', 'btn');
    orig.href = `/key/${encodeURIComponent(project.key)}/issues/${encodeURIComponent(issue.serialNumber)}`;
    orig.title = '在原介面開啟（需先關掉新介面）';
    orig.append(icon('external', 12), el('span', '', '原介面'));
    actions.append(orig);
  }
  row.append(actions);
  const title = f.title ?? issue.title;
  const h2 = el('h2', '', title);
  if (can) inlineText(h2, title, (v) => v && setValue('title')(v), { cls: 'title' });
  else h2.title = title;
  top.append(row, h2);

  const links = el('div', 'links');
  const figma = f.figmaPath ?? findFigmaUrl(f.body);
  if (can) {
    links.append(
      linkWithEdit('專案', f.projectPath, { copy: true }, setValue('projectPath')),
      linkWithEdit('需求', f.requirementPath, {}, setValue('requirementPath')),
      linkWithEdit('Figma', figma, {}, setValue('figmaPath'))
    );
  } else {
    links.append(linkButton('專案', f.projectPath, { copy: true }), linkButton('需求', f.requirementPath), linkButton('Figma', figma));
  }
  top.append(links);

  const who = el('div', 'who');
  if (f.assignee) who.append(memberAvatar(f.assignee, 20));
  else who.append(el('span', 'avatar soft', '?'));
  const members = edit?.members ?? [];
  who.append(sel('assignee', withValue([['', '未指派'], ...members.map((m) => [m, m])], f.assignee), f.assignee, 'assignee'));
  const ds = f.dueDate ? dueStatus(f.dueDate, today) : null;
  const due = el('span', `duelbl ${ds?.level ?? ''}`.trim());
  due.append(el('span', '', '截止'));
  if (can) due.append(dateInput(f.dueDate, setValue('dueDate')));
  else due.append(el('b', '', f.dueDate ? formatMD(f.dueDate) : '—'));
  who.append(due);
  const pri = priorityStyle(f.priority);
  const priSel = sel('pri', withValue(Object.values(PRIORITY_TEXT).filter((t) => t !== '緊急' || f.priority === 'CRITICAL').map((t) => [t, t]), PRIORITY_TEXT[f.priority]),
    PRIORITY_TEXT[f.priority] ?? '', 'priority');
  priSel.style.color = pri.color;
  priSel.style.background = pri.bg;
  who.append(priSel);
  for (const t of f.tags) {
    const chip = labelChip({ text: t });
    if (can) {
      const x = el('button', 'x', '×');
      x.title = `移除標籤 ${t}`;
      x.addEventListener('click', () => commit((m) => { m.values.tags = m.values.tags.filter((s) => s !== t); }));
      chip.append(x);
    }
    who.append(chip);
  }
  if (can) {
    const addTag = el('span', 'addtag', '+ 標籤');
    inlineText(addTag, '', (v) => {
      const add = (v ?? '').split(/[、,，]/).map((s) => s.trim()).filter(Boolean);
      if (add.length) commit((m) => { m.values.tags = [...new Set([...m.values.tags, ...add])]; });
    }, { placeholder: '輸入標籤，、分隔', cls: 'tag' });
    addTag.title = '新增標籤';
    who.append(addTag);
  }
  top.append(who);

  const strip = el('div', 'strip');
  const stages = [['開始', 'startDate'], ['收到需求', 'receivedDate'], ['提供初稿', 'draftDate'], ['窗口確認', 'confirmDate'], ['截止', 'dueDate']];
  stages.forEach(([k, key], idx) => {
    const cls = key === 'dueDate' && f.dueDate ? `due ${ds?.level ?? 'none'}` : '';
    if (!can) strip.append(stage(k, f[key], cls));
    else {
      const s = el('span', `stage ${cls}`.trim());
      s.append(el('span', 'k', k), dateInput(f[key], setValue(key), 'v'));
      strip.append(s);
    }
    if (idx < stages.length - 1) strip.append(el('span', 'arrow', '›'));
  });
  top.append(strip);

  const meta = el('div', 'meta');
  meta.append(prop('類型', issue.type?.name ?? '—'), prop('區域', issue.area?.name ?? '—'));
  if (issue.milestone) meta.append(prop('里程碑', issue.milestone.name));
  meta.append(prop('回報', issue.reporter?.account ?? '—'), prop('建立', formatDateTime(issue.createdDate)), prop('更新', formatDateTime(issue.updatedDate)));
  if (issue.doneDate) meta.append(prop('完成', formatDateTime(issue.doneDate)));
  for (const r of issue.issueRelations?.nodes ?? []) meta.append(prop(r.type, String(r.target?.serialNumber ?? '?')));
  for (const file of issue.attachments ?? []) {
    const a = el('a', 'prop', file.filename);
    a.href = attachmentUrl(file.id, file.filename);
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    meta.append(a);
  }
  top.append(meta);

  // 描述只顯示欄位以外的內文；編輯時是整段 textarea
  const desc = el('div', 'desc');
  const showDesc = () => {
    desc.replaceChildren();
    if (f.content) {
      const md = el('div', 'md clamp');
      md.append(renderMarkdown(stripAttachmentMarkup(f.content)));
      const more = el('button', 'more', '展開');
      more.addEventListener('click', () => {
        const clamped = md.classList.toggle('clamp');
        more.textContent = clamped ? '展開' : '收合';
      });
      desc.append(md, more);
    }
    if (can) {
      const editBtn = el('button', 'more', f.content ? '編輯內文' : '新增內文');
      editBtn.addEventListener('click', () => {
        const ta = el('textarea', 'body-edit');
        ta.value = f.content;
        ta.addEventListener('keydown', (e) => e.stopPropagation());
        const ok = el('button', 'btn primary', '儲存');
        const cancel = el('button', 'btn', '取消');
        // 隱藏的欄位相關舊資訊（匯入尾段、舊連結）要接回去，不能因為編輯內文就被刪掉
        ok.addEventListener('click', () => commit((m) => { m.body = joinBody(ta.value, splitBody(m.body).hidden); }));
        cancel.addEventListener('click', showDesc);
        const bar = el('div', 'body-actions');
        bar.append(cancel, ok);
        desc.replaceChildren(ta, bar);
        ta.focus();
      });
      desc.append(editBtn);
    }
  };
  showDesc();
  top.append(desc);
  body.append(top);

  // ── 兩欄：時程（描述裡的日期清單）/ 項目紀錄（描述裡的 checkbox 清單）
  const cols = el('div', 'cols');
  const left = el('div');
  const lsec = el('div', 'sec');
  lsec.append(el('span', '', '時程'), el('span', 'n', f.schedule.length ? `${f.schedule.length} 筆` : ''));
  left.append(lsec);
  const tl = el('div', 'tlist');
  if (!f.schedule.length) tl.append(el('div', 'empty', '尚無紀錄'));
  f.schedule.forEach((s, idx) => {
    const item = el('div', 'tl-item');
    const text = el('div', 'tl-text md');
    text.append(renderMarkdown(s.text));
    if (can) {
      const x = el('button', 'del', '×');
      x.title = '刪除這筆';
      x.addEventListener('click', () => commit((m) => { m.schedule.splice(idx, 1); }));
      text.append(x);
    }
    item.append(el('span', 'tl-dot'), el('div', 'tl-date', formatYMD(s.date)), text);
    tl.append(item);
  });
  left.append(tl);
  if (can) {
    const ladd = el('div', 'addcol');
    const dIn = dateInput(null, () => {});
    dIn.value = isoDate(today);
    const noteIn = el('textarea');
    noteIn.placeholder = '描述本次進度內容…';
    noteIn.addEventListener('keydown', (e) => e.stopPropagation());
    const add = el('button', 'btn primary', '新增紀錄');
    add.addEventListener('click', () => {
      const date = parseYMD(dIn.value);
      const text = noteIn.value.replace(/\s+/g, ' ').trim();
      if (date == null || !text) return;
      commit((m) => { m.schedule.push({ date, text }); });
    });
    ladd.append(dIn, noteIn, add);
    left.append(ladd);
  }

  const right = el('div');
  const rsec = el('div', 'sec');
  const { done, all } = f.progress;
  rsec.append(el('span', '', '項目紀錄'), el('span', 'n', all ? `${done}/${all} 完成` : ''));
  if (all) {
    const pct = Math.round((done / all) * 100);
    const bar = el('span', 'pbar');
    const fill = el('span', 'fill');
    fill.style.width = `${pct}%`;
    bar.append(fill);
    rsec.append(el('span', 'spacer'), bar, el('span', 'pct', `${pct}%`));
  }
  right.append(rsec);
  const ilist = el('div', 'ilist');
  if (!all) ilist.append(el('div', 'empty', '尚無項目'));
  f.items.forEach((it, idx) => {
    const r = el('div', `item${it.done ? ' done' : ''}`);
    const box = el('button', 'box');
    if (it.done) box.append(icon('check', 11));
    box.disabled = !can;
    box.title = it.done ? '標為未完成' : '標為已完成';
    box.addEventListener('click', () => commit((m) => {
      const x = m.items[idx];
      x.done = !x.done;
      x.status = x.done ? '已完成' : '待處理';
    }));
    const st = options(el('select', `ist ${ITEM_STATUS_CLASS[it.status]}`), ITEM_STATUSES.map((s) => [s, s]), it.status);
    st.disabled = !can;
    st.addEventListener('change', () => commit((m) => {
      m.items[idx].status = st.value;
      m.items[idx].done = st.value === '已完成';
    }));
    r.append(box, el('span', 'name', it.name), st);
    if (can) {
      const x = el('button', 'del', '×');
      x.title = '刪除這個項目';
      x.addEventListener('click', () => commit((m) => { m.items.splice(idx, 1); }));
      r.append(x);
    }
    r.title = it.name;
    ilist.append(r);
  });
  right.append(ilist);
  if (can) {
    const radd = el('div', 'addrow');
    const subIn = el('input');
    subIn.placeholder = '輸入項目名稱…（Enter 新增）';
    const add = el('button', 'btn primary', '新增');
    const push = () => {
      const name = subIn.value.trim();
      if (name) commit((m) => { m.items.push({ name, done: false, status: '待處理' }); });
    };
    subIn.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter' && !e.isComposing) push();
    });
    add.addEventListener('click', push);
    radd.append(subIn, add);
    right.append(radd);
  }
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
