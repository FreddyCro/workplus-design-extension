// Plane 風格的外殼：頂欄（workspace 選單、搜尋、頭像）+ 左側 icon rail + 可收合的專案面板 + header（麵包屑、layout icon 群、Display）。
import { el, initials } from './dom.js';
import { icon } from './icons.js';
import { LAYOUTS, projectUrl } from './router.js';

const LAYOUT_LABEL = { list: 'List', board: 'Board', calendar: 'Calendar', gantt: 'Gantt', timeline: 'Timeline' };

// 由代碼 hash 出穩定的顏色（oklch 固定明度與彩度，只變色相）
export function keyColor(key) {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  // 黃金角分散色相，相鄰的代碼（DG / D2023）才不會擠在同一色系
  return `oklch(0.62 0.13 ${Math.round((h * 137.508) % 360)})`;
}

export function renderShell(root, { user, project, projects, layout, panelOpen, onLayoutChange, onPanelToggle, onSearch, displayOptions }) {
  const shell = el('div', 'shell');

  // 頂欄
  const topbar = el('div', 'topbar');
  const ws = el('button', 'ws has-menu');
  ws.append(el('span', 'logo', 'W'), el('span', 'name', 'WorkPlus'), icon('chevron', 14));
  const wsMenu = el('div', 'menu left');
  wsMenu.hidden = true;
  wsMenu.append(el('div', 'title', '切換專案'));
  for (const p of projects) {
    const a = el('a');
    a.href = projectUrl(p.key, layout);
    const sq = el('span', 'square', p.key.slice(0, 2).toUpperCase());
    sq.style.background = keyColor(p.key);
    a.append(sq, el('span', '', p.name), el('span', 'dim', p.key));
    wsMenu.append(a);
  }
  ws.append(wsMenu);
  ws.addEventListener('click', (e) => {
    if (e.target.closest('a')) return;
    wsMenu.hidden = !wsMenu.hidden;
  });
  const search = el('label', 'search');
  const searchInput = el('input');
  searchInput.type = 'search';
  searchInput.placeholder = 'Search';
  searchInput.addEventListener('input', () => onSearch?.(searchInput.value.trim()));
  search.append(icon('search', 14), searchInput);
  const right = el('div', 'right');
  const bell = el('span', 'iconbtn');
  bell.append(icon('bell'));
  const ai = el('span', 'ai');
  ai.append(icon('sparkle', 14), el('span', '', 'AI assistant'));
  right.append(bell, ai, el('span', 'avatar', initials(user.account)));
  topbar.append(ws, search, right);

  // rail + 面板 + 內容
  const body = el('div', `body${panelOpen ? ' panel-open' : ''}`);
  const rail = el('nav', 'rail');
  const work = el('button', 'active');
  const workIco = el('span', 'ico');
  workIco.append(icon('work'));
  work.append(workIco, el('span', '', 'Work'));
  work.title = '專案面板';
  work.addEventListener('click', () => onPanelToggle(!body.classList.contains('panel-open')));
  const settings = el('a');
  settings.href = `/key/${encodeURIComponent(project.key)}/settings`;
  settings.title = '專案設定（原介面）';
  const setIco = el('span', 'ico');
  setIco.append(icon('settings'));
  settings.append(setIco, el('span', '', 'Settings'));
  rail.append(work, settings);

  const panel = el('aside', 'panel');
  panel.append(el('div', 'section', '專案'));
  for (const p of projects) {
    // Plane 做法：固定 20px 的彩色方塊（代碼前 2 字），名稱在右邊自然對齊；完整代碼放 tooltip
    const a = el('a', `item project${p.key === project.key ? ' active' : ''}`);
    a.href = projectUrl(p.key, layout);
    a.title = `${p.key} ${p.name}`;
    const sq = el('span', 'square', p.key.slice(0, 2).toUpperCase());
    sq.style.background = keyColor(p.key);
    a.append(sq, el('span', 'label', p.name));
    panel.append(a);
    if (p.key === project.key) {
      for (const l of LAYOUTS) {
        const sub = el('button', `item sub${l === layout ? ' active' : ''}`);
        sub.append(icon(l, 14), el('span', 'label', LAYOUT_LABEL[l]));
        sub.addEventListener('click', () => onLayoutChange(l));
        panel.append(sub);
      }
    }
  }

  const content = el('div', 'content');
  const header = el('div', 'header');
  const panelBtn = el('button', 'iconbtn');
  panelBtn.title = '專案面板';
  panelBtn.append(icon('panel'));
  panelBtn.addEventListener('click', () => onPanelToggle(!body.classList.contains('panel-open')));
  const crumbs = el('div', 'crumbs');
  const current = el('span', 'current');
  const count = el('span', 'count');
  current.append(icon('board', 14), el('span', '', 'Work items'), count);
  crumbs.append(el('span', '', project.name), el('span', 'sep', '›'), current);

  const layouts = el('div', 'layouts');
  for (const l of LAYOUTS) {
    const b = el('button', l === layout ? 'active' : '');
    b.title = LAYOUT_LABEL[l];
    b.dataset.layout = l;
    b.append(icon(l));
    b.addEventListener('click', () => onLayoutChange(l));
    layouts.append(b);
  }
  const filterBtn = el('button', 'iconbtn');
  filterBtn.title = '篩選（用上方搜尋）';
  filterBtn.append(icon('filter'));
  filterBtn.addEventListener('click', () => searchInput.focus());

  const display = el('div', 'has-menu');
  const displayBtn = el('button', 'btn', 'Display');
  const displayMenu = el('div', 'menu');
  displayMenu.hidden = true;
  displayMenu.append(el('div', 'title', '顯示'));
  for (const opt of displayOptions ?? []) {
    const label = el('label');
    const input = el('input');
    input.type = 'checkbox';
    input.checked = !!opt.checked;
    input.addEventListener('change', () => opt.onChange(input.checked));
    label.append(input, el('span', '', opt.label));
    displayMenu.append(label);
  }
  displayBtn.addEventListener('click', () => (displayMenu.hidden = !displayMenu.hidden));
  display.append(displayBtn, displayMenu);

  const addBtn = el('button', 'btn primary', 'Add work item');
  addBtn.disabled = true;
  addBtn.title = '尚未支援（建 issue 需要七個必填欄位，見 docs/evaluation.md）';
  const more = el('a', 'iconbtn');
  more.href = `/key/${encodeURIComponent(project.key)}/issues`;
  more.title = '在原介面開啟（需先關掉新介面）';
  more.append(icon('dots'));
  header.append(panelBtn, crumbs, el('div', 'spacer'), layouts, filterBtn, display, addBtn, more);

  const main = el('div', 'main');
  content.append(header, main);
  body.append(rail, panel, content);
  shell.append(topbar, body);
  root.append(shell);

  // 點外面關掉選單
  shell.addEventListener('click', (e) => {
    if (!e.target.closest('.has-menu')) {
      wsMenu.hidden = true;
      displayMenu.hidden = true;
    }
  });

  return {
    main,
    setPanelOpen: (open) => body.classList.toggle('panel-open', open),
    setCount: (n) => (count.textContent = n === undefined ? '' : `${n}`),
    setCrumbIcon: (name) => current.replaceChildren(icon(name, 14), el('span', '', 'Work items'), count),
  };
}
