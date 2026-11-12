// 「討論中」與「WorkPlus 欄位」的標記、停用的幽靈按鈕。討論用欄位一律停用、不存資料。
import { el } from '../app/dom.js';

export const DISCUSS_TITLE = 'WorkPlus 尚無此欄位，討論中';

export const DISCUSS_CSS = `
  .tag { display: inline-flex; align-items: center; font-size: 9.5px; font-weight: 700; letter-spacing: .06em; border-radius: 4px; padding: 1px 5px; white-space: nowrap; vertical-align: middle; }
  .tag.discuss { color: var(--amber); background: var(--amber-soft); }
  .tag.wp { color: var(--green); background: var(--green-soft); }
  .ghost { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border: 1px dashed var(--border-strong); border-radius: 7px;
           background: transparent; color: var(--txt-3); font-size: 12px; font-weight: 600; line-height: 1.2; cursor: not-allowed; opacity: 1; }
  .cta { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border: 1px solid var(--border-strong); border-radius: 7px;
         background: var(--bg-layer-2); color: var(--txt-2); font-size: 12px; font-weight: 600; line-height: 1.2; transition: all .15s; }
  .cta:hover { filter: brightness(.97); border-color: var(--txt-3); }
  .discuss-field { border: 1px dashed var(--border-strong) !important; color: var(--txt-4) !important; background: transparent !important; }
`;

export function discussTag(text = '討論中') {
  const t = el('span', 'tag discuss', text);
  t.title = DISCUSS_TITLE;
  return t;
}

export function wpTag() {
  const t = el('span', 'tag wp', 'WorkPlus 欄位');
  t.title = 'WorkPlus 已有這個欄位';
  return t;
}

export function ghostButton(label) {
  const b = el('button', 'ghost', label);
  b.disabled = true;
  b.title = DISCUSS_TITLE;
  b.append(discussTag());
  return b;
}
