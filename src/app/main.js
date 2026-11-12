// App 進入點。content.js 掛好 Shadow DOM 後呼叫 start(root)。
import { me, projectByKey, listProjects, listIssues, listMilestones, listEpics } from '../api.js';
import { TOKENS } from './tokens.css.js';
import { SHELL_CSS } from './shell.css.js';
import { el } from './dom.js';
import { readRoute, writeLayout, writeIssue } from './router.js';
import { renderShell } from './shell.js';
import { renderBoard, BOARD_CSS } from '../layouts/board.js';
import { renderList, LIST_CSS } from '../layouts/list.js';
import { renderCalendar, CALENDAR_CSS } from '../layouts/calendar.js';
import { renderGantt } from '../layouts/gantt.js';
import { renderTimeline } from '../layouts/timeline.js';
import { openIssuePeek, PEEK_CSS } from '../layouts/issue-peek.js';
import { CHART_CSS } from '../timeline/chart.css.js';
import { CARD_CSS } from '../ui/issue-card.js';
import { MODAL_CSS } from '../ui/modal.js';

const TAG = '[wp-skin]';
const PREF_DEFAULTS = {
  panelOpen: false,
  ganttView: 'month',
  ganttShowUndated: true,
  ganttShowClosed: false,
  calYear: null,
  calMonth: null,
  calWeekends: true,
};

export async function start(root) {
  const style = document.createElement('style');
  style.textContent = TOKENS + SHELL_CSS + CARD_CSS + BOARD_CSS + LIST_CSS + CALENDAR_CSS + CHART_CSS + MODAL_CSS + PEEK_CSS;
  root.replaceChildren(style);
  try {
    await boot(root);
  } catch (err) {
    console.error(TAG, err);
    root.append(el('div', 'msg error', `載入失敗：${err.message}。可以從工具列關掉新介面，回到原本的 WorkPlus。`));
  }
}

async function boot(root) {
  const route = readRoute(new URL(location.href));
  if (!route.key) {
    root.append(el('div', 'msg', '請進入某個專案的頁面（網址是 /key/專案代碼/…），或從工具列關掉新介面。'));
    return;
  }
  const loading = el('div', 'msg', `載入 ${route.key} 中…`);
  root.append(loading);

  const [stored, user, project, projects] = await Promise.all([
    chrome.storage.local.get(PREF_DEFAULTS),
    me(),
    projectByKey(route.key),
    listProjects(),
  ]);
  const issues = await listIssues(project.id);
  loading.remove();

  const prefs = { ...PREF_DEFAULTS, ...stored };
  const state = {
    user, project, projects, issues,
    layout: route.layout,
    prefs,
    savePrefs: () => chrome.storage.local.set(prefs),
    // Gantt / Timeline / Calendar 共用的偏好物件（直接對 prefs 讀寫）
    gantt: {
      get view() { return prefs.ganttView; }, set view(v) { prefs.ganttView = v; },
      get showUndated() { return prefs.ganttShowUndated; }, set showUndated(v) { prefs.ganttShowUndated = v; },
      get showClosed() { return prefs.ganttShowClosed; }, set showClosed(v) { prefs.ganttShowClosed = v; },
      get calYear() { return prefs.calYear; }, set calYear(v) { prefs.calYear = v; },
      get calMonth() { return prefs.calMonth; }, set calMonth(v) { prefs.calMonth = v; },
      get calWeekends() { return prefs.calWeekends; }, set calWeekends(v) { prefs.calWeekends = v; },
    },
    milestones: null,
    epics: null,
    query: '',
    current: null, // 目前 layout 回傳的 { refresh }
    peek: null,
  };
  mountShell(root, state);

  // 重新整理或上一頁 / 下一頁時同步彈出視窗
  if (route.issue) openPeek(root, state, route.issue, { fromHistory: true });
  window.addEventListener('popstate', () => {
    const r = readRoute(new URL(location.href));
    if (r.issue) openPeek(root, state, r.issue, { fromHistory: true });
    else state.peek?.closeSilently();
  });
}

