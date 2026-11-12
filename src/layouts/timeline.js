// Timeline：專案層級的路線圖。列 = Epic（startDate → dueDate）+ 有開始與到期日的 issue（開始日期來自描述尾端那一行），
// marker = Milestone 的 endDate 與 stages。唯讀。
import { el } from '../app/dom.js';
import { icon } from '../app/icons.js';
import { renderChart } from '../timeline/chart.js';
import { sortRows } from '../timeline/layout.js';
import { milestoneMarkers, issueToRow } from './gantt.js';

export function epicToRow(epic) {
  const all = epic.progress?.all ?? 0;
  const closed = epic.progress?.closed ?? 0;
  return {
    id: `epic-${epic.id}`,
    kind: 'epic',
    name: epic.name,
    label: epic.name,
    start: epic.startDate ? new Date(epic.startDate) : null,
    end: epic.dueDate ? new Date(epic.dueDate) : null,
    done: epic.status === 'CLOSE',
    progress: all ? Math.round((closed / all) * 100) : null,
    counts: { all, closed },
  };
}

// 有頭有尾的 issue 才上 Timeline；缺一個回 null
export function issueSpanRow(issue, projectKey) {
  const r = issueToRow(issue, projectKey);
  if (!r.start || !r.end) return null;
  return {
    id: `issue-${issue.id}`,
    kind: 'issue',
    issueId: issue.id,
    serialNumber: issue.serialNumber,
    name: `${r.key} ${issue.title}`,
    label: issue.title,
    start: r.start,
    end: r.end,
    done: r.done,
    progress: null,
    draggable: false,
  };
}

export function renderTimeline(main, state, prefs, savePrefs, { onOpen, filter } = {}) {
  const { project, epics, milestones, issues } = state;

  const toolbar = el('div', 'chart-toolbar');
  const count = el('span', '');
  const tabs = el('div', 'tabs');
  const todayBtn = el('button', 'btn');
  todayBtn.append(icon('today'), el('span', '', '今天'));
  toolbar.append(count, el('span', 'spacer'), tabs, todayBtn);

  const chartHost = el('div', 'chart-host');
  chartHost.style.cssText = 'flex: 1; min-height: 0; display: flex; flex-direction: column;';
  main.replaceChildren(toolbar, chartHost);

  const spans = () => (filter ? issues.filter(filter) : issues).map((i) => issueSpanRow(i, project.key)).filter(Boolean);
  const data = () => {
    const s = spans();
    count.textContent = `${epics.length} 個 Epic · ${milestones.length} 個里程碑 · ${s.length} 張有時程的 issue`;
    return {
      rows: sortRows([...epics.map(epicToRow), ...s]),
      markers: milestoneMarkers(milestones, prefs.showClosed),
      relations: [],
    };
  };

  const chart = renderChart(chartHost, {
    ...data(),
    view: prefs.view,
    sidebarCell: (row) => {
      const cell = el('div');
      if (row.kind === 'issue') {
        const a = el('a', 'title', row.label);
        a.href = `/key/${encodeURIComponent(project.key)}/issues/${encodeURIComponent(row.serialNumber)}`;
        a.title = row.name;
        if (onOpen) a.addEventListener('click', (e) => { e.preventDefault(); onOpen(issues.find((i) => i.id === row.issueId)); });
        cell.append(el('span', 'key', `${project.key}-${row.serialNumber}`), a);
        return cell;
      }
      const title = el('span', 'title', row.name);
      title.title = row.name;
      cell.append(el('span', `status-dot ${row.done ? 'done' : 'in_process'}`), title);
      if (row.progress !== null) cell.append(el('span', 'sub', `${row.counts.closed}/${row.counts.all} · ${row.progress}%`));
      return cell;
    },
  });

  if (!epics.length && !spans().length) {
    // renderChart 會清空 chartHost，所以空狀態放在圖的側欄 header 下面
    const empty = el('div', 'empty');
    empty.style.cssText = 'margin: 16px 12px; text-align: left;';
    empty.append(el('strong', '', '這個專案沒有 Epic，也沒有同時有開始與到期日的 issue'), el('span', '', '右側只顯示里程碑。開始日期寫在 issue 描述尾端：**開始日期**：YYYY-MM-DD'));
    chart.element.querySelector('.chart-side').append(empty);
  }

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
  return { chart, refresh: () => chart.update(data()) };
}
