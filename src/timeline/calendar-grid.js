// 月曆格：某年某月 → 補滿整週的 n×7 格。純函式。
// weekStart：1 = 週一開頭（預設）、0 = 週日開頭；rows：給 6 時補滿 6 列（原型固定 42 格）。
import { addDays, startOfDay, sameDay } from './scale.js';

export function dayKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// month 從 0 起算
export function monthGrid(year, month, { today = new Date(), weekStart = 1, rows = null } = {}) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() - weekStart + 7) % 7;
  const start = addDays(first, -offset);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let totalCells = Math.ceil((offset + daysInMonth) / 7) * 7;
  if (rows) totalCells = Math.max(totalCells, rows * 7);
  const t = startOfDay(today);
  const weeks = [];
  for (let i = 0; i < totalCells; i += 7) {
    const week = [];
    for (let j = 0; j < 7; j++) {
      const date = addDays(start, i + j);
      const dow = date.getDay();
      week.push({ date, key: dayKey(date), inMonth: date.getMonth() === month, today: sameDay(date, t), weekend: dow === 0 || dow === 6 });
    }
    weeks.push(week);
  }
  return { year, month, title: `${year} 年 ${month + 1} 月`, weeks };
}
