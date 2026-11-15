// 錄 fixture：在線上 WorkPlus 跑一遍 app 會打的 API（只讀，不送任何 mutation），存成 dev/fixtures/<KEY>.json。
//
// 用法：
//   1. 本機先跑 `node dev/server.mjs`（錄好會直接送進去；沒跑就改成下載檔案，再自己放到 dev/fixtures/）
//   2. Chrome 開 https://workplus.synology.inc/key/DG/issues，extension 開關打開或關閉都可以
//   3. DevTools → Console，左上角的 context 下拉選單從「top」改成「WorkPlus Design Extension」
//      （在 extension 的環境執行，才能用 chrome.runtime.getURL 載入 src/api.js，也不受頁面 CSP 影響）
//   4. 把這整個檔案貼上執行。要錄多個專案就改下面的 KEYS
//
// 錄到的資料含同事姓名、issue 內容等內部資訊；dev/fixtures/ 已在 .gitignore，不要 commit。
(async () => {
  const KEYS = null; // null = 目前網址的專案；或 ['DG', 'XX']
  const WITH_DETAILS = true; // 每張 issue 的描述、留言、活動（彈出視窗用）
  const DEV_SERVER = 'http://127.0.0.1:5180';
  const TAG = '[wp-skin record]';

  if (!globalThis.chrome?.runtime?.getURL) {
    console.error(TAG, 'Console 的 context 要選「WorkPlus Design Extension」，不是 top');
    return;
  }
  const keys = KEYS ?? [location.pathname.match(/^\/key\/([^/]+)/)?.[1]].filter(Boolean).map(decodeURIComponent);
  if (!keys.length) {
    console.error(TAG, '網址不在專案底下（/key/<KEY>/…），請設定 KEYS');
    return;
  }

  const api = await import(chrome.runtime.getURL('src/api.js'));
  const entries = [];
  const origFetch = globalThis.fetch;
  // 只記錄 api.js 送到 /api 的查詢；有 errors 的回應不存，免得 fixture 裡留著錯誤
  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    const isApi = url.pathname === '/api' && typeof init?.body === 'string';
    const { query, variables } = isApi ? JSON.parse(init.body) : {};
    // 送出前就擋：錄資料時絕不能寫入
    if (isApi && /^\s*mutation\b/.test(query)) throw new Error('record.js 不應該送出 mutation');
    const res = await origFetch(input, init);
    if (isApi) {
      const json = await res.clone().json();
      if (!json.errors?.length) entries.push({ query, variables: variables ?? null, response: json });
    }
    return res;
  };

  try {
    console.log(TAG, `錄 ${keys.join(', ')}…`);
    await api.me();
    await api.listProjects();
    for (const key of keys) {
      const project = await api.projectByKey(key);
      const issues = await api.listIssues(project.id);
      await api.listMilestones(project.id);
      await api.listEpics(project.id);
      console.log(TAG, `${key}：${issues.length} 張 issue`);
      if (WITH_DETAILS) {
        for (let i = 0; i < issues.length; i += 5) {
          await Promise.all(issues.slice(i, i + 5).map((x) => api.issueDetail(x.id)));
          console.log(TAG, `${key} 詳細資料 ${Math.min(i + 5, issues.length)} / ${issues.length}`);
        }
      }
    }
  } finally {
    globalThis.fetch = origFetch;
  }

  const name = keys.join('+');
  const body = JSON.stringify({ recordedAt: new Date().toISOString(), origin: location.origin, keys, entries });
  console.log(TAG, `共 ${entries.length} 筆查詢，${(body.length / 1024).toFixed(0)} KB`);

  try {
    const res = await origFetch(`${DEV_SERVER}/__fixtures?name=${encodeURIComponent(name)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    console.log(TAG, `已送到 dev server → ${(await res.json()).file}`);
  } catch (err) {
    console.warn(TAG, `送不到 dev server（${err.message}），改用下載；請把 ${name}.json 放到 dev/fixtures/`);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([body], { type: 'application/json' }));
    a.download = `${name}.json`;
    document.documentElement.appendChild(a);
    a.click();
    a.remove();
  }
})();
