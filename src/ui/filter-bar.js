// 篩選列：成員多選 chip、專案類型（label）下拉、到期日區間。直接改 filters 物件再呼叫 onChange()。
import { el, initials } from '../app/dom.js';
import { icon } from '../app/icons.js';
import { membersOf, labelsOf, hasFilter } from './filters.js';
import { memberColor } from './palette.js';
import { miniCalendar } from './mini-calendar.js';

export const FILTER_CSS = `
  .filterbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 8px 16px; border-bottom: 1px solid var(--border-subtle); background: var(--bg-surface-1); font-size: 12px; }
  .filterbar .lbl { font-size: 11px; color: var(--txt-3); font-weight: 700; text-transform: uppercase; letter-spacing: .06em; margin-right: 2px; }
  .filterbar .mchip { display: inline-flex; align-items: center; gap: 6px; padding: 3px 11px 3px 3px; border: 1px solid var(--border-strong); border-radius: 999px;
                      background: var(--bg-surface-1); color: var(--txt-2); font-weight: 500; transition: all .15s; }
  .filterbar .mchip.all { padding: 4px 11px; }
  .filterbar .mchip:hover { border-color: var(--txt-4); }
  .filterbar .mchip.active { border-color: var(--brand); background: var(--brand-soft); color: var(--brand); font-weight: 700; }
  .filterbar .mchip .avatar { width: 20px; height: 20px; font-size: 9px; color: #333; border: 1.5px solid rgb(0 0 0 / 6%); }
  .filterbar .picked { color: var(--txt-3); font-size: 11px; margin-left: 4px; }
  .filterbar .spacer { flex: 1; }
  .filterbar select { padding: 6px 10px; border: 1px solid var(--border-strong); border-radius: var(--radius-md); font: inherit; font-size: 12.5px; color: var(--txt-2); background: var(--bg-surface-1); cursor: pointer; }
  .filterbar select.active { border-color: var(--brand); color: var(--brand); font-weight: 700; background: var(--brand-soft); }
  .filterbar .range { position: relative; }
  .filterbar .range > .btn.active { border-color: var(--brand); color: var(--brand); background: var(--brand-soft); font-weight: 700; }
  .filterbar .range .pop { position: absolute; top: calc(100% + 6px); right: 0; z-index: 40; background: var(--bg-surface-1); border: 1px solid var(--border-strong); border-radius: 12px;
                           box-shadow: 0 8px 32px rgb(0 0 0 / 12%); padding: 12px; width: 268px; }
  .filterbar .range .ends { display: flex; gap: 6px; margin-bottom: 8px; }
  .filterbar .range .ends button { flex: 1; padding: 6px 8px; border: 1px solid var(--border-strong); border-radius: var(--radius-md); font-size: 12px; color: var(--txt-2); background: var(--bg-layer-1); }
  .filterbar .range .ends button.active { border-color: var(--brand); color: var(--brand); background: var(--brand-soft); font-weight: 700; }
  .filterbar .range .minical { width: 100%; box-shadow: none; border: 0; padding: 0; }
  .filterbar .range .acts { display: flex; gap: 6px; margin-top: 8px; }
  .filterbar .range .acts .btn { flex: 1; justify-content: center; }
`;

function fmt(k) {
  return k ? `${Number(k.slice(5, 7))}/${Number(k.slice(8, 10))}` : '';
}

function rangeText(f) {
  if (f.from && f.to) return `${fmt(f.from)} – ${fmt(f.to)}`;
  if (f.from) return `從 ${fmt(f.from)}`;
  if (f.to) return `到 ${fmt(f.to)}`;
  return '日期區間';
}

export function renderFilterBar(container, { issues, filters, onChange, today = new Date() }) {
  const bar = el('div', 'filterbar');
  container.replaceChildren(bar);
  let members = membersOf(issues);
  let labels = labelsOf(issues);
  let popOpen = false;
  let pickingFrom = true;

  const draw = () => {
    bar.replaceChildren();
    bar.append(el('span', 'lbl', '顯示成員'));
    const showAll = filters.members.length === 0;
    const all = el('button', `mchip all${showAll ? ' active' : ''}`);
    all.append(el('span', '', '全部'));
    all.addEventListener('click', () => { filters.members = []; onChange(); draw(); });
    bar.append(all);
    for (const m of members) {
      const active = filters.members.includes(m);
      const c = el('button', `mchip${active ? ' active' : ''}`);
      const av = el('span', 'avatar', initials(m));
      av.style.background = memberColor(m);
      c.append(av, el('span', '', m));
      c.title = m;
      c.addEventListener('click', () => {
        filters.members = active ? filters.members.filter((x) => x !== m) : [...filters.members, m];
        onChange();
        draw();
      });
      bar.append(c);
    }
    if (!showAll) bar.append(el('span', 'picked', `已選 ${filters.members.length} 位`));
    bar.append(el('span', 'spacer'));

    const sel = el('select', filters.label ? 'active' : '');
    const none = el('option', '', '所有專案');
    none.value = '';
    sel.append(none);
    for (const l of labels) {
      const o = el('option', '', l.text);
      o.value = l.id;
      sel.append(o);
    }
    sel.value = filters.label ?? '';
    sel.addEventListener('change', () => { filters.label = sel.value || null; onChange(); draw(); });
    bar.append(sel);

    const range = el('div', 'range');
    const rbtn = el('button', `btn${filters.from || filters.to ? ' active' : ''}`);
    rbtn.append(icon('calendar', 13), el('span', '', rangeText(filters)));
    rbtn.addEventListener('click', () => { popOpen = !popOpen; draw(); });
    range.append(rbtn);
    if (popOpen) {
      const pop = el('div', 'pop');
      pop.addEventListener('click', (e) => e.stopPropagation());
      const ends = el('div', 'ends');
      const fromBtn = el('button', pickingFrom ? 'active' : '', `從 ${fmt(filters.from) || '—'}`);
      const toBtn = el('button', pickingFrom ? '' : 'active', `到 ${fmt(filters.to) || '—'}`);
      fromBtn.addEventListener('click', () => { pickingFrom = true; draw(); });
      toBtn.addEventListener('click', () => { pickingFrom = false; draw(); });
      ends.append(fromBtn, toBtn);
      const cal = miniCalendar({
        value: pickingFrom ? filters.from : filters.to,
        today,
        onPick: (k) => {
          if (pickingFrom) { filters.from = k; pickingFrom = false; } else filters.to = k;
          onChange();
          draw();
        },
      });
      const acts = el('div', 'acts');
      const clear = el('button', 'btn', '清除');
      clear.addEventListener('click', () => { filters.from = null; filters.to = null; pickingFrom = true; onChange(); draw(); });
      const done = el('button', 'btn primary', '完成');
      done.addEventListener('click', () => { popOpen = false; draw(); });
      acts.append(clear, done);
      pop.append(ends, cal, acts);
      range.append(pop);
    }
    bar.append(range);
    bar.classList.toggle('has-filter', hasFilter(filters));
  };

  // 點外面關掉區間下拉
  const rootNode = container.getRootNode();
  const onDocClick = (e) => {
    if (!bar.isConnected) { rootNode.removeEventListener('click', onDocClick); return; } // 外殼重掛後舊的 bar 已拆掉
    if (popOpen && !e.composedPath().includes(bar)) { popOpen = false; draw(); }
  };
  rootNode.addEventListener('click', onDocClick);

  draw();
  return {
    update: (next) => { members = membersOf(next); labels = labelsOf(next); draw(); },
  };
}
