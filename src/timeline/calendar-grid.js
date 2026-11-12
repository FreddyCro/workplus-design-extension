// 月曆格：某年某月 → 以週一開頭、補滿整週的 6×7（或 5×7）格。純函式。
import { addDays, startOfDay, sameDay } from './scale.js';

export function dayKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// month 從 0 起算
export function monthGrid(year, month, { today = new Date() } = {}) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // 週一 = 0
  const start = addDays(first, -offset);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7;
  const t = startOfDay(today);
  const weeks = [];
  for (let i = 0; i < totalCells; i += 7) {
    const week = [];
    for (let j = 0; j < 7; j++) {
      const date = addDays(start, i + j);
      week.push({ date, key: dayKey(date), inMonth: date.getMonth() === month, today: sameDay(date, t), weekend: j >= 5 });
    }
    weeks.push(week);
  }
  return { year, month, title: `${year} 年 ${month + 1} 月`, weeks };
}
