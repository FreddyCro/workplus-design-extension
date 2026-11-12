// 條與相依箭頭的版面：rows + scale → 每條的 x / width / y、箭頭的 SVG path。純函式。
import { daysBetween } from './scale.js';

export const ROW_HEIGHT = 44;
export const DEFAULT_BLOCK_WIDTH = 60;
const ARROW_STUB = 8;

// Row = { id, start: Date|null, end: Date|null }
// Block = { id, rowIndex, x, width, y, hasStart, hasEnd }
export function layoutRows(rows, scale) {
  const blocks = [];
  rows.forEach((row, rowIndex) => {
    const hasStart = !!row.start;
    const hasEnd = !!row.end;
    if (!hasStart && !hasEnd) return;
    let x;
    let width;
    if (hasStart && hasEnd) {
      x = scale.xOf(row.start);
      width = (daysBetween(row.start, row.end) + 1) * scale.dayWidth;
    } else if (hasEnd) {
      width = DEFAULT_BLOCK_WIDTH;
      x = scale.xOf(row.end) + scale.dayWidth - width;
    } else {
      width = DEFAULT_BLOCK_WIDTH;
      x = scale.xOf(row.start);
    }
    blocks.push({ id: row.id, rowIndex, x, width, y: rowIndex * ROW_HEIGHT, hasStart, hasEnd });
  });
  return blocks;
}

export function layoutArrows(relations, blocks) {
  const byId = new Map(blocks.map((b) => [b.id, b]));
  const arrows = [];
  for (const { from, to } of relations) {
    const a = byId.get(from);
    const b = byId.get(to);
    if (!a || !b) continue;
    const x1 = a.x + a.width;
    const y1 = a.y + ROW_HEIGHT / 2;
    const y2 = b.y + ROW_HEIGHT / 2;
    arrows.push({ from, to, d: `M ${x1} ${y1} H ${x1 + ARROW_STUB} V ${y2} H ${b.x}` });
  }
  return arrows;
}

export function sortRows(rows) {
  const dated = rows.filter((r) => r.end).sort((a, b) => a.end - b.end);
  const undated = rows.filter((r) => !r.end);
  return [...dated, ...undated];
}
