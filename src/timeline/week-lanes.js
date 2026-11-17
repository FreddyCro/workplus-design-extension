// 行事曆一週內的跨日橫條排版。純函式。
// days：這一週「畫出來的」日期 key（依欄位順序，隱藏週末時就少兩天）
// ranges：[{ item, start, end, rank? }]，start / end 是 'YYYY-MM-DD'（含頭含尾，字串可直接比大小）；
// rank 小的先擺（例如未完成 0、已完成 1，已完成的就不會把車道佔走）
// 回 { bars: [{ item, col, span, lane, contLeft, contRight }], hidden: [每欄沒擺進去的數量] }
// 長的、早開始的先擺；每條放進最低的空車道；超過 maxLanes 的算進該欄的 hidden。
export function layoutWeek(days, ranges, maxLanes) {
  const n = days.length;
  const segs = [];
  for (const r of ranges) {
    let c0 = -1;
    let c1 = -1;
    days.forEach((k, i) => {
      if (k >= r.start && k <= r.end) {
        if (c0 < 0) c0 = i;
        c1 = i;
      }
    });
    if (c0 < 0) continue;
    segs.push({ item: r.item, rank: r.rank ?? 0, col: c0, span: c1 - c0 + 1, contLeft: r.start < days[c0], contRight: r.end > days[c1] });
  }
  segs.sort((a, b) => a.rank - b.rank || a.col - b.col || b.span - a.span);
  const lanes = []; // lanes[l][col] = true
  const bars = [];
  const hidden = new Array(n).fill(0);
  for (const s of segs) {
    let lane = 0;
    while (lane < maxLanes && lanes[lane]?.slice(s.col, s.col + s.span).some(Boolean)) lane++;
    if (lane >= maxLanes) {
      for (let c = s.col; c < s.col + s.span; c++) hidden[c]++;
      continue;
    }
    lanes[lane] ??= new Array(n).fill(false);
    for (let c = s.col; c < s.col + s.span; c++) lanes[lane][c] = true;
    bars.push({ ...s, lane });
  }
  return { bars, hidden };
}
