// 篩選條件（純函式）。成員多選、專案類型（label）、到期日區間；全部在前端做。
import { dayKey } from '../timeline/calendar-grid.js';

// members: account 陣列（空 = 全部）；label: label id 或 null；from / to: dayKey 字串或 null
export function emptyFilters() {
  return { members: [], label: null, from: null, to: null };
}

export function hasFilter(f) {
  return f.members.length > 0 || !!f.label || !!f.from || !!f.to;
}

export function matchesFilters(issue, f) {
  if (f.members.length && !f.members.includes(issue.assignee?.account)) return false;
  if (f.label && !issue.labels?.some((l) => l.id === f.label)) return false;
  if (f.from || f.to) {
    if (!issue.dueDate) return false;
    const k = dayKey(new Date(issue.dueDate));
    if (f.from && k < f.from) return false;
    if (f.to && k > f.to) return false;
  }
  return true;
}

export function membersOf(issues) {
  return [...new Set(issues.map((i) => i.assignee?.account).filter(Boolean))].sort();
}

export function labelsOf(issues) {
  const byId = new Map();
  for (const i of issues) for (const l of i.labels ?? []) if (!byId.has(l.id)) byId.set(l.id, { id: l.id, text: l.text, color: l.color });
  return [...byId.values()].sort((x, y) => x.text.localeCompare(y.text));
}
