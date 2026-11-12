// 行事曆（設計師原型版面）：週日開頭、固定 6 列；格子依到期日放小卡（底色 = 負責人、左框 = 優先度）；
// 當天有留言顯示 ●N；點格子選取並打開右側面板；小卡可拖到別天改到期日（同 Gantt 的寫入路徑與保險）。
import { el } from '../app/dom.js';
import { icon } from '../app/icons.js';
import { monthGrid, dayKey } from '../timeline/calendar-grid.js';
import { calendarItem } from '../ui/issue-card.js';
import { updateDueDate, localMidnight } from '../api.js';
import { toast } from '../ui/toast.js';
import { assertWritable } from '../ui/guard.js';
import { renderCalendarPanel } from './calendar-panel.js';

export const CALENDAR_CSS = `
  .cal-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 28px 12px; border-bottom: 1px solid var(--border-subtle); background: var(--bg-surface-1); flex: none; }
  .cal-head h1 { font-size: 22px; font-weight: 700; color: #111; letter-spacing: -.02em; margin: 0; }
  .cal-head .sub { font-size: 13px; color: var(--txt-3); margin-top: 2px; }
  .cal-head .tools { display: flex; align-items: center; gap: 8px; }
  .cal-head .seg { display: flex; border: 1px solid var(--border-strong); border-radius: var(--radius-md); overflow: hidden; background: var(--bg-surface-1); }
  .cal-head .seg button { padding: 6px 12px; color: var(--txt-2); font-size: 13px; }
  .cal-head .seg button + button { border-left: 1px solid var(--border-strong); }
  .cal-head .seg button.today { font-size: 12.5px; font-weight: 600; }
  .cal-head .ptoggle { display: grid; place-items: center; width: 34px; height: 30px; border: 1px solid var(--border-strong); border-radius: var(--radius-md); color: var(--txt-3); background: var(--bg-surface-1); }
  .cal-head .ptoggle.active { border-color: var(--brand); color: var(--brand); background: var(--brand-soft); }
  .cal-wrap { flex: 1; min-height: 0; display: flex; }
  .cal { flex: 1; min-width: 0; min-height: 0; display: grid; grid-template-rows: 30px 1fr; }
  .cal .dow { display: grid; grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); border-bottom: 1px solid var(--border-subtle); background: var(--bg-layer-1); }
  .cal .dow span { padding: 8px 0; text-align: center; font-size: 11.5px; font-weight: 700; color: var(--txt-3); letter-spacing: .06em; border-right: 1px solid var(--border-subtle); }
  .cal .dow span:last-child { border-right: 0; }
  .cal .dow span.we { color: var(--txt-4); }
  .cal .weeks { display: grid; grid-auto-rows: minmax(110px, 1fr); min-height: 0; overflow: auto; background: var(--bg-layer-1); }
  .cal .week { display: grid; grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); border-bottom: 1px solid var(--border-subtle); }
  .cal .day { border-right: 1px solid var(--border-subtle); padding: 6px; display: flex; flex-direction: column; gap: 3px; min-width: 0; overflow: hidden; background: var(--bg-surface-1); cursor: pointer; position: relative; }
  .cal .day:last-child { border-right: 0; }
  .cal .day.out { background: var(--bg-layer-1); cursor: default; }
  .cal .day.selected:not(.out) { background: var(--brand-faint); outline: 2px solid var(--brand); outline-offset: -2px; z-index: 1; }
  .cal .day.over { outline: 2px dashed var(--brand); outline-offset: -2px; }
  .cal .day .num { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px; }
  .cal .day .num b { font-size: 12px; font-weight: 500; color: var(--txt-2); width: 22px; height: 22px; display: grid; place-items: center; border-radius: 50%; }
  .cal .day.weekend .num b { color: var(--txt-3); }
  .cal .day.out .num b { color: var(--txt-4); }
  .cal .day.selected .num b { color: var(--brand); font-weight: 700; }
  .cal .day.today .num b { background: var(--brand); color: #fff; font-weight: 700; }
  .cal .day .num .cm { font-size: 9px; color: var(--green); font-weight: 700; background: var(--green-soft); border-radius: 4px; padding: 0 4px; }
  .cal .day .items { display: flex; flex-direction: column; gap: 2px; overflow: hidden; }
  .cal .day .more { font-size: 10px; color: var(--txt-3); font-weight: 600; padding: 0 5px; }
`;

const DOW = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
const MAX_ITEMS = 3;

