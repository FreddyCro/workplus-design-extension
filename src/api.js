// WorkPlus GraphQL API client。格式見 docs/api-notes.md。
// 只靠登入 cookie，同網域直接 fetch('/api')。
// 所有回應都先檢查結構，WorkPlus 改版時要報出清楚的錯誤，而不是畫面空白。
// 以 ES module 輸出，src/app/main.js 透過 import() 載入；test/ 用 node --test 直接載入。
const PAGE_SIZE = 50;

class WorkPlusApiError extends Error {}

async function gql(query, variables) {
  const res = await fetch('/api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    // 參數格式錯誤時 WorkPlus 回 400，真正原因在 body 的 GraphQL errors 裡
    let detail = '';
    try {
      detail = JSON.parse(await res.text()).errors?.map((e) => e.message).join('; ') ?? '';
    } catch {
      // body 不是 JSON 就只報狀態碼
    }
    throw new WorkPlusApiError(`WorkPlus API HTTP ${res.status}${detail ? `：${detail}` : ''}`);
  }
  const json = await res.json();
  if (json.errors?.length) {
    throw new WorkPlusApiError(json.errors.map((e) => e.message).join('; '));
  }
  return json.data;
}

function expectArray(value, path) {
  if (!Array.isArray(value)) {
    throw new WorkPlusApiError(`回應格式不符：${path} 不是陣列，WorkPlus API 可能已改版`);
  }
  return value;
}

async function me() {
  const data = await gql('{ userProfile { id account } }');
  if (!data?.userProfile?.id) throw new WorkPlusApiError('取不到目前使用者，可能未登入');
  return data.userProfile;
}

async function projectByKey(key) {
  const data = await gql(
    `query ($p: ProjectReadInput) {
      project(params: $p) {
        nodes { id key name projectIdentity schema { status { id name category { id name } } types { id name } } }
      }
    }`,
    { p: { key } }
  );
  const project = expectArray(data?.project?.nodes, 'project.nodes')[0];
  if (!project) throw new WorkPlusApiError(`找不到專案 ${key}`);
  expectArray(project.schema?.status, 'project.schema.status');
  return project;
}

async function listIssueIds(projectId) {
  const ids = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const data = await gql(
      `query ($params: IssueSearchInput, $offset: OffsetInput) {
        issueSearch(params: $params, offset: $offset) { totalCount nodes { id } }
      }`,
      {
        params: {
          conditions: { type: 'EQUALITY_COMPARISON', comparator: 'EQ', field: 'PROJECT', value: projectId },
        },
        offset: { sortBy: 'serialNumber', order: 'DESC', offset, pageSize: PAGE_SIZE },
      }
    );
    const nodes = expectArray(data?.issueSearch?.nodes, 'issueSearch.nodes');
    ids.push(...nodes.map((n) => n.id));
    if (nodes.length < PAGE_SIZE || ids.length >= data.issueSearch.totalCount) return ids;
  }
}

async function issuesByIds(ids) {
  const issues = [];
  for (let i = 0; i < ids.length; i += PAGE_SIZE) {
    const data = await gql(
      `query ($ids: [ID!], $offset: OffsetInput) {
        issue(params: { ids: $ids }, offset: $offset) {
          nodes {
            id serialNumber title priority createdDate dueDate doneDate customFields epic
            status { id name category { id name } } assignee { id account }
            type { id name } labels { id text color } area { id name }
            milestone { id name endDate }
            issueRelations { count nodes { type target { id } } }
            comments { createdDate }
            descriptionMd
          }
        }
      }`,
      { ids: ids.slice(i, i + PAGE_SIZE), offset: { pageSize: PAGE_SIZE } }
    );
    issues.push(...expectArray(data?.issue?.nodes, 'issue.nodes'));
  }
  return issues;
}

async function listIssues(projectId) {
  return issuesByIds(await listIssueIds(projectId));
}

// WorkPlus 的 dueDate 慣例：當地（UTC+8）00:00 的毫秒 timestamp。month 從 0 起算。
function localMidnight(year, month, day) {
  return new Date(year, month, day).getTime();
}

// 只送 dueDate；autoAssignee: false 避免區域依狀態自動改指派人（見 docs/api-notes.md）
async function updateDueDate(id, dueDate) {
  const data = await gql(
    `mutation ($id: ID, $p: IssueUpdateInput!) {
      updateIssue(id: $id, params: $p) { modifiedCount }
    }`,
    { id, p: { dueDate, autoAssignee: false } }
  );
  if (data?.updateIssue?.modifiedCount !== 1) {
    throw new WorkPlusApiError(`更新到期日失敗：modifiedCount = ${data?.updateIssue?.modifiedCount}`);
  }
}

// 目前使用者看得到的未封存專案。實測 freddyyang 看得到 7 個；Project 沒有 starred 欄位。
async function listProjects() {
  const data = await gql(
    `query ($p: ProjectReadInput) { project(params: $p) { nodes { id key name } } }`,
    { p: { archived: false } }
  );
  return expectArray(data?.project?.nodes, 'project.nodes');
}

