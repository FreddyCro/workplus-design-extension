// 路由：網址維持 /key/<KEY>/issues?layout=<layout>[&issue=<serialNumber>]，和原介面的路徑相容。
// timeline 和 gantt 重複，先隱藏（程式碼保留，加回這裡即恢復）
export const LAYOUTS = ['list', 'board', 'calendar', 'gantt'];
const DEFAULT_LAYOUT = 'board';

export function readRoute(url) {
  const m = url.pathname.match(/^\/key\/([^/]+)/);
  const key = m ? decodeURIComponent(m[1]) : null;
  const wanted = url.searchParams.get('layout');
  const layout = LAYOUTS.includes(wanted) ? wanted : DEFAULT_LAYOUT;
  const issue = url.searchParams.get('issue') || null;
  return { key, layout, issue };
}

export function writeLayout(layout) {
  const url = new URL(location.href);
  url.searchParams.set('layout', layout);
  history.replaceState(null, '', url);
}

// 開彈出視窗用 pushState，關閉用 back 或 replaceState，讓瀏覽器上一頁也能關
export function writeIssue(serialNumber) {
  const url = new URL(location.href);
  if (serialNumber) {
    url.searchParams.set('issue', serialNumber);
    history.pushState({ issue: serialNumber }, '', url);
  } else {
    url.searchParams.delete('issue');
    history.replaceState(null, '', url);
  }
}

export function projectUrl(key, layout) {
  return `/key/${encodeURIComponent(key)}/issues?layout=${encodeURIComponent(layout)}`;
}
