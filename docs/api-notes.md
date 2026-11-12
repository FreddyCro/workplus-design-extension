# WorkPlus API 筆記

2026-11-12 在 DG 專案（project id `1312`）實測。

## 基本

- 端點：`POST https://workplus.synology.inc/api`，**GraphQL**（原前端用 Apollo Client 2.6）
- 請求：`Content-Type: application/json`，body 為 `{ query, variables, operationName? }`
- 認證：只靠登入後的 cookie。**不需要 CSRF token 或其他 header**，查詢和 mutation 都一樣
- 在同網域用 `fetch('/api', …)` 即可呼叫，不必經過原前端
- **Introspection 有開**：`__schema`、`__type` 可以查到完整 schema
- 有官方的 `createToken` / `token`（個人 API token），之後若要在 extension 以外的地方呼叫可以研究

```js
const gql = async (query, variables) =>
  (await fetch('/api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })).json();
```

## 讀取

### Issue 列表（兩段式，原前端的做法）

1. `issueSearch` 取 ID 和基本欄位：

```graphql
query issueBriefByQuery($params: IssueSearchInput, $offset: OffsetInput) {
  issueSearch(params: $params, offset: $offset) {
    totalCount
    nodes { id title serialNumber confidentiality createdDate updatedDate resolvedDate
            doneDate dueDate priority customFields concealed project { id role archived } }
  }
}
```

```json
{
  "params": { "conditions": { "type": "EQUALITY_COMPARISON", "comparator": "EQ", "field": "PROJECT", "value": "1312" } },
  "offset": { "sortBy": "serialNumber", "order": "DESC", "offset": 0, "pageSize": 50 }
}
```

2. `issue(params: { ids })` 批次取關聯欄位：

```graphql
query issueDetails($ids: [ID!], $offset: OffsetInput) {
  issue(params: { ids: $ids }, offset: $offset) {
    nodes {
      id
      status { id name category { id name } }
      project { id name key archived role projectGroup { id name } }
      reporter { id identity account }
      assignee { id identity account }
      type { id name }
      milestone { id name endDate closed }
      area { id name }
      labels { id text color level }
      watched
    }
  }
}
```

- 日期是毫秒 timestamp；`priority` 是 enum（例如 `MEDIUM`）

### 篩選

- `conditions` 是 JSON scalar，introspection 看不到結構
- 已確認可用：`{ type: "EQUALITY_COMPARISON", comparator: "EQ", field: "PROJECT" | "STATUS", value }`
- 前端打包檔裡還有 `COMPARATIVE_COMPARISON`、`INCLUDE_REGULAR_EXPRESSION`
- **待查**：多個條件的組合（AND）。試過 `LOGICAL_OPERATION`、`AND`、`LOGICAL` 都回 `invalid condition node type`
- 已存的篩選條件用 `issueSearchByFilter(params: { id, projectId, tzOffset })`，條件內容可以用 `searchFilter` 查到

### 專案設定

| 用途 | 查詢 | DG 的結果 |
|---|---|---|
| 目前使用者 | `userProfile { id identity account }` | freddyyang = `2244` |
| 專案可用的狀態和類型 | `project(params: { key: "DG" }) { nodes { schema { status { id name category { name } } types { id name } } } }` | 狀態 `1` To do、`16` In Process、`25` Done；類型 `1` Bug、`2` Feature、`4` Task |
| 區域 | `projectArea(params: { project: "1312" }) { nodes { id name assignees { statusCategory { name } assignee { id account } } } }` | `8046` general，四種狀態分類的自動指派人都是空的 |
| 全部狀態 | `status { nodes { id name category { id name } } }` | 37 個全域狀態，**看板要用專案 schema 的狀態，不是這個** |

狀態分類（category）：`1` new、`2` in_process、`3` resolved、`4` done。

## 寫入

### 建立 issue

```graphql
mutation($p: IssueCreateInput!) { createIssue(params: $p) { id serialNumber } }
```

必填：`title`、`type`、`status`、`priority`、`reporter`、`confidentiality`、`area`，再加上 `project` 或 `projectKey` 其中一個。

### 更新 issue（改狀態）

```graphql
mutation($id: ID, $p: IssueUpdateInput!) {
  updateIssue(id: $id, params: $p) { modifiedCount backgroundTaskId }
}
```

```json
{ "id": "955801", "p": { "status": "16", "autoAssignee": false } }
```

- 成功時 `modifiedCount: 1`，原介面的活動紀錄會正確寫入
- **只送有變的欄位**：如果帶上沒變的 `assignee`，活動紀錄會多一筆「changed the assignee to X → X」
- **一律帶 `autoAssignee: false`**：區域可以依狀態分類設定自動指派人，改狀態時可能被自動改指派
- `updateIssue` 也支援 `ids`（批次），另外有 `updateIssueWithConditions`、`updateIssueWithFilter`

