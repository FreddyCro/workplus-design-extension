// 拖拉 / 右端拉伸 → 新的終點日期。純函式，DOM 事件在 chart.js 處理。
import { addDays, startOfDay } from './scale.js';

// mode: 'move' | 'resize-right'；dx 是滑鼠位移（px）
// 回傳 { end: Date, changed: boolean, outOfRange: boolean }，列沒有終點時回 null。
// row.end 可能帶時分秒（例如 doneDate），一律先正規化到當地 00:00 再比較，點一下才不會被當成有變。
export function dragResult({ row, scale, mode, dx }) {
  if (!row.end) return null;
  const base = startOfDay(row.end);
  const days = Math.round(dx / scale.dayWidth);
  let end = addDays(base, days);
  if (mode === 'resize-right' && row.start && end < row.start) end = startOfDay(row.start);
  const outOfRange = end < scale.start || end > scale.end;
  return { end, changed: !outOfRange && end.getTime() !== base.getTime(), outOfRange };
}
