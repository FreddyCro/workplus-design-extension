// 彈出視窗容器：背景、Esc、關閉鈕。內容由呼叫端提供。
// side 為 null 時單欄；stack 為 true 時疊在既有視窗上面（Esc 只關最上層）。
import { el } from '../app/dom.js';
import { icon } from '../app/icons.js';

export const MODAL_CSS = `
  .backdrop { position: fixed; inset: 0; z-index: 50; background: rgb(0 0 0 / 28%); display: flex; align-items: center; justify-content: center; padding: 24px; backdrop-filter: blur(2px); }
  .backdrop.stacked { z-index: 60; background: rgb(0 0 0 / 35%); }
  .modal { width: min(1100px, 100%); height: min(760px, 100%); background: var(--bg-surface-1); border-radius: var(--radius-xl); box-shadow: var(--shadow-modal);
           display: flex; flex-direction: column; overflow: hidden; }
  .modal.single { height: auto; max-height: 90vh; }
  .modal .mhead { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid var(--border-subtle); font-size: 12px; color: var(--txt-3); }
  .modal .mhead .spacer { flex: 1; }
  .modal .mbody { flex: 1; min-height: 0; display: grid; grid-template-columns: 1fr 300px; }
  .modal.single .mbody { display: flex; flex-direction: column; }
  .modal .mmain { overflow: auto; padding: 20px 24px; min-width: 0; }
  .modal.single .mmain { flex: 1; min-height: 0; }
  .modal .mside { overflow: auto; border-left: 1px solid var(--border-subtle); padding: 16px; background: var(--bg-surface-2); }
`;

export function openModal(root, { label, content, side = null, onClose, width = 1100, stack = false }) {
  if (!stack) root.querySelector('.backdrop')?.remove();
  const backdrop = el('div', `backdrop${stack ? ' stacked' : ''}`);
  const modal = el('div', `modal${side ? '' : ' single'}`);
  modal.style.width = `min(${width}px, 100%)`;
  const head = el('div', 'mhead');
  head.append(...label, el('span', 'spacer'));
  const close = el('button', 'iconbtn');
  close.title = '關閉（Esc）';
  close.append(icon('close'));
  head.append(close);
  const body = el('div', 'mbody');
  const main = el('div', 'mmain');
  main.append(content);
  body.append(main);
  if (side) {
    const aside = el('div', 'mside');
    aside.append(side);
    body.append(aside);
  }
  modal.append(head, body);
  backdrop.append(modal);
  root.append(backdrop);

  const doClose = () => {
    backdrop.remove();
    window.removeEventListener('keydown', onKey);
    onClose?.();
  };
  const isTop = () => {
    const all = root.querySelectorAll('.backdrop');
    return all[all.length - 1] === backdrop;
  };
  const onKey = (e) => {
    if (e.key === 'Escape' && isTop()) doClose();
  };
  close.addEventListener('click', doClose);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) doClose();
  });
  window.addEventListener('keydown', onKey);
  return { close: doClose, element: modal, backdrop };
}
