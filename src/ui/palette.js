// 色票（純函式）。值取自設計師原型；WorkPlus 沒有這些顏色，由 extension 自己配。

const S = (glyph, color) => ({ glyph, color });

// 依狀態名稱（小寫比對）
export const STATUS_BY_NAME = {
  '待處理': S('○', '#aaa'), 'to do': S('○', '#aaa'), 'todo': S('○', '#aaa'), 'open': S('○', '#aaa'), 'new': S('○', '#aaa'),
  '進行中': S('◑', '#5094dc'), 'in process': S('◑', '#5094dc'), 'in progress': S('◑', '#5094dc'), 'doing': S('◑', '#5094dc'),
  '審核中': S('◈', '#e79b3d'), 'review': S('◈', '#e79b3d'), 'in review': S('◈', '#e79b3d'),
  '開發中': S('◐', '#8b5cf6'),
  '待上線': S('◉', '#0891b2'),
  '已完成': S('●', '#30a46c'), 'done': S('●', '#30a46c'), 'closed': S('●', '#30a46c'), 'close': S('●', '#30a46c'),
  '取消': S('✕', '#9ca3af'), 'cancelled': S('✕', '#9ca3af'), 'canceled': S('✕', '#9ca3af'),
  '待定': S('◌', '#f59e0b'), 'pending': S('◌', '#f59e0b'),
};

// 依 WorkPlus 的狀態分類
export const STATUS_BY_CATEGORY = {
  new: S('○', '#aaa'),
  in_process: S('◑', '#5094dc'),
  resolved: S('◈', '#e79b3d'),
  done: S('●', '#30a46c'),
};

export function statusStyle(status) {
  const byName = STATUS_BY_NAME[(status?.name ?? '').toLowerCase()];
  if (byName) return { color: byName.color, glyph: byName.glyph };
  const byCat = STATUS_BY_CATEGORY[status?.category?.name];
  if (byCat) return { color: byCat.color, glyph: byCat.glyph };
  return { color: '#aaa', glyph: '○' };
}

export const PRIORITY = {
  CRITICAL: { label: '緊急', color: '#b91c1c', bg: '#fee2e2' },
  HIGH: { label: '高', color: '#e54d2e', bg: '#fff0ee' },
  MEDIUM: { label: '中', color: '#e79b3d', bg: '#fff8ee' },
  LOW: { label: '低', color: '#6e6e6e', bg: '#f4f4f4' },
};

export function priorityStyle(priority) {
  const p = PRIORITY[priority];
  if (p) return { ...p };
  return { label: '—', color: PRIORITY.LOW.color, bg: PRIORITY.LOW.bg };
}

export const MEMBER_COLORS = ['#e8d5ff', '#d5e8ff', '#d5ffe8', '#ffe8d5', '#ffd5e8', '#fff3d5', '#d5fff3', '#f5d5ff', '#d5f5ff', '#ffd5d5'];

export function hashString(s) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

// 黃金角分散色相，相鄰的字串才不會擠在同一色系
export function hashHue(s) {
  return Math.round((hashString(s) * 137.508) % 360);
}

export function memberColor(account) {
  if (!account) return '#e8e8e8';
  return MEMBER_COLORS[hashString(account) % MEMBER_COLORS.length];
}

export const PROJECT_TYPE_COLORS = {
  'Official Web': '#5094dc',
  'Event Web': '#e79b3d',
  'C2 Web': '#8b5cf6',
  'Advertisement': '#e54d2e',
  'Brochures': '#14b8a6',
  'Blog & News': '#eab308',
  'Enews': '#06b6d4',
  'Exhibition': '#30a46c',
  'Flyer': '#ec4899',
  'GDN_Banner': '#f97316',
  'Others': '#6e6e6e',
  'Product 3D': '#7c3aed',
  'Package': '#a16207',
  'Topology': '#1e40af',
  'Video': '#c026d3',
  '福委會': '#d4a017',
};

const HEX = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

export function labelColor(label) {
  if (label?.color && HEX.test(label.color)) return label.color;
  const byName = PROJECT_TYPE_COLORS[label?.text];
  if (byName) return byName;
  return `oklch(0.62 0.13 ${hashHue(label?.text ?? '')})`;
}
