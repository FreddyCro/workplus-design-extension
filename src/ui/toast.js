import { el } from '../app/dom.js';

// 右下角提示，4 秒後消失。root 是 Shadow DOM 的 root。
export function toast(root, message, { kind = 'info' } = {}) {
  root.querySelector('.toast')?.remove();
  const t = el('div', `toast ${kind}`, message);
  root.append(t);
  setTimeout(() => t.remove(), 4000);
  return t;
}
