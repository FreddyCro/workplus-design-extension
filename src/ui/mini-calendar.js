// 小月曆（原型 MiniCalendar）：240px、‹ › 換月、點日期回 dayKey。週日開頭。
import { el } from '../app/dom.js';
import { monthGrid, dayKey } from '../timeline/calendar-grid.js';

export const MINICAL_CSS = `
  .minical { width: 240px; padding: 14px; background: var(--bg-surface-1); border: 1px solid var(--border-strong); border-radius: 12px; box-shadow: 0 8px 32px rgb(0 0 0 / 12%); }
  .minical .nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
  .minical .nav button { font-size: 16px; color: var(--txt-2); padding: 2px 6px; }
  .minical .nav .m { font-size: 13px; font-weight: 700; color: var(--txt-1); }
  .minical .grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; }
  .minical .dow { text-align: center; font-size: 10px; color: var(--txt-3); font-weight: 700; padding: 2px 0; }
  .minical .d { text-align: center; padding: 5px 0; border-radius: 6px; font-size: 12px; color: var(--txt-1); cursor: pointer; }
  .minical .d:hover { background: var(--bg-layer-2); }
  .minical .d.out { color: var(--txt-4); cursor: default; }
  .minical .d.out:hover { background: none; }
  .minical .d.today { color: var(--brand); font-weight: 700; }
  .minical .d.sel { background: var(--brand); color: #fff; font-weight: 700; }
`;

const MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
const DOW = ['日', '一', '二', '三', '四', '五', '六'];

export function miniCalendar({ value = null, today = new Date(), onPick }) {
  const box = el('div', 'minical');
  box.addEventListener('click', (e) => e.stopPropagation());
  const init = value ? new Date(value.slice(0, 4), Number(value.slice(5, 7)) - 1, 1) : today;
  let year = init.getFullYear();
  let month = init.getMonth();

  const nav = el('div', 'nav');
  const prev = el('button', '', '‹');
  const next = el('button', '', '›');
  const title = el('span', 'm');
  nav.append(prev, title, next);
  const grid = el('div', 'grid');
  box.append(nav, grid);

  const draw = () => {
    title.textContent = `${year} · ${MONTHS[month]}`;
    grid.replaceChildren(...DOW.map((d) => el('span', 'dow', d)));
    const g = monthGrid(year, month, { today, weekStart: 0 });
    for (const d of g.weeks.flat()) {
      const k = dayKey(d.date);
      const cell = el('span', `d${d.inMonth ? '' : ' out'}${d.today ? ' today' : ''}${k === value ? ' sel' : ''}`, d.inMonth ? String(d.date.getDate()) : '');
      if (d.inMonth) cell.addEventListener('click', () => onPick?.(k));
      grid.append(cell);
    }
  };
  prev.addEventListener('click', () => { const d = new Date(year, month - 1, 1); year = d.getFullYear(); month = d.getMonth(); draw(); });
  next.addEventListener('click', () => { const d = new Date(year, month + 1, 1); year = d.getFullYear(); month = d.getMonth(); draw(); });
  draw();
  return box;
}
