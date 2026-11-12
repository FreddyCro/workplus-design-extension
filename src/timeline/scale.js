// 時間刻度：檢視（week / month）→ 日寬、日期 ↔ x 座標、header 格。
// 純函式，沒有 DOM；日期一律用當地時間，日數用「當地 00:00 相減再四捨五入」算，避開夏令時間。

export const VIEWS = {
  week: { dayWidth: 60 },
  month: { dayWidth: 20 },
};

const DAY_MS = 86400000;
const WEEKDAY = ['日', '一', '二', '三', '四', '五', '六'];

export function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function daysBetween(from, to) {
  return Math.round((startOfDay(to) - startOfDay(from)) / DAY_MS);
}

export function sameDay(a, b) {
  return a && b && startOfDay(a).getTime() === startOfDay(b).getTime();
}

export function makeScale({ view, start, end }) {
  const { dayWidth } = VIEWS[view];
  const s = startOfDay(start);
  const e = startOfDay(end);
  const days = daysBetween(s, e) + 1;
  return {
    view,
    dayWidth,
    start: s,
    end: e,
    days,
    width: days * dayWidth,
    xOf: (date) => daysBetween(s, date) * dayWidth,
    dateAt: (x) => addDays(s, Math.round(x / dayWidth)),
  };
}

export function headerCells(scale, today = new Date()) {
  const bottom = [];
  const top = [];
  const groupKey = scale.view === 'week' ? weekKey : monthKey;
  const groupLabel = scale.view === 'week' ? weekLabel : monthLabel;
  for (let i = 0; i < scale.days; i++) {
    const date = addDays(scale.start, i);
    const dow = date.getDay();
    bottom.push({
      label: scale.view === 'week' ? `${WEEKDAY[dow]} ${date.getDate()}` : String(date.getDate()),
      x: i * scale.dayWidth,
      width: scale.dayWidth,
      weekend: dow === 0 || dow === 6,
      today: sameDay(date, today),
    });
    const key = groupKey(date);
    const last = top[top.length - 1];
    if (last && last.key === key) {
      last.width += scale.dayWidth;
    } else {
      top.push({ key, label: groupLabel(date), x: i * scale.dayWidth, width: scale.dayWidth });
    }
  }
  return { top: top.map(({ key, ...cell }) => cell), bottom };
}

function monthKey(date) {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

function monthLabel(date) {
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月`;
}

// 週一為一週的開始
function weekStart(date) {
  const offset = (date.getDay() + 6) % 7;
  return addDays(date, -offset);
}

function weekKey(date) {
  return weekStart(date).getTime();
}

function weekLabel(date) {
  const ws = weekStart(date);
  const we = addDays(ws, 6);
  return `${ws.getMonth() + 1}/${ws.getDate()} – ${we.getMonth() + 1}/${we.getDate()}`;
}

function addMonths(date, months) {
  return new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
}

export function rangeFor(dates, today = new Date()) {
  const t = startOfDay(today);
  let start = addMonths(t, -3);
  let end = addMonths(t, 3);
  const valid = dates.filter(Boolean).map(startOfDay);
  if (valid.length) {
    const min = new Date(Math.min(...valid));
    const max = new Date(Math.max(...valid));
    start = new Date(Math.min(start, addMonths(min, -1)));
    end = new Date(Math.max(end, addMonths(max, 1)));
  }
  return { start, end };
}
