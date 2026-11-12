// 彈出視窗容器：背景、Esc、關閉鈕。內容由呼叫端提供。
import { el } from '../app/dom.js';
import { icon } from '../app/icons.js';

export const MODAL_CSS = `
  .backdrop { position: fixed; inset: 0; z-index: 50; background: rgb(0 0 0 / 35%); display: flex; align-items: center; justify-content: center; padding: 24px; }
  .modal { width: min(1100px, 100%); height: min(760px, 100%); background: var(--bg-surface-1); border-radius: var(--radius-lg); box-shadow: 0 16px 48px rgb(0 0 0 / 25%);
           display: flex; flex-direction: column; overflow: hidden; }
  .modal .mhead { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-bottom: 1px solid var(--border-subtle); font-size: 12px; color: var(--txt-3); }
  .modal .mhead .spacer { flex: 1; }
  .modal .mbody { flex: 1; min-height: 0; display: grid; grid-template-columns: 1fr 300px; }
  .modal .mmain { overflow: auto; padding: 20px 24px; min-width: 0; }
  .modal .mside { overflow: auto; border-left: 1px solid var(--border-subtle); padding: 16px; background: var(--bg-surface-2); }
`;

export function openModal(root, { label, content, side, onClose }) {
  root.querySelector('.backdrop')?.remove();
  const backdrop = el('div', 'backdrop');
  const modal = el('div', 'modal');
  const head = el('div', 'mhead');
  head.append(...label, el('span', 'spacer'));
  const close = el('button', 'iconbtn');
  close.title = '關閉（Esc）';
  close.append(icon('close'));
  head.append(close);
  const body = el('div', 'mbody');
  const main = el('div', 'mmain');
  const aside = el('div', 'mside');
  main.append(content);
  aside.append(side);
  body.append(main, aside);
  modal.append(head, body);
  backdrop.append(modal);
  root.append(backdrop);

  const doClose = () => {
    backdrop.remove();
    window.removeEventListener('keydown', onKey);
    onClose?.();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') doClose();
  };
  close.addEventListener('click', doClose);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) doClose();
  });
  window.addEventListener('keydown', onKey);
  return { close: doClose, element: modal };
}