export function renderCalendar(main, state, prefs, savePrefs, { onOpen, onAdd, filter, today = new Date() } = {}) {
  const { project, issues } = state;
  const root = main.getRootNode();
  prefs.calYear ??= today.getFullYear();
  prefs.calMonth ??= today.getMonth();
  prefs.calPanelOpen ??= true;
  // 選取日與面板收合狀態放在 state：篩選、搜尋會重新 render，不能因此跳回今天
  state.cal ??= { selected: dayKey(today), expanded: { today: true, upcoming: true } };
  const expanded = state.cal.expanded;

  // 標題區
  const head = el('div', 'cal-head');
  const hl = el('div');
  const sub = el('div', 'sub');
  hl.append(el('h1', '', '行事曆'), sub);
  const tools = el('div', 'tools');
  const seg = el('div', 'seg');
  const prev = el('button', '', '‹');
  const todayBtn = el('button', 'today', '今天');
  const next = el('button', '', '›');
  seg.append(prev, todayBtn, next);
  const ptoggle = el('button', 'ptoggle');
  ptoggle.append(icon('panel', 15));
  tools.append(seg, ptoggle);
  head.append(hl, tools);

  const wrap = el('div', 'cal-wrap');
  const cal = el('div', 'cal');
  const aside = el('aside', 'cal-panel');
  wrap.append(cal, aside);
  main.replaceChildren(head, wrap);

  const draw = () => {
    const showWeekends = prefs.calWeekends !== false;
    const grid = monthGrid(prefs.calYear, prefs.calMonth, { today, weekStart: 0, rows: 6 });
    const visible = filter ? issues.filter(filter) : issues;
    const byDay = new Map();
    const commentsByDay = new Map();
    for (const issue of visible) {
      if (issue.dueDate) {
        const k = dayKey(new Date(issue.dueDate));
        if (!byDay.has(k)) byDay.set(k, []);
        byDay.get(k).push(issue);
      }
      for (const c of issue.comments ?? []) {
        if (!c.createdDate) continue;
        const k = dayKey(new Date(c.createdDate));
        commentsByDay.set(k, (commentsByDay.get(k) ?? 0) + 1);
      }
    }
    const inMonth = grid.weeks.flat().filter((d) => d.inMonth).reduce((n, d) => n + (byDay.get(d.key)?.length ?? 0), 0);
    sub.textContent = `${grid.title} · 本月 ${inMonth} 項任務截止`;
    ptoggle.classList.toggle('active', prefs.calPanelOpen);
    ptoggle.title = prefs.calPanelOpen ? '隱藏側邊面板' : '顯示側邊面板';

    const cols = showWeekends ? 7 : 5;
    cal.style.setProperty('--cols', cols);
    const dow = el('div', 'dow');
    DOW.forEach((d, i) => {
      if (!showWeekends && (i === 0 || i === 6)) return;
      dow.append(el('span', i === 0 || i === 6 ? 'we' : '', d));
    });
    const weeks = el('div', 'weeks');
    for (const week of grid.weeks) {
      const w = el('div', 'week');
      for (const d of week) {
        if (!showWeekends && d.weekend) continue;
        const cell = el('div', `day${d.inMonth ? '' : ' out'}${d.today ? ' today' : ''}${d.weekend ? ' weekend' : ''}${d.key === state.cal.selected ? ' selected' : ''}`);
        cell.dataset.day = d.key;
        const num = el('div', 'num');
        num.append(el('b', '', String(d.date.getDate())));
        const cm = commentsByDay.get(d.key);
        if (cm) {
          const m = el('span', 'cm', `●${cm}`);
          m.title = `${cm} 筆進度紀錄（留言）`;
          num.append(m);
        }
        cell.append(num);
        const items = byDay.get(d.key) ?? [];
        const list = el('div', 'items');
        for (const issue of items.slice(0, MAX_ITEMS)) {
          const m = calendarItem(issue, { onOpen });
          m.draggable = true;
          m.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', issue.id);
            e.dataTransfer.effectAllowed = 'move';
          });
          list.append(m);
        }
        if (items.length > MAX_ITEMS) list.append(el('div', 'more', `+${items.length - MAX_ITEMS} 項`));
        cell.append(list);
        if (d.inMonth) {
          cell.addEventListener('click', () => {
            state.cal.selected = d.key;
            prefs.calPanelOpen = true;
            savePrefs();
            draw();
          });
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

    aside.hidden = !prefs.calPanelOpen;
    if (prefs.calPanelOpen) {
      renderCalendarPanel(aside, {
        project, dayKey: state.cal.selected, issues: visible, today, expanded, onOpen,
        onAdd: (k) => onAdd?.(null, localMidnight(Number(k.slice(0, 4)), Number(k.slice(5, 7)) - 1, Number(k.slice(8, 10)))),
        onToggle: (key) => { expanded[key] = !expanded[key]; draw(); },
      });
    }
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
    state.cal.selected = dayKey(today);
    savePrefs();
    draw();
  });
  ptoggle.addEventListener('click', () => {
    prefs.calPanelOpen = !prefs.calPanelOpen;
    savePrefs();
    draw();
  });
  draw();
  return { draw };
}
