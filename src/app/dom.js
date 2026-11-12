// 一律用 textContent 放文字，issue 標題是使用者輸入，不能進 innerHTML
export function el(tag, className = '', text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function initials(account) {
  return (account ?? '?').slice(0, 2).toUpperCase();
}