## 其他可用的功能（schema 裡有，原介面沒明顯入口）

`epic` / `createEpic`、`issueRelation` / `createIssueRelation`、`report` / `reportSetting`、`customFieldType` / `createCustomField`、`projectSchema`（狀態工作流）。

## 測試資料

- DG-90「[wp-skin] API 測試，請忽略」（id `955801`），指派人和回報人都是 freddyyang，目前狀態 To do

## 2026-11-12 補充：Gantt / Timeline 需要的欄位

### Issue 的日期欄位

- `Issue` 只有 `createdDate`、`updatedDate`、`dueDate`、`resolvedDate`、`doneDate`。**沒有 startDate**。
- `IssueUpdateInput.dueDate: Timestamp` 可寫，可送 `null` 清掉。
- `dueDate` 的值一律是**當地（UTC+8）00:00** 的毫秒 timestamp，例如 2023-12-15 → `1702569600000`。寫入也要照這個慣例（`new Date(y, m, d).getTime()`）。
- 實測 `updateIssue(id: "955801", params: { dueDate, autoAssignee: false })`：活動紀錄只多一筆 `dueDate` 變更，指派人不變。
- DG 的 87 張：22 張有 dueDate、66 張有 doneDate、0 張有 epic、前 50 張裡 28 張有 milestone、2 張有 relation。

### Epic

```graphql
query ($p: EpicReadInput) {
  epic(params: $p) { nodes { id name startDate dueDate status progress { all closed } } }
}
# variables: { "p": { "project": "1312" } }
```

- `status` 是 `OPEN | CLOSE`；`EpicCreateInput` / `updateEpic` 都有 `startDate`、`dueDate`。
- DG 沒有 epic。

### Milestone

```graphql
query ($p: MilestoneReadInput) {
  milestone(params: $p) { nodes { id name endDate closed level stages { name dueDate order } progress { all closed } } }
}
# variables: { "p": { "projectId": "1312" } }   ← 不是 project
```

- DG 有 17 個，大多 `closed: true` 且 `endDate: null`；只有 `1.5.0-design guide` 有 endDate（2022-07-31）。

### Issue relation

- `Issue.issueRelations { count nodes { type target { id serialNumber } } }`（沒有 `totalCount`）。
- `IssueRelationType`：`BLOCKS / BLOCKED_BY / RELATES_TO / COPIED_BY / COPIES_TO / DUPLICATES_TO / DUPLICATED_BY`，兩邊都會各有一筆鏡像。
- `createIssueRelation(params: { src, target, type })`、`deleteIssueRelation(id)` 存在，尚未實測。

### 自訂欄位（若要加「開始日期」）

- `FieldTypeEnum`：`TEXT NUMBER DATE USER SINGLE_SELECT MULTI_SELECT`，`createCustomField(params: { name, type, meta })` 建的是**全域**的欄位型別。
- DG 用的 schema 是 `Workplus Default Template`（schema id `2`，`customFields: []`），和其他專案共用；要加欄位會影響所有用這個 schema 的專案，**先問過再動**。
- 寫入：`updateIssue(params: { customFields: [{ typeId, value }] })`。

### 活動紀錄

- `Issue.activities { id createTime category sender params }`，`params` 是 JSON（`latest` / `changes` / `issueId` …）。可以直接查，不必切回原介面看。

### 專案列表

- `project(params: { archived: false }) { nodes { id key name } }`，freddyyang 看得到 7 個。`Project` 沒有 `starred` 欄位（有 `watched`）。

### 彈出視窗用到的欄位（第二階段）

- `Comment { id author { account nickname } descriptionMd createdDate }`；`Issue.comments`、`Issue.activities { createTime category params sender { account } }` 直接在 `issue(params: { ids })` 裡查。
- 描述與留言裡的附件寫成 `$$attachment ![檔名](附件 id)$$`，id 不是網址；下載路徑待查。
- `Activity.params.data` 的形狀：建立時是 `{ value: {...全部欄位} }`，變更時是 `{ latest: { 欄位 }, changes: { 欄位 } }`，留言是 `{ commentId }`。
- `Label { id text color }`，`IssueType { id name }`，`IssuePriority`：`LOW MEDIUM HIGH CRITICAL`。
- `updateIssue(id, { status, autoAssignee: false })` 改狀態：活動紀錄只多一筆 status（DG-90 實測）。

### 附件圖片的網址（2026-11-12 從原前端 bundle 反查）

- `/file/static?id=<附件 id>&filename=<encodeURIComponent(檔名)>`，**不帶 filename 會 404**。
- 描述 / 留言裡的 `$$attachment ![檔名](附件 id)$$`，檔名就在 `![…]` 裡；原前端用副檔名判斷 image/ 或 video/。
- 實測 DG-49 留言的 `強制比例.PNG`：200、image/png、907×873。
