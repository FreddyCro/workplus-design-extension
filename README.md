# workplus-design-extension

用 Chrome extension 在原本的 WorkPlus API 上換一層自己的介面：外觀仿 Plane，功能補上 WorkPlus 沒有的 **List、看板（拖曳改狀態）、Calendar（拖曳改到期日）、Gantt（拖拉改到期日）、Timeline、issue 彈出視窗**。只用 WorkPlus 的 GraphQL API，不架後端、不 build。

## 運作方式

- `rules/block-spa.json`：開關打開時，用 declarativeNetRequest 擋掉 WorkPlus 原本的 `main.*.js`，原介面不會啟動
- `src/content.js`：`document_start` 執行，開關打開時建 Shadow DOM，再用 `import()` 載入 `src/app/main.js`
- `src/app/`：進入點、路由（`?layout=list|board|calendar|gantt|timeline&issue=<序號>`）、Plane 風格的外殼（頂欄、icon rail、專案面板、header、Display 選單）、設計 token
- `src/layouts/`：`list.js`、`board.js`（拖曳改狀態）、`calendar.js`（拖曳改到期日）、`gantt.js`（拖拉改到期日）、`timeline.js`（Epic + Milestone）、`issue-peek.js`（彈出視窗：描述、留言、活動、屬性）
- `src/ui/`：`issue-card.js`（卡片與 chip）、`markdown.js`（安全的 Markdown → DOM，只用 textContent）、`modal.js`、`toast.js`、`guard.js`（寫入保險）
- `src/timeline/`：時間軸引擎。`scale.js`（刻度）、`layout.js`（條與箭頭的座標）、`drag.js`（拖拉換算）是純函式；`chart.js` 是 DOM
- `src/api.js`：WorkPlus GraphQL client，格式見 [docs/api-notes.md](docs/api-notes.md)
- `src/popup.*`：工具列開關，同步切換擋 JS 規則和 content script，並重新整理分頁

改 `src/app`、`src/layouts`、`src/timeline`、`src/api.js` 只要重新整理頁面；改 `manifest.json`、`src/content.js`、`rules/` 才要重新載入 extension。

### 設計與計劃

- 設計：`temp/2026-11-12-plane-skin-gantt-design.md`
- 實作計劃：`temp/2026-11-12-plane-skin-gantt-plan.md`（第一階段）、`temp/2026-11-12-plane-fidelity-calendar-modal-plan.md`（第二階段：外觀、Calendar、彈出視窗、看板拖曳、List）
- 評估：[docs/evaluation.md](docs/evaluation.md)

（`temp/` 在 .gitignore，只在本機。）

## 安裝

1. Chrome 開 `chrome://extensions`，打開右上角「開發人員模式」
2. 「載入未封裝項目」→ 選這個資料夾
3. 工具列 popup 打開「使用新介面」

## 測試

```
node --test "test/**/*.test.js"
```

Node 24 內建的 test runner，不需要安裝任何東西。測試假設時區是 `Asia/Taipei`（`test/api.test.js` 第一個測試會檢查）；不是的話 PowerShell 用 `$env:TZ='Asia/Taipei'; node --test "test/**/*.test.js"`。Windows 上 `node --test test/` 會把目錄當檔案，要用上面的 glob 寫法。

## 本機預覽（dev/）

不用連 WorkPlus、不用重新載入 extension，直接在本機跑 `src/` 的介面，適合調樣式。

```
node dev/server.mjs        # http://127.0.0.1:5180/
```

- `dev/index.html` 照 `content.js` 的流程掛 Shadow DOM，`chrome.storage` 換成 localStorage
- `POST /api` 依查詢內容回傳錄好的 fixture；寫入（拖曳改狀態、改到期日）一律回假成功，重新整理就恢復
- 改 `src/` 存檔後頁面自動重新整理
- 內建假資料專案 `DEMO`（`dev/fixtures-sample/DEMO.json`，日期以產生當天為準，舊了就跑 `node dev/make-sample.mjs` 重產）
- 有 `dev/fixtures/workplus-static/`（WorkPlus 原頁 CSS 快照）就一併載入，讓頁面外圍環境和線上一致

