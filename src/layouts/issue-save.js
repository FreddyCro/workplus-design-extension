// 彈出視窗就地編輯的存檔。描述是正本：每次存檔都把全部欄位寫回描述尾端，
// 並同步 WorkPlus 原生欄位（標題、負責人、優先級、截止日期、label），原介面、排序、通知才看得到。
// 存檔前一律重新抓最新的 issue 再套用這次的修改，避免蓋掉別人剛存的內容。
import { issueDetail, updateIssue, listLabels, createLabel, listAreas, createIssue, deleteIssue } from '../api.js';
import { assertWritable } from '../ui/guard.js';
import { fieldsOf, serializeFields, priorityFromText, PRIORITY_TEXT } from '../ui/issue-fields.js';

// issue → 可編輯的 model（values 用描述裡的寫法：優先級是中文）
export function toModel(issue) {
  const f = fieldsOf(issue);
  const values = {};
  for (const k of ['projectType', 'country', 'title', 'assignee', 'projectPath', 'requirementPath', 'figmaPath',
    'startDate', 'dueDate', 'receivedDate', 'draftDate', 'confirmDate']) values[k] = f[k];
  values.priority = f.priority ? PRIORITY_TEXT[f.priority] ?? null : null;
  values.tags = [...f.tags];
  return { body: f.body, values, schedule: f.schedule.map((s) => ({ ...s })), items: f.items.map((i) => ({ ...i })) };
}

// apply(model) 就地修改 model。回 { params, missingTags }：params 只含有變的欄位；
// missingTags = 專案還沒有的 label 文字（呼叫端建立後再算一次）。
export function buildUpdate(issue, apply, { usersByAccount = new Map(), labelsByText = new Map() } = {}) {
  const model = toModel(issue);
  const titleBefore = model.values.title;
  apply(model);
  const v = model.values;
  const params = {};
  const description = serializeFields(model);
  if (description !== (issue.descriptionMd ?? '')) params.description = description;
  // 標題只在這次真的改了才同步；描述裡的任務名稱和原生標題本來就不同時，不要順手改掉原生標題
  if (v.title && v.title !== titleBefore && v.title !== issue.title) params.title = v.title;
  const pr = priorityFromText(v.priority);
  if (pr && pr !== issue.priority) params.priority = pr;
  if ((v.dueDate ?? null) !== (issue.dueDate ?? null)) params.dueDate = v.dueDate ?? null;
  if ((v.assignee ?? null) !== (issue.assignee?.account ?? null)) {
    const id = v.assignee ? usersByAccount.get(v.assignee) : null;
    if (!v.assignee || id) params.assignee = id ?? null;
  }
  const want = [...new Set([v.projectType, ...v.tags].filter(Boolean))];
  const have = issue.labels ?? [];
  const missingTags = want.filter((t) => !have.some((l) => l.text === t) && !labelsByText.has(t));
  const add = want.filter((t) => !have.some((l) => l.text === t) && labelsByText.has(t)).map((t) => labelsByText.get(t));
  const remove = have.filter((l) => !want.includes(l.text)).map((l) => l.id);
  if (add.length) params.addLabels = add;
  if (remove.length) params.removeLabels = remove;
  return { params, missingTags };
}

// 實際存檔：重抓 → 套用 → 補建 label → 更新 → 回最新的 issue
const TAG = '[wp-skin save]';

