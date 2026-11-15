// Gantt：issue 層級。條的終點 = dueDate（已完成且沒 dueDate 時用 doneDate）；
// 起點 API 沒有，從描述尾端的「**開始日期**：YYYY-MM-DD」行讀（只讀，這一階段不寫回）。
import { el, initials } from '../app/dom.js';
import { icon } from '../app/icons.js';
import { renderChart } from '../timeline/chart.js';
import { sortRows } from '../timeline/layout.js';
import { startOfDay } from '../timeline/scale.js';
import { updateDueDate, localMidnight } from '../api.js';
import { toast } from '../ui/toast.js';
import { assertWritable } from '../ui/guard.js';
import { parseDateLine } from '../ui/date-lines.js';

export function issueToRow(issue, projectKey) {
  const done = issue.status?.category?.name === 'done';
  let end = null;
  let endSource = 'none';
  if (issue.dueDate) {
    end = startOfDay(new Date(issue.dueDate));
    endSource = 'dueDate';
  } else if (done && issue.doneDate) {
    // doneDate 是真實完成時間（帶時分秒），正規化到當天 00:00；灰條代表「完成於」，不能拖去改到期日
    end = startOfDay(new Date(issue.doneDate));
    endSource = 'doneDate';
  }
  // 沒有終點、或開始晚於終點時，忽略開始日期
  let start = null;
  let startSource = 'none';
  const startTs = end ? parseDateLine(issue.descriptionMd, '開始日期') : null;
  if (startTs && startTs <= end.getTime()) {
    start = new Date(startTs);
    startSource = 'description';
  }
  return {
    id: issue.id,
    key: `${projectKey}-${issue.serialNumber}`,
    serialNumber: issue.serialNumber,
    title: issue.title,
    label: issue.title,
    assignee: issue.assignee?.account ?? null,
    done,
    start,
    startSource,
    end,
    endSource,
    // 有開始日期的條先不能拖：拖動會改到開始日期，而描述寫回尚未驗證保真度
    draggable: endSource === 'dueDate' && !start,
  };
}

export function issueRelations(issues) {
  const seen = new Set();
  const out = [];
  for (const issue of issues) {
    for (const r of issue.issueRelations?.nodes ?? []) {
      let from;
      let to;
      if (r.type === 'BLOCKS') [from, to] = [issue.id, r.target?.id];
      else if (r.type === 'BLOCKED_BY') [from, to] = [r.target?.id, issue.id];
      else continue;
      if (!from || !to || seen.has(`${from}>${to}`)) continue;
      seen.add(`${from}>${to}`);
      out.push({ from, to });
    }
  }
  return out;
}

export function milestoneMarkers(milestones, showClosed) {
  const out = [];
  for (const m of milestones) {
    if (m.closed && !showClosed) continue;
    if (m.endDate) out.push({ id: `ms-${m.id}`, date: new Date(m.endDate), label: m.name, kind: 'milestone' });
    (m.stages ?? []).forEach((s, i) => {
      if (s.dueDate) out.push({ id: `ms-${m.id}-s${i}`, date: new Date(s.dueDate), label: `${m.name} · ${s.name}`, kind: 'stage' });
    });
  }
  return out;
}

export function renderGantt(main, state, prefs, savePrefs, { onOpen, filter } = {}) {
  const { project, issues, milestones } = state;
  const root = main.getRootNode();

  const toolbar = el('div', 'chart-toolbar');
  const count = el('span', 'count');
  const tabs = el('div', 'tabs');
  const todayBtn = el('button', 'btn');
  todayBtn.append(icon('today'), el('span', '', '今天'));
  toolbar.append(count, el('span', 'spacer'), tabs, todayBtn);
  const chartHost = el('div', 'chart-host');
  chartHost.style.cssText = 'flex: 1; min-height: 0; display: flex; flex-direction: column;';
  main.replaceChildren(toolbar, chartHost);

  const rows = () => {
    const all = sortRows((filter ? issues.filter(filter) : issues).map((i) => issueToRow(i, project.key)));
    return prefs.showUndated ? all : all.filter((r) => r.end);
  };
  const data = () => ({
    rows: rows(),
    markers: milestoneMarkers(milestones, prefs.showClosed),
    relations: issueRelations(issues),
  });

  const chart = renderChart(chartHost, {
    ...data(),
    view: prefs.view,
    sidebarCell: (row) => {
      const cell = el('div');
      const a = el('a', 'title', row.title);
      a.href = `/key/${encodeURIComponent(project.key)}/issues/${encodeURIComponent(row.serialNumber)}`;
      a.title = row.title;
      if (onOpen) a.addEventListener('click', (e) => { e.preventDefault(); onOpen(issues.find((i) => i.id === row.id)); });
      cell.append(el('span', 'key', row.key), a, el('span', 'avatar', initials(row.assignee)));
      return cell;
    },
    onBlockDrag: async ({ rowId, end }) => {
      const issue = issues.find((i) => i.id === rowId);
      const before = issue.dueDate;
      const after = localMidnight(end.getFullYear(), end.getMonth(), end.getDate());
      issue.dueDate = after;
      chart.update(data());
      try {
        assertWritable(rowId, project.key, issue.serialNumber);
        await updateDueDate(rowId, after);
        toast(root, `${project.key}-${issue.serialNumber} 到期日改為 ${end.getFullYear()}/${end.getMonth() + 1}/${end.getDate()}`);
      } catch (err) {
        issue.dueDate = before;
        chart.update(data());
        toast(root, `更新到期日失敗：${err.message}`, { kind: 'error' });
      }
    },
  });

  const refreshCount = () => count.replaceChildren(el('span', '', 'Issue'), el('span', 'qty', `${rows().length} 項`));
  refreshCount();

  for (const v of ['week', 'month']) {
    const b = el('button', v === prefs.view ? 'active' : '', v === 'week' ? 'Week' : 'Month');
    b.dataset.view = v;
    b.addEventListener('click', () => {
      prefs.view = v;
      savePrefs();
      for (const x of tabs.children) x.classList.toggle('active', x === b);
      chart.setView(v);
    });
    tabs.append(b);
  }
  todayBtn.addEventListener('click', () => chart.scrollToToday());
  return { chart, refresh: () => { chart.update(data()); refreshCount(); } };
}