### 錄真實資料

1. 先跑 `node dev/server.mjs`
2. Chrome 開 `https://workplus.synology.inc/key/DG/issues`
3. DevTools → Console，左上角 context 從「top」改成「WorkPlus Design Extension」
4. 貼上 `dev/record.js` 全部內容執行（只讀，不送 mutation）；要錄多個專案改檔頭的 `KEYS`
5. 資料會直接寫到 `dev/fixtures/DG.json`，頁面自動重新整理；開 `http://127.0.0.1:5180/key/DG/issues`

`dev/fixtures/` 含同事姓名、issue 內容，已在 `.gitignore`，不要 commit。

## Gantt 的資料模型

- WorkPlus 的 Issue **沒有開始日期**，只有 `dueDate`。所以比照 Plane「只有終點」的畫法：固定 60px 的條、右端貼齊到期日，拖移和右端拉伸都只改 `dueDate`
- 已完成且沒有 `dueDate` 的 issue 用 `doneDate` 畫灰條
- 沒有任何日期的 issue 只列在左側欄，「顯示無日期」可以藏起來
- 里程碑的 `endDate` 與 stages 畫成虛線，預設不顯示已關閉的
- `BLOCKS` / `BLOCKED_BY` 畫成箭頭（唯讀）
- 要有真正的開始日期，得建 `DATE` 型別的自訂欄位，會動到共用的 schema，見 [docs/evaluation.md](docs/evaluation.md)

### 寫入保險

`src/ui/guard.js` 的 `WRITABLE_IDS` 目前只允許寫 **DG-90（955801）**；看板、月曆、Gantt 的拖曳對其他 issue 都會退回並顯示錯誤。確認要正式使用時，把 `WRITABLE_IDS` 設成 `null`。

## 驗證清單

