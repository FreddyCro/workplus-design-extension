// 卡片屬性 chip 的文字邏輯（純函式）。DOM 在 issue-card.js。
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const PRIORITY_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

export function formatDate(ts) {
  const d = new Date(ts);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function dueDateLabel(ts, today = new Date()) {
  if (!ts) return null;
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return { text: formatDate(ts), overdue: ts < t };
}

export function labelsSummary(labels) {
  if (!labels?.length) return null;
  if (labels.length <= 2) return { items: labels.map(({ text, color }) => ({ text, color })), more: null };
  return { items: [], more: `${labels.length} Labels` };
}
