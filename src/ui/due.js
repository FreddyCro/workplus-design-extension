// 到期日的狀態與顯示文字（純函式）。原型的四級：已過期 / 今日 / 3 天內 / 其他。
import { startOfDay } from '../timeline/scale.js';

const DAY = 86400000;

export function formatMD(ts) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function formatYMD(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

// null | { level: 'overdue' | 'today' | 'upcoming', days }；days = 到期日 − 今天（當地午夜算）
export function dueStatus(ts, today = new Date()) {
  if (!ts) return null;
  const days = Math.round((startOfDay(new Date(ts)).getTime() - startOfDay(today).getTime()) / DAY);
  if (days < 0) return { level: 'overdue', days };
  if (days === 0) return { level: 'today', days };
  if (days <= 3) return { level: 'upcoming', days };
  return null;
}

// null | { text, level: 'overdue' | 'today' | 'upcoming' | 'none' }
export function dueText(ts, today = new Date()) {
  if (!ts) return null;
  const s = dueStatus(ts, today);
  const md = formatMD(ts);
  if (!s) return { text: md, level: 'none' };
  if (s.level === 'overdue') return { text: `已過期 ${md}`, level: 'overdue' };
  if (s.level === 'today') return { text: '今日到期', level: 'today' };
  return { text: `${md} 將到期 (${s.days} 天)`, level: 'upcoming' };
}
