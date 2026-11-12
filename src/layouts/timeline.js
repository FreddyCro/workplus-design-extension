// Timeline：專案層級的路線圖。列 = Epic（startDate → dueDate），marker = Milestone 的 endDate 與 stages。唯讀。
import { el } from '../app/dom.js';
import { icon } from '../app/icons.js';
import { renderChart } from '../timeline/chart.js';
import { sortRows } from '../timeline/layout.js';
import { milestoneMarkers } from './gantt.js';

export function epicToRow(epic) {
  const all = epic.progress?.all ?? 0;
  const closed = epic.progress?.closed ?? 0;
  return {
    id: `epic-${epic.id}`,
    name: epic.name,
    label: epic.name,
    start: epic.startDate ? new Date(epic.startDate) : null,
    end: epic.dueDate ? new Date(epic.dueDate) : null,
    done: epic.status === 'CLOSE',
    progress: all ? Math.round((closed / all) * 100) : null,
    counts: { all, closed },
  };
}

export function renderTimeline(main, state, prefs, savePrefs) {
  const { epics, milestones } = state;

  const toolbar = el('div', 'chart-toolbar');
  const count = el('span', '', `${epics.length} 個 Epic · ${milestones.length} 個里程碑`);
  const tabs = el('div', 'tabs');
  const todayBtn = el('button', 'btn');
  todayBtn.append(icon('today'), el('span', '', '今天'));
  toolbar.append(count, el('span', 'spacer'), tabs, todayBtn);

  const chartHost = el('div', 'chart-host');
  chartHost.style.cssText = 'flex: 1; min-height: 0; display: flex; flex-direction: column;';
  main.replaceChildren(toolbar, chartHost);

  const data = () => ({
    rows: sortRows(epics.map(epicToRow)),
    markers: milestoneMarkers(milestones, prefs.showClosed),
    relations: [],
  });

  const chart = renderChart(chartHost, {
    ...data(),
    view: prefs.view,
    sidebarCell: (row) => {
      const cell = el('div');
      const title = el('span', 'title', row.name);
      title.title = row.name;
      cell.append(el('span', `status-dot ${row.done ? 'done' : 'in_process'}`), title);
      if (row.progress !== null) cell.append(el('span', 'sub', `${row.counts.closed}/${row.counts.all} · ${row.progress}%`));
      return cell;
    },
  });

  if (!epics.length) {
    // renderChart 會清空 chartHost，所以空狀態放在圖的側欄 header 下面
    const empty = el('div', 'empty');
    empty.style.cssText = 'margin: 16px 12px; text-align: left;';
    empty.append(el('strong', '', '這個專案沒有 Epic'), el('span', '', '右側只顯示里程碑。'));
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