// 看板拖曳改狀態。只送 status；autoAssignee: false 避免區域依狀態自動改指派人。
async function updateStatus(id, status) {
  const data = await gql(
    `mutation ($id: ID, $p: IssueUpdateInput!) {
      updateIssue(id: $id, params: $p) { modifiedCount }
    }`,
    { id, p: { status, autoAssignee: false } }
  );
  if (data?.updateIssue?.modifiedCount !== 1) {
    throw new WorkPlusApiError(`更新狀態失敗：modifiedCount = ${data?.updateIssue?.modifiedCount}`);
  }
}

// 彈出視窗用的完整資料：描述、留言、活動、附件、參與者
async function issueDetail(id) {
  const data = await gql(
    `query ($ids: [ID!]) {
      issue(params: { ids: $ids }) {
        nodes {
          id serialNumber title priority confidentiality createdDate updatedDate dueDate doneDate resolvedDate
          descriptionMd
          status { id name category { id name } } type { id name } area { id name }
          assignee { id account nickname } reporter { id account nickname }
          participants { id account } labels { id text color } milestone { id name endDate }
          attachments { id filename size mimetype }
          comments { id createdDate descriptionMd author { id account nickname } }
          activities { id createTime category params sender { id account } }
          issueRelations { count nodes { type target { id serialNumber title } } }
        }
      }
    }`,
    { ids: [id] }
  );
  const issue = expectArray(data?.issue?.nodes, 'issue.nodes')[0];
  if (!issue) throw new WorkPlusApiError(`找不到 issue ${id}`);
  return issue;
}

async function listMilestones(projectId) {
  const data = await gql(
    `query ($p: MilestoneReadInput) {
      milestone(params: $p) {
        nodes { id name endDate closed level stages { name dueDate order } }
      }
    }`,
    { p: { projectId } }
  );
  return expectArray(data?.milestone?.nodes, 'milestone.nodes');
}

async function listEpics(projectId) {
  const data = await gql(
    `query ($p: EpicReadInput) {
      epic(params: $p) {
        nodes { id name startDate dueDate status progress { all closed } }
      }
    }`,
    { p: { project: projectId } }
  );
  return expectArray(data?.epic?.nodes, 'epic.nodes');
}
// 通用更新：只送有變的欄位；一律 autoAssignee: false（見 docs/api-notes.md）。
// description 寫回已在 DESIGN_TEST-114 實測：原文送回 descriptionMd 一字不差，活動紀錄不多一筆。
async function updateIssue(id, params) {
  const data = await gql(
    `mutation ($id: ID, $p: IssueUpdateInput!) {
      updateIssue(id: $id, params: $p) { modifiedCount }
    }`,
    { id, p: { ...params, autoAssignee: false } }
  );
  if (data?.updateIssue?.modifiedCount !== 1) {
    throw new WorkPlusApiError(`更新失敗：modifiedCount = ${data?.updateIssue?.modifiedCount}`);
  }
}

// 專案的 label（含全域）；projectIdentity 來自 project.projectIdentity
async function listLabels(projectIdentity) {
  const data = await gql(
    `query ($p: LabelReadInput) { label(params: $p) { nodes { id text } } }`,
    { p: { projectIdentities: [projectIdentity] } }
  );
  return expectArray(data?.label?.nodes, 'label.nodes');
}

async function createLabel(projectIdentity, text) {
  const data = await gql(
    `mutation ($p: LabelCreateInput) { createLabel(params: $p) { id } }`,
    // color 必填，是 WorkPlus 的色票編號字串（現有 label 用到 1～24），不是色碼
    { p: { text, projectIdentity, level: 'NORMAL', color: '1' } }
  );
  if (!data?.createLabel?.id) throw new WorkPlusApiError(`建立標籤「${text}」失敗`);
  return data.createLabel.id;
}

// 專案的區域（建立 issue 必填）
async function listAreas(projectId) {
  const data = await gql(
    `query ($p: ProjectAreaReadInput) { projectArea(params: $p) { nodes { id name } } }`,
    { p: { project: projectId } }
  );
  return expectArray(data?.projectArea?.nodes, 'projectArea.nodes');
}

// 必填：title、type、status、priority、reporter、confidentiality、area，加上 projectKey（見 docs/api-notes.md）
async function createIssue(params) {
  const data = await gql(
    `mutation ($p: IssueCreateInput!) { createIssue(params: $p) { id serialNumber } }`,
    { p: params }
  );
  if (!data?.createIssue?.id) throw new WorkPlusApiError('建立 issue 失敗：沒有回傳 id');
  return data.createIssue;
}

// 刪除 issue（schema：deleteIssue(id) → OperationResult { succeed }）
async function deleteIssue(id) {
  const data = await gql(`mutation ($id: ID) { deleteIssue(id: $id) { succeed } }`, { id });
  if (data?.deleteIssue?.succeed !== true) throw new WorkPlusApiError('刪除 issue 失敗');
}

export { gql, me, projectByKey, listIssues, updateDueDate, updateStatus, updateIssue, listLabels, createLabel, listAreas, createIssue, deleteIssue, issueDetail, localMidnight, listProjects, listMilestones, listEpics, WorkPlusApiError };
