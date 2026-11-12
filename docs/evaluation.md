# 評估：Plane 皮 + WorkPlus API 的可行性（2026-11-12）

## 做到了什麼

- Plane 風格的外殼（側欄、header、layout 切換），只用 Plane 的 token 數值，程式自己寫，沒有 AGPL 的問題。
- 看板、Gantt（拖拉改到期日）、Timeline（Epic + Milestone）都只靠 WorkPlus 的 GraphQL API，沒有後端。
- 純邏輯（刻度、版面、拖拉換算）有 43 個 node 測試；DOM 用 Chrome MCP 在 DG 專案實測。

## API 缺口

| 缺口 | 影響 | 可能的解法 |
|---|---|---|
| Issue 沒有 startDate | Gantt 只能畫「只有終點」的條，沒有真正的時程長度 | 建 `DATE` 自訂欄位「Start Date」。欄位型別是全域的、schema `Workplus Default Template` 是共用的，要先取得同意。程式已留 `startSource`，接上約半天（左端拉伸 + 寫 `customFields`） |
| 多條件 AND 篩選格式未知 | 所有篩選都在前端做，大專案要抓全部 issue | 從原前端打包檔反查 `IssueSearchNode` 的格式，或用已存的 `searchFilter` |
| 兩段式載入 50 張一頁 | 87 張約 4 個請求；千張等級會明顯慢 | 用 `issueSearchByFilter` 配合已存篩選、或只抓有日期的 issue（需要 `dueDate` 的條件格式） |
| Milestone 多半沒有 endDate | Timeline 的里程碑線很少 | 這是資料問題，不是 API 問題；可以改用 stages 的 dueDate |
| DG 沒有 Epic | Timeline 在 DG 上是空的 | 換一個有 Epic 的專案驗證 Epic 條與 progress |

## 維護成本

- **WorkPlus 改版**：`api.js` 的 `expectArray` 會丟出清楚的錯誤，畫面顯示「載入失敗」並提示從 popup 關掉新介面，不會卡死。Schema 有 introspection，改版後對照 `docs/api-notes.md` 修 query 即可。
- **擋 SPA 的規則**依賴 `main.<hash>.js` 的命名，原前端換打包方式就要改 `rules/block-spa.json`。
- **不 build 的代價**：沒有型別檢查、CSS 用字串常數。目前 15 個檔案還好；超過 30 個檔案再考慮加輕量的 bundler。
- **Chrome MCP 驗證**可以自動化大部分檢查，但 extension 重新載入和 popup 開關還是要人按。

## 第二階段（2026-11-12 下午）補充

- 已補：List、Calendar（拖曳改到期日）、看板拖曳改狀態、issue 彈出視窗（唯讀）、外觀依 Plane 截圖重做。
- **建 issue 還沒做**：`createIssue` 需要 `title / type / status / priority / reporter / confidentiality / area` 七個必填欄位，要做表單；「Add work item」按鈕先停用。
- 彈出視窗目前唯讀。狀態、指派、到期日的寫入路徑都已經有（`updateStatus` / `updateDueDate`），在視窗裡加下拉選單約半天；指派人要查使用者列表（`user` 查詢），並遵守「只能指派給自己」的規則做測試。
- 描述和留言的附件圖片已可顯示（`/file/static?id=…&filename=…`）；影片尚未處理。

## 建議的下一步（依價值排序）

1. **開始日期自訂欄位**：決定要不要建。建了 Gantt 才有真正的時程。
2. **彈出視窗內編輯**（狀態、指派、到期日、留言）與**建 issue 表單**：要完整取代原介面的最後一哩。
3. **附件影片**：原前端對 video/ 用 `<video>`，彈出視窗目前只處理圖片。
4. **大專案效能**：虛擬化列表或只抓有日期的 issue。
5. **深色主題**：token 已經抽出來，補一組 `:host([data-theme="dark"])` 的值即可。

## 要不要繼續擴大

可以。API 的能力足夠（讀寫 issue、epic、milestone、relation、自訂欄位都有），主要風險是 startDate 要動共用 schema，以及大專案的載入效能。建議先在 DG 和另一個有 Epic 的專案用兩週，再決定要不要推給其他人。
