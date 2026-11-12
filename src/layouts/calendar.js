// 月曆：依到期日把 issue 放進格子；小卡可拖到別天改到期日（同 Gantt 的寫入路徑與保險）。
import { el } from '../app/dom.js';
import { icon } from '../app/icons.js';
import { monthGrid, dayKey } from '../timeline/calendar-grid.js';
import { miniCard } from '../ui/issue-card.js';
import { updateDueDate, localMidnight } from '../api.js';
import { toast } from '../ui/toast.js';
import { assertWritable } from '../ui/guard.js';

export const CALENDAR_CSS = `
  .cal-toolbar { display: flex; align-items: center; gap: 8px; padding: 8px 16px; border-bottom: 1px solid var(--border-subtle); font-size: 12px; color: var(--txt-3); }
  .cal-toolbar .month { font-size: 14px; font-weight: 600; color: var(--txt-1); min-width: 120px; text-align: center; }
  .cal-toolbar .spacer { flex: 1; }
  .cal-toolbar label { display: inline-flex; align-items: center; gap: 4px; cursor: pointer; }
  .cal { flex: 1; min-height: 0; display: grid; grid-template-rows: 28px 1fr; }
  .cal .dow { display: grid; grid-template-columns: repeat(var(--cols), 1fr); border-bottom: 1px solid var(--border-subtle); }
  .cal .dow span { padding: 6px 8px; font-size: 11px; font-weight: 500; color: var(--txt-3); }
  .cal .weeks { display: grid; grid-auto-rows: 1fr; min-height: 0; overflow: auto; }
  .cal .week { display: grid; grid-template-columns: repeat(var(--cols), 1fr); border-bottom: 1px solid var(--border-subtle); min-height: 110px; }
  .cal .day { border-right: 1px solid var(--border-subtle); padding: 4px; display: flex; flex-direction: column; gap: 3px; min-width: 0; overflow: hidden; }
  .cal .day:last-child { border-right: 0; }
  .cal .day.out { background: var(--bg-layer-1); color: var(--txt-placeholder); }
  .cal .day.weekend:not(.out) { background: var(--bg-surface-2); }
  .cal .day.over { outline: 2px solid var(--brand); outline-offset: -2px; }
  .cal .day .num { font-size: 11px; color: var(--txt-3); padding: 2px 4px; display: flex; align-items: center; gap: 6px; }
  .cal .day.today .num b { background: var(--brand); color: #fff; border-radius: 10px; padding: 0 6px; font-weight: 600; }
  .cal .day .num .n { margin-left: auto; color: var(--txt-placeholder); }
  .cal .mini[draggable="true"] { cursor: grab; }
`;

const DOW = ['一', '二', '三', '四', '五', '六', '日'];

export function renderCalendar(main, state, prefs, savePrefs, { onOpen, filter } = {}) {
  const { project, issues } = state;
  const root = main.getRootNode();
  const today = new Date();
  prefs.calYear ??= today.getFullYear();
  prefs.calMonth ??= today.getMonth();

  const toolbar = el('div', 'cal-toolbar');
  const prev = el('button', 'iconbtn');
  prev.append(icon('prev'));
  const next = el('button', 'iconbtn');
  next.append(icon('next'));
  const title = el('span', 'month');
  const todayBtn = el('button', 'btn');
  todayBtn.append(icon('today'), el('span', '', '今天'));
  const count = el('span', '');
  const weekendLabel = el('label');
  const weekendInput = el('input');
  weekendInput.type = 'checkbox';
  weekendInput.checked = prefs.calWeekends !== false;
  weekendLabel.append(weekendInput, el('span', '', '顯示週末'));
  toolbar.append(prev, title, next, todayBtn, count, el('span', 'spacer'), weekendLabel);
  const cal = el('div', 'cal');
  main.replaceChildren(toolbar, cal);

  const draw = () => {
    const showWeekends = prefs.calWeekends !== false;
    const grid = monthGrid(prefs.calYear, prefs.calMonth, { today });
    title.textContent = grid.title;
    const byDay = new Map();
    const visible = filter ? issues.filter(filter) : issues;
    for (const issue of visible) {
      if (!issue.dueDate) continue;
      const k = dayKey(new Date(issue.dueDate));
      if (!byDay.has(k)) byDay.set(k, []);
      byDay.get(k).push(issue);
    }
    const inMonth = grid.weeks.flat().filter((d) => d.inMonth).reduce((n, d) => n + (byDay.get(d.key)?.length ?? 0), 0);
    count.textContent = `本月 ${inMonth} 張到期`;

    cal.style.setProperty('--cols', showWeekends ? 7 : 5);
    const dow = el('div', 'dow');
    for (let i = 0; i < (showWeekends ? 7 : 5); i++) dow.append(el('span', '', DOW[i]));
    const weeks = el('div', 'weeks');
    for (const week of grid.weeks) {
      const w = el('div', 'week');
      for (const d of week) {
        if (!showWeekends && d.weekend) continue;
        const cell = el('div', `day${d.inMonth ? '' : ' out'}${d.today ? ' today' : ''}${d.weekend ? ' weekend' : ''}`);
        cell.dataset.day = d.key;
        const num = el('div', 'num');
        num.append(el('b', '', String(d.date.getDate())));
        const items = byDay.get(d.key) ?? [];
        if (items.length) num.append(el('span', 'n', String(items.length)));
        cell.append(num);
        for (const issue of items) {
          const m = miniCard(project.key, issue, { onOpen });
          m.draggable = true;
          m.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', issue.id);
            e.dataTransfer.effectAllowed = 'move';
          });
          cell.append(m);
        }
        cell.addEventListener('dragover', (e) => {
          e.preventDefault();
          cell.classList.add('over');
        });
        cell.addEventListener('dragleave', (e) => {
          if (!cell.contains(e.relatedTarget)) cell.classList.remove('over');
        });
        cell.addEventListener('drop', async (e) => {
          e.preventDefault();
          cell.classList.remove('over');
          const id = e.dataTransfer.getData('text/plain');
          const issue = issues.find((i) => i.id === id);
          if (!issue) return;
          const before = issue.dueDate;
          const after = localMidnight(d.date.getFullYear(), d.date.getMonth(), d.date.getDate());
          if (before === after) return; // 放回同一天不送請求
          issue.dueDate = after;
          draw();
          try {
            assertWritable(id, project.key, issue.serialNumber);
            await updateDueDate(id, after);
            toast(root, `${project.key}-${issue.serialNumber} 到期日改為 ${d.key}`);
          } catch (err) {
            issue.dueDate = before;
            draw();
            toast(root, `更新到期日失敗：${err.message}`, { kind: 'error' });
          }
        });
        w.append(cell);
      }
      weeks.append(w);
    }
    cal.replaceChildren(dow, weeks);
  };

  const go = (delta) => {
    const d = new Date(prefs.calYear, prefs.calMonth + delta, 1);
    prefs.calYear = d.getFullYear();
    prefs.calMonth = d.getMonth();
    savePrefs();
    draw();
  };
  prev.addEventListener('click', () => go(-1));
  next.addEventListener('click', () => go(1));
  todayBtn.addEventListener('click', () => {
    prefs.calYear = today.getFullYear();
    prefs.calMonth = today.getMonth();
    savePrefs();
    draw();
  });
  weekendInput.addEventListener('change', () => {
    prefs.calWeekends = weekendInput.checked;
    savePrefs();
    draw();
  });
  draw();
  return { draw };
}
