# workplus-design-extension

用 Chrome extension 在原本的 WorkPlus API 上換一層自己的介面。目前功能：**唯讀看板**，依專案的狀態分欄列出 issue。

## 運作方式

- `rules/block-spa.json`：開關打開時，用 declarativeNetRequest 擋掉 WorkPlus 原本的 `main.*.js`，原介面不會啟動
- `src/api.js`：WorkPlus GraphQL API client（`WP.me` / `WP.projectByKey` / `WP.listIssues`），格式見 [docs/api-notes.md](docs/api-notes.md)
- `src/content.js`：在 `document_start` 執行，開關打開時把看板掛進 Shadow DOM
- `src/popup.*`：工具列的開關，同時切換擋 JS 規則和 content script，並重新整理分頁

不需要 build，原始檔直接載入。

## 安裝

1. Chrome 開 `chrome://extensions`，打開右上角「開發人員模式」
2. 「載入未封裝項目」→ 選這個資料夾
3. 修改程式後，在 extensions 頁面按重新載入，再重新整理 WorkPlus 分頁

## 驗證

| 檢查 | 期望 |
| --- | --- |
| 開關關閉，開 `https://workplus.synology.inc/key/DG/issues` | 原介面正常，Console 有 `[wp-skin] content script loaded` |
| 工具列打開「使用新介面」 | 分頁自動重新整理，顯示 DG 看板：To do / In Process / Done 三欄，標題列有 issue 數和登入身分 |
| 點看板上的卡片 | 開到該 issue 的網址（新介面開著時仍是看板，要看原本的詳細頁請先關掉開關） |
| Network 分頁 | `main.*.js` 和 `vendors~main.*.js` 顯示 blocked |
| 開在非專案頁（例如 `/projects`） | 顯示「請進入某個專案的頁面」 |
| 再關掉開關 | 重新整理後原介面恢復 |

## 試做步驟

| # | 階段 | 狀態 |
| --- | --- | --- |
| 1 | API 偵察（[docs/api-notes.md](docs/api-notes.md)） | ✅ 複合篩選條件待查 |
| 2 | 認證確認 | ✅ 只靠 cookie，不需要 token |
| 3 | Extension 骨架 | ✅ |
| 4 | 擋掉原本的 SPA | ✅ 已寫，待實機驗證 |
| 5 | API client（唯讀） | ✅ |
| 6 | 看板畫面（唯讀） | ✅ 待實機驗證 |
| 7 | 拖拉改狀態 | 待做（測試用 issue：DG-90） |
| 8 | 評估 | 待做 |

`archive/gitlab-oauth-poc/` 是這個目錄原本的 GitLab OAuth 驗證程式，保留備查。