function mountShell(root, state) {
  root.querySelector('.shell')?.remove();
  const shell = renderShell(root, {
    user: state.user,
    project: state.project,
    projects: state.projects,
    layout: state.layout,
    panelOpen: state.prefs.panelOpen,
    onLayoutChange: (layout) => {
      if (layout === state.layout) return;
      state.layout = layout;
      writeLayout(layout);
      mountShell(root, state);
    },
    onPanelToggle: (open) => {
      state.prefs.panelOpen = open;
      state.savePrefs();
      shell.setPanelOpen(open);
    },
    onSearch: (q) => {
      state.query = q.toLowerCase();
      renderLayout(shell, state);
    },
    displayOptions: displayOptionsFor(state, () => (state.current?.refresh ? state.current.refresh() : renderLayout(shell, state))),
  });
  shell.setCount(state.issues.length);
  shell.setCrumbIcon(state.layout);
  renderLayout(shell, state).catch((err) => {
    console.error(TAG, err);
    shell.main.replaceChildren(el('div', 'msg error', `載入失敗：${err.message}`));
  });
}

function displayOptionsFor(state, refresh) {
  const p = state.prefs;
  const opt = (key, label) => ({
    label,
    checked: p[key],
    onChange: (v) => {
      p[key] = v;
      state.savePrefs();
      refresh();
    },
  });
  switch (state.layout) {
    case 'gantt':
      return [opt('ganttShowUndated', '顯示無日期的 issue'), opt('ganttShowClosed', '顯示已關閉的里程碑')];
    case 'timeline':
      return [opt('ganttShowClosed', '顯示已關閉的里程碑')];
    case 'calendar':
      return [opt('calWeekends', '顯示週末')];
    default:
      return [];
  }
}

function issueFilter(state) {
  const q = state.query;
  if (!q) return null;
  return (i) => `${state.project.key}-${i.serialNumber}`.toLowerCase().includes(q) || (i.title ?? '').toLowerCase().includes(q);
}

async function renderLayout(shell, state) {
  const root = shell.main.getRootNode();
  const opts = { onOpen: (issue) => openPeek(root, state, issue.serialNumber), filter: issueFilter(state) };
  state.current = null;
  switch (state.layout) {
    case 'list':
      renderList(shell.main, state, opts);
      break;
    case 'board':
      renderBoard(shell.main, state, opts);
      break;
    case 'calendar': {
      const cal = renderCalendar(shell.main, state, state.gantt, state.savePrefs, opts);
      state.current = { refresh: cal.draw };
      break;
    }
    case 'gantt': {
      if (!state.milestones) {
        shell.main.replaceChildren(el('div', 'msg', '載入里程碑中…'));
        state.milestones = await cached(state, 'milestones', () => listMilestones(state.project.id));
      }
      state.current = renderGantt(shell.main, state, state.gantt, state.savePrefs, opts);
      break;
    }
    case 'timeline': {
      if (!state.milestones || !state.epics) {
        shell.main.replaceChildren(el('div', 'msg', '載入 Epic 與里程碑中…'));
        [state.milestones, state.epics] = await Promise.all([
          state.milestones ?? cached(state, 'milestones', () => listMilestones(state.project.id)),
          state.epics ?? cached(state, 'epics', () => listEpics(state.project.id)),
        ]);
      }
      state.current = renderTimeline(shell.main, state, state.gantt, state.savePrefs);
      break;
    }
  }
}

async function openPeek(root, state, serialNumber, { fromHistory = false } = {}) {
  const issue = state.issues.find((i) => String(i.serialNumber) === String(serialNumber));
  if (!issue) return;
  if (!fromHistory) writeIssue(String(serialNumber));
  state.peek?.closeSilently();
  const modal = await openIssuePeek(root, {
    project: state.project,
    issue,
    onClose: () => {
      state.peek = null;
      if (readRoute(new URL(location.href)).issue) writeIssue(null);
    },
  });
  state.peek = {
    // 由 popstate 或換 issue 時呼叫：只拆 DOM，不再動網址
    closeSilently: () => {
      state.peek = null;
      root.querySelector('.backdrop')?.remove();
    },
  };
}

// 快取 Promise 而不是結果：快速切換 layout 時不會重複抓
function cached(state, key, load) {
  state.loading ??= {};
  state.loading[key] ??= load();
  return state.loading[key];
}
