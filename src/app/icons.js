// 簡單的線條 icon（自己畫，16px，stroke 用 currentColor）
const PATHS = {
  list: 'M3 4h10M3 8h10M3 12h10',
  board: 'M2 2h3.5v12H2zM6.25 2h3.5v8h-3.5zM10.5 2H14v10h-3.5z',
  calendar: 'M2.5 3.5h11v10h-11zM2.5 6.5h11M5.5 2v3M10.5 2v3',
  gantt: 'M2 3h5M4 7h7M7 11h6M2 14h12',
  timeline: 'M2 8h12M5 5v6M9 4v8M12 6v4',
  collapse: 'M10 3L5 8l5 5',
  expand: 'M6 3l5 5-5 5',
  panel: 'M2 3h12v10H2zM6 3v10',
  today: 'M3 4h10v9H3zM3 7h10M6 2v3M10 2v3',
  filter: 'M2 3h12l-4.5 5.5V13l-3-1.5V8.5z',
  display: 'M2 4h12M2 8h12M2 12h12M5 2.5v3M11 6.5v3M7 10.5v3',
  plus: 'M8 3v10M3 8h10',
  dots: 'M3.5 8h.01M8 8h.01M12.5 8h.01',
  search: 'M7 12A5 5 0 1 0 7 2a5 5 0 0 0 0 10zM11 11l3 3',
  chevron: 'M4 6l4 4 4-4',
  close: 'M4 4l8 8M12 4l-8 8',
  link: 'M6.5 9.5l3-3M5 7L3.5 8.5a2.1 2.1 0 0 0 3 3L8 10M8 6l1.5-1.5a2.1 2.1 0 0 1 3 3L11 9',
  tag: 'M2 2h5.5L14 8.5 8.5 14 2 7.5zM5 5h.01',
  priority: 'M3 13V9M7 13V6M11 13V3',
  circle: 'M8 2a6 6 0 1 1 0 12A6 6 0 0 1 8 2z',
  check: 'M3 8.5l3 3 7-7',
  bug: 'M6 3l-1-1M10 3l1-1M5.5 5h5a2.5 2.5 0 0 1 2.5 2.5V10a5 5 0 0 1-10 0V7.5A2.5 2.5 0 0 1 5.5 5zM3 8h2M11 8h2M3 12l2-1M13 12l-2-1M8 7v6',
  star: 'M8 2l1.8 3.8 4.2.6-3 2.9.7 4.2L8 11.5l-3.7 2 .7-4.2-3-2.9 4.2-.6z',
  task: 'M2.5 2.5h11v11h-11zM5 8l2 2 4-4',
  work: 'M2 5h12v8H2zM5.5 5V3h5v2M2 9h12',
  settings: 'M8 10.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4',
  comment: 'M2 3h12v8H6l-3 2.5V11H2z',
  external: 'M9 2h5v5M14 2L7 9M12 9v4H3V4h4',
  user: 'M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2.5 14a5.5 5.5 0 0 1 11 0',
  prev: 'M10 3L5 8l5 5',
  next: 'M6 3l5 5-5 5',
  sparkle: 'M8 2l1.5 4.5L14 8l-4.5 1.5L8 14l-1.5-4.5L2 8l4.5-1.5z',
  bell: 'M4 11V7a4 4 0 0 1 8 0v4l1 1.5H3zM6.5 14h3',
  cols: 'M2 2h3v12H2zM6.5 2h3v12h-3zM11 2h3v12h-3z',
  rows: 'M2 2h12v3H2zM2 6.5h12v3H2zM2 11h12v3H2z',
};

export function icon(name, size = 16) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('viewBox', '0 0 16 16');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.5');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.classList.add('icon', `icon-${name}`);
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', PATHS[name] ?? PATHS.circle);
  svg.append(path);
  return svg;
}

// issue 類型 → icon 名稱與顏色 class
export function typeIcon(typeName) {
  const n = (typeName ?? '').toLowerCase();
  if (n.includes('bug')) return icon('bug');
  if (n.includes('feature') || n.includes('story')) return icon('star');
  return icon('task');
}

export function typeClass(typeName) {
  const n = (typeName ?? '').toLowerCase();
  if (n.includes('bug')) return 'type-bug';
  if (n.includes('feature') || n.includes('story')) return 'type-feature';
  return 'type-task';
}