export async function saveIssue({ project, issueId, apply, usersByAccount }) {
  console.log(TAG, '開始', { project: project.key, projectIdentity: project.projectIdentity, issueId });
  const fresh = await issueDetail(issueId);
  assertWritable(fresh.id, project.key, fresh.serialNumber);
  const labelsByText = new Map((await listLabels(project.projectIdentity)).map((l) => [l.text, l.id]));
  console.log(TAG, '專案 label', labelsByText.size, '個');
  let { params, missingTags } = buildUpdate(fresh, apply, { usersByAccount, labelsByText });
  if (missingTags.length) {
    console.log(TAG, '建立 label', missingTags);
    for (const t of missingTags) labelsByText.set(t, await createLabel(project.projectIdentity, t));
    ({ params } = buildUpdate(fresh, apply, { usersByAccount, labelsByText }));
  }
  console.log(TAG, '送出', { ...params, description: params.description && `（${params.description.length} 字）` });
  if (Object.keys(params).length) await updateIssue(fresh.id, params);
  else console.log(TAG, '沒有變更，不送出');
  const next = await issueDetail(issueId);
  console.log(TAG, '完成', { descriptionChanged: next.descriptionMd !== fresh.descriptionMd });
  return next;
}

// ── 新增 issue ─────────────────────────────────────────────
// values 用描述裡的寫法（優先級是中文）。全部欄位寫進描述，原生欄位同步寫（標題、負責人、優先級、截止日期、label）。
// 回 { params, missingTags }，missingTags = 專案還沒有的 label 文字。
export function buildCreate(values, { projectKey, statusId, typeId, areaId, reporterId, usersByAccount = new Map(), labelsByText = new Map() }) {
  const v = { ...values, tags: [...(values.tags ?? [])] };
  const want = [...new Set([v.projectType, ...v.tags].filter(Boolean))];
  const params = {
    projectKey,
    title: v.title,
    type: typeId,
    status: statusId,
    priority: priorityFromText(v.priority) ?? 'MEDIUM',
    reporter: reporterId,
    area: areaId,
    confidentiality: false,
    description: serializeFields({ body: '', values: v }),
    labels: want.filter((t) => labelsByText.has(t)).map((t) => labelsByText.get(t)),
  };
  const assignee = v.assignee ? usersByAccount.get(v.assignee) : null;
  if (assignee) params.assignee = assignee;
  if (v.dueDate != null) params.dueDate = v.dueDate;
  return { params, missingTags: want.filter((t) => !labelsByText.has(t)) };
}

// 專案設定裡挑預設值：類型優先 Task、區域優先 general、狀態用指定的或第一個
export function createDefaults(project, areas, statusId) {
  const types = project.schema?.types ?? [];
  const type = types.find((t) => t.name === 'Task') ?? types[0];
  const area = areas.find((a) => a.name === 'general') ?? areas[0];
  const status = statusId ?? project.schema?.status?.[0]?.id;
  if (!type || !area || !status) throw new Error('專案缺少類型、區域或狀態設定，無法建立 issue');
  return { typeId: type.id, areaId: area.id, statusId: status };
}

export async function createIssueFromForm({ project, values, statusId = null, reporterId, usersByAccount }) {
  assertWritable(null, project.key, '新增');
  const [areas, labels] = await Promise.all([listAreas(project.id), listLabels(project.projectIdentity)]);
  const labelsByText = new Map(labels.map((l) => [l.text, l.id]));
  const ctx = { projectKey: project.key, ...createDefaults(project, areas, statusId), reporterId, usersByAccount, labelsByText };
  let { params, missingTags } = buildCreate(values, ctx);
  if (missingTags.length) {
    console.log(TAG, '建立 label', missingTags);
    for (const t of missingTags) labelsByText.set(t, await createLabel(project.projectIdentity, t));
    ({ params } = buildCreate(values, ctx));
  }
  console.log(TAG, '建立 issue', { ...params, description: `（${params.description.length} 字）` });
  const created = await createIssue(params);
  console.log(TAG, '已建立', `${project.key}-${created.serialNumber}`);
  return issueDetail(created.id);
}

// ── 刪除 issue ─────────────────────────────────────────────
// 重抓一次確認 issue 還在、且屬於可寫的專案，才送刪除
export async function removeIssue({ project, issueId }) {
  const fresh = await issueDetail(issueId);
  assertWritable(fresh.id, project.key, fresh.serialNumber);
  console.log(TAG, '刪除', `${project.key}-${fresh.serialNumber}`);
  await deleteIssue(fresh.id);
}
