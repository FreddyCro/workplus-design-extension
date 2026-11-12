// 在 document_start 執行。開關打開時，原本的 SPA 主程式已被 rules/block-spa.json 擋掉，
// 這裡把自己的 App 掛進 Shadow DOM，避免被 WorkPlus 原本的 CSS 影響。
// 目前功能：唯讀看板，依專案的狀態分欄列出 issue。WP（API client）由 src/api.js 提供。
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

const STYLE = `
  :host { all: initial; display: block; font: 14px/1.5 system-ui, sans-serif; color: #1f2328;
          background: #f6f7f9; min-height: 100vh; padding: 24px; box-sizing: border-box; }
  header { display: flex; align-items: baseline; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
  h1 { font-size: 20px; margin: 0; }
  .meta { color: #656d76; font-size: 13px; }
  .board { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(240px, 1fr); gap: 16px;
           overflow-x: auto; align-items: start; }
  .col { background: #eceef1; border-radius: 8px; padding: 12px; }
  .col h2 { font-size: 14px; margin: 0 0 8px; display: flex; justify-content: space-between; }
  .card { display: block; background: #fff; border-radius: 6px; padding: 8px 10px; margin-bottom: 8px;
          color: inherit; text-decoration: none; box-shadow: 0 1px 2px rgb(0 0 0 / 8%); }
  .card:hover { box-shadow: 0 2px 6px rgb(0 0 0 / 15%); }
  .card .id, .card .who { color: #656d76; font-size: 12px; }
  .card .who { margin-top: 4px; }
  .msg { padding: 16px; background: #fff; border-radius: 8px; }
  .error { color: #cf222e; }
`;

function mount() {
  document.body.replaceChildren();
  const host = document.createElement('div');
  host.id = 'wp-skin-root';
  document.body.appendChild(host);

  const root = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = STYLE;
  const app = document.createElement('div');
  root.append(style, app);
  console.log(TAG, 'app mounted');

  render(app).catch((err) => {
    console.error(TAG, err);
    app.replaceChildren(
      el('div', 'msg error', `載入失敗：${err.message}。可以從工具列關掉新介面，回到原本的 WorkPlus。`)
    );
  });
}

async function render(app) {
  const key = location.pathname.match(/^\/key\/([^/]+)/)?.[1];
  if (!key) {
    app.replaceChildren(
      el('div', 'msg', '請進入某個專案的頁面（網址是 /key/專案代碼/…），或從工具列關掉新介面。')
    );
    return;
  }
  app.replaceChildren(el('div', 'msg', `載入 ${key} 中…`));

  const [user, project] = await Promise.all([WP.me(), WP.projectByKey(key)]);
  const issues = await WP.listIssues(project.id);

  const header = el('header');
  header.append(
    el('h1', '', `${project.key} ${project.name}`),
    el('span', 'meta', `${issues.length} 張 issue · 登入身分 ${user.account} · 唯讀`)
  );

  const board = el('div', 'board');
  for (const status of project.schema.status) {
    const cards = issues.filter((i) => i.status?.id === status.id);
    const col = el('section', 'col');
    const h2 = el('h2');
    h2.append(el('span', '', status.name), el('span', 'meta', String(cards.length)));
    col.append(h2);
    for (const issue of cards) col.append(card(project.key, issue));
    board.append(col);
  }
  app.replaceChildren(header, board);
}

function card(projectKey, issue) {
  const a = el('a', 'card');
  a.href = `/key/${encodeURIComponent(projectKey)}/issues/${encodeURIComponent(issue.serialNumber)}`;
  a.append(
    el('div', 'id', `${projectKey}-${issue.serialNumber}`),
    el('div', '', issue.title),
    el('div', 'who', issue.assignee?.account ?? '未指派')
  );
  return a;
}

// 一律用 textContent 放文字，issue 標題是使用者輸入，不能進 innerHTML
function el(tag, className = '', text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
