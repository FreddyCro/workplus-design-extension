// 描述尾端的「標籤：日期」行（純函式）。WorkPlus 沒有的日期欄位，以人看得懂的一行 markdown 放在描述裡：
//   **開始日期**：2026-11-01
// 原生介面的人可以直接看、直接改。讀寬鬆（粗體 / 底線可有可無、全形半形冒號、- / . 分隔），寫嚴格（粗體 + 全形冒號 + YYYY-MM-DD）。
// 日期一律當地午夜；絕不用 new Date('YYYY-MM-DD')（那會解成 UTC，差一天）。

export const DATE_LABELS = ['開始日期', '收到需求', '提供初稿', '窗口確認'];

function lineRegex(label) {
  const esc = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^\\s*[*_]{0,2}\\s*${esc}\\s*[*_]{0,2}\\s*[：:]\\s*(\\d{4})[-/.](\\d{1,2})[-/.](\\d{1,2})\\s*$`);
}

function validLocal(y, m, d) {
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date.getTime();
}

// 回當地午夜的 timestamp 或 null；多行符合時取最後一行
export function parseDateLine(md, label) {
  if (!md) return null;
  const re = lineRegex(label);
  let found = null;
  for (const line of md.split(/\r?\n/)) {
    const m = line.match(re);
    if (!m) continue;
    found = validLocal(Number(m[1]), Number(m[2]), Number(m[3]));
  }
  return found;
}

export function formatDateLine(label, ts) {
  const d = new Date(ts);
  return `**${label}**：${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 先移除所有符合該標籤的行，再把新行加在最後面（前面空一行）；ts 為 null 時只移除。其他內容一字不動。
export function setDateLine(md, label, ts) {
  const re = lineRegex(label);
  const lines = (md ?? '').split(/\r?\n/).filter((l) => !re.test(l));
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
  const rest = lines.join('\n');
  if (ts == null) return rest;
  return rest ? `${rest}\n\n${formatDateLine(label, ts)}` : formatDateLine(label, ts);
}
