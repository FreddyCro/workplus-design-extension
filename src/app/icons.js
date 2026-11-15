// 線條 icon：圖形採用 Plane（https://plane.so）所用的 Lucide icon set（https://lucide.dev，ISC License）。
// 24×24 viewBox、stroke 1.5、currentColor、圓角線頭。名稱沿用舊版，對應的 Lucide icon 寫在行尾註解。
const SHAPES = {
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>', // list
  board: '<path d="M6 5v11M12 5v6M18 5v14"/>', // kanban
  calendar: '<path d="M8 2v4M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>', // calendar
  gantt: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 8h7M8 12h6M11 16h5"/>', // square-gantt-chart
  timeline: '<path d="M8 6h10M6 12h9M11 18h7"/>', // chart-no-axes-gantt
  collapse: '<path d="m15 18-6-6 6-6"/>', // chevron-left
  expand: '<path d="m9 18 6-6-6-6"/>', // chevron-right
  panel: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/>', // panel-left
  today: '<path d="M8 2v4M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/><path d="m9 16 2 2 4-4"/>', // calendar-check
  filter: '<path d="M3 6h18M7 12h10M10 18h4"/>', // list-filter
  display: '<path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4"/>', // sliders-horizontal
  plus: '<path d="M5 12h14M12 5v14"/>', // plus
  dots: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>', // ellipsis
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>', // search
  chevron: '<path d="m6 9 6 6 6-6"/>', // chevron-down
  close: '<path d="M18 6 6 18M6 6l12 12"/>', // x
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>', // link
  tag: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>', // tag
  priority: '<path d="M2 20h.01M7 20v-4M12 20v-8M17 20V8"/>', // signal-high
  circle: '<circle cx="12" cy="12" r="10"/>', // circle
  check: '<path d="M20 6 9 17l-5-5"/>', // check
  bug: '<path d="m8 2 1.88 1.88M14.12 3.88 16 2M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6M12 20v-9M6.53 9C4.6 8.8 3 7.1 3 5M6 13H2M3 21c0-2.1 1.7-3.9 3.8-4M20.97 5c0 2.1-1.6 3.8-3.5 4M22 13h-4M17.2 17c2.1.1 3.8 1.9 3.8 4"/>', // bug
  star: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>', // star
  task: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="m9 12 2 2 4-4"/>', // square-check
  work: '<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65M22 12.65l-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>', // layers
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>', // settings
  comment: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>', // message-square
  external: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>', // external-link
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>', // user
  prev: '<path d="m15 18-6-6 6-6"/>', // chevron-left
  next: '<path d="m9 18 6-6-6-6"/>', // chevron-right
  sparkle: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>', // sparkles
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0"/>', // bell
  cols: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18M15 3v18"/>', // columns-3
  rows: '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M21 9H3M21 15H3"/>', // rows-3
};

export function icon(name, size = 16) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.5');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.classList.add('icon', `icon-${name}`);
  svg.innerHTML = SHAPES[name] ?? SHAPES.circle; // 內容是上方固定字串，不含外部資料
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