| 檢查 | 期望 |
| --- | --- |
| 開關關閉，開 `https://workplus.synology.inc/key/DG/issues` | 原介面正常，Console 有 `[wp-skin] content script loaded` |
| 打開開關 | 分頁重新整理，Plane 風格外殼：左側欄列出專案、header 有 List / Board / Gantt / Timeline |
| Board | To do / In Process / Done 三欄（原型卡片：優先度 pill、第一個 label 當專案類型、到期狀態四級），DG 是 19 / 2 / 66，header 顯示 87；工具列切「上下排列」後變成一列一列，點列在下方就地展開（同時只一列），重新整理後仍是上下 |
| Gantt | 87 列、68 條（66 條灰色已完成）；捲到 2023/8 可見 DG-74 的條右端在 8/18、DG-79 / 80 在 8/28；今天有一條藍線 |
| Gantt 工具列 | Week / Month 切換 header；「今天」捲回今天；「顯示無日期」關掉後 68 列；「顯示已關閉的里程碑」打開後 2022/7/31 有 `1.5.0-design guide` 虛線 |
| Gantt 拖拉（只動 DG-90） | 拖移或拉右端：條移動、右下角 toast、原介面活動紀錄只多一筆 due date；拖回原位或按 Esc 不送請求；拖其他 issue 會退回並顯示紅色錯誤 |
| Timeline | 列 = Epic + 同時有開始與到期日的 issue（開始日期讀描述尾端的 `**開始日期**：YYYY-MM-DD`）；DG-90 填好後會出現一條，點側欄標題開視窗；都沒有時顯示空狀態，里程碑線同上 |
| 開始日期（只讀） | 在原生介面給 DG-90 填到期日、描述最後一行寫 `**開始日期**：2026-11-01` → Gantt 的 DG-90 變成從 11/1 到到期日的長條（不能拖，tooltip 不變）、Timeline 多一列；把那行改成 `開始日期: 2026/11/3` 也讀得到；日期晚於到期日時退回固定寬度的條 |
| 側欄 | 點其他專案切換；收合後重新整理仍收合 |
| 重新整理 | `?layout=` 和 Week / Month 等偏好都保留 |
| 外殼 | 頂欄沒有 AI assistant；左側 rail（Work / Settings）隱藏，專案面板用 header 第一顆 icon 開關；側欄與頂欄顏色不變，內容區是原型配色（畫布 `#f5f5f3`、主色 `#5094dc`）；頂欄搜尋框即時過濾（輸入 filter → 4 張）；rail 的 Work 或 header 第一顆 icon 開關專案面板，重新整理後保持；Display 選單依 layout 顯示選項 |
| 篩選列 | header 下方：成員頭像多選（不選 = 全部、選了顯示「已選 N 位」）、專案類型（label）下拉、日期區間（只填一端只限一端）；header 計數變成 `N / 87`；List / Board / Calendar / Gantt 都會被篩，Timeline 隱藏篩選列 |
| 討論用欄位 | header「Add work item」、看板欄的「+ New work item」、行事曆面板的「+」、issue 視窗的「編輯任務」都開得了表單；每個欄位標「WorkPlus 欄位」或「討論中」；所有輸入 disabled、Tab 跳不進、送出鈕停用；Esc 只關表單、底下的 issue 視窗還在 |
| List | 依狀態分組 19 / 2 / 66，可收合；點列開彈出視窗 |
| 彈出視窗 | 點卡片 → 網址多 `&issue=49`、單欄原型版面：狀態 / 類型 / 優先度 / 到期 chip、連結按鈕（描述有 figma.com 才可點）、時程條（三格討論中）、屬性 pill、描述預設 3 行可展開、左「進度紀錄」= 留言 3、右「項目紀錄」討論中、底部「活動 11」預設收合；Esc、背景、×、上一頁都會關閉並清掉參數；重新整理會重開 |
| Calendar | 週日開頭、固定 6 列（2026-11 第一格是 11/1）；‹ 今天 › 換月；小卡底色 = 負責人、左框 = 優先度、最多 3 筆再「+N 項」、已完成劃掉；有留言的日子右上 `●N`；點格子選取並打開右側面板（當日截止 / 14 天內，可收合；面板開關重新整理後保持）；拖小卡到別天（只動 DG-90）→ toast、活動紀錄一筆 dueDate；拖回同一天不送請求 |
| 看板拖曳 | 拖 DG-90 到別欄 → toast、活動紀錄一筆 status；同欄不送；拖其他 issue 退回並顯示紅色錯誤 |
| 再關掉開關 | 重新整理後原介面恢復 |

## 進度

| # | 階段 | 狀態 |
| --- | --- | --- |
| 1 | API 偵察 | ✅ 多條件 AND 篩選仍未找到格式 |
| 2 | 認證確認 | ✅ 只靠 cookie |
| 3–6 | Extension 骨架、擋 SPA、API client、看板 | ✅ |
| 7 | ES module 化、Plane 外殼 | ✅ |
| 8 | Gantt（唯讀 + 拖拉改到期日） | ✅ |
| 9 | Timeline（Epic + Milestone） | ✅ 唯讀 |
| 10 | 評估 | ✅ [docs/evaluation.md](docs/evaluation.md) |
| 11 | 第二階段：Plane 外觀貼近、List、Calendar、彈出視窗、看板拖曳 | ✅ |
| 12 | 第三階段：設計師原型的版面與配色、篩選列、行事曆面板、討論用欄位 | ✅ |
| — | 實驗專案 + 自訂欄位、建 issue、彈出視窗內編輯、深色主題 | 待做 |

`archive/gitlab-oauth-poc/` 是這個目錄原本的 GitLab OAuth 驗證程式，保留備查。
