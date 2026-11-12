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
  if (!res.ok) throw new WorkPlusApiError(`WorkPlus API HTTP ${res.status}`);
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
        nodes { id key name schema { status { id name category { id name } } } }
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


export { gql, me, projectByKey, listIssues, updateDueDate, updateStatus, issueDetail, localMidnight, listProjects, listMilestones, listEpics, WorkPlusApiError };
