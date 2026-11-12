// WorkPlus GraphQL API client。格式見 docs/api-notes.md。
// 只靠登入 cookie，同網域直接 fetch('/api')。
// 所有回應都先檢查結構，WorkPlus 改版時要報出清楚的錯誤，而不是畫面空白。
const WP = (() => {
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
            nodes { id serialNumber title priority status { id name } assignee { id account } }
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

  return { gql, me, projectByKey, listIssues, WorkPlusApiError };
})();
