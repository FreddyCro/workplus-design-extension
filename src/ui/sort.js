// 排序：header 的排序按鈕選一種，renderLayout 依此就地排序 state.issues，各 layout 都照這個順序。
const PRIORITY_RANK = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
const bySerial = (a, b) => Number(b.serialNumber) - Number(a.serialNumber);
// 沒有值的排最後，同值時用編號新→舊
const nullsLast = (get, dir = 1) => (a, b) => {
  const x = get(a);
  const y = get(b);
  if (x == null && y == null) return bySerial(a, b);
  if (x == null) return 1;
  if (y == null) return -1;
  return (x < y ? -dir : x > y ? dir : 0) || bySerial(a, b);
};

export const SORTS = [
  { key: 'serial-desc', label: 'ID（大 → 小）', cmp: bySerial },
  { key: 'serial-asc', label: 'ID（小 → 大）', cmp: (a, b) => -bySerial(a, b) },
  { key: 'due', label: '截止日期（近 → 遠）', cmp: nullsLast((i) => i.dueDate ?? null) },
  { key: 'priority', label: '優先級（高 → 低）', cmp: nullsLast((i) => PRIORITY_RANK[i.priority] ?? null) },
  { key: 'title', label: '標題（A → Z）', cmp: (a, b) => (a.title ?? '').localeCompare(b.title ?? '', 'zh-Hant') || bySerial(a, b) },
];
export const DEFAULT_SORT = 'serial-desc';

export function sortIssues(issues, key) {
  const s = SORTS.find((x) => x.key === key) ?? SORTS[0];
  return issues.sort(s.cmp);
}
