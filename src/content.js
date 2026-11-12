// 在 document_start 執行。開關打開時，原本的 SPA 主程式已被 rules/block-spa.json 擋掉，
// 這裡把自己的 App 掛進 Shadow DOM，避免被 WorkPlus 原本的 CSS 影響。
// 實際的 App 是 ES module（src/app/main.js），用 import() 載入：改 src/app、src/layouts、
// src/timeline、src/api.js 只要重新整理頁面；改這個檔案、manifest.json、rules/ 才要重新載入 extension。
const TAG = '[wp-skin]';

console.log(TAG, 'content script loaded', location.pathname);

chrome.storage.local.get({ skinEnabled: false }).then(({ skinEnabled }) => {
  if (!skinEnabled) return;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }
});

function mount() {
  document.body.replaceChildren();
  const host = document.createElement('div');
  host.id = 'wp-skin-root';
  document.body.appendChild(host);
  const root = host.attachShadow({ mode: 'open' });
  console.log(TAG, 'app mounted');

  import(chrome.runtime.getURL('src/app/main.js'))
    .then(({ start }) => start(root))
    .catch((err) => {
      console.error(TAG, err);
      const msg = document.createElement('div');
      msg.style.cssText = 'font: 14px system-ui; padding: 16px; color: #cf222e;';
      msg.textContent = `載入失敗：${err.message}。可以從工具列關掉新介面，回到原本的 WorkPlus。`;
      root.replaceChildren(msg);
    });
}
