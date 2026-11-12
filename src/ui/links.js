// 從描述文字抓連結（純函式）。本階段只辨識 Figma。
// 只收 ASCII 的網址字元（中文描述常把網址和文字黏在一起），再去掉結尾的標點。
const FIGMA = /https?:\/\/(?:www\.)?figma\.com\/[\x21-\x7e]*/i;

export function findFigmaUrl(md) {
  if (!md) return null;
  const m = md.match(FIGMA);
  if (!m) return null;
  let url = m[0];
  // markdown 連結的右括號、引號、以及句尾標點不算網址
  url = url.replace(/[)\]>"'].*$/, '');
  url = url.replace(/[.,;:!?]+$/, '');
  return url || null;
}
