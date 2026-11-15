// 時間軸引擎的 DOM 層：左側欄 + header + 格線 + 條 + 里程碑線 + 相依箭頭。
// Gantt 與 Timeline 都用這個，只差 rows 與 sidebarCell。拖拉由 Task 8 的 pointer 事件接進來。
import { el } from '../app/dom.js';
import { makeScale, headerCells, rangeFor, startOfDay } from './scale.js';
import { layoutRows, layoutArrows, ROW_HEIGHT } from './layout.js';
import { dragResult } from './drag.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const BLOCK_TOP = (ROW_HEIGHT - 28) / 2;

// rows: [{ id, start, end, label, done, ... }]；markers: [{ id, date, label, kind }]；relations: [{ from, to }]
// sidebarCell(row) → HTMLElement；onBlockDrag({ rowId, end }) → Promise；沒給就不能拖
export function renderChart(container, opts) {
  const state = {
    rows: opts.rows,
    markers: opts.markers ?? [],
    relations: opts.relations ?? [],
    view: opts.view ?? 'month',
    today: startOfDay(opts.today ?? new Date()),
    sidebarCell: opts.sidebarCell,
    onBlockDrag: opts.onBlockDrag,
    scale: null,
    pendingId: null, // 寫入中的列：不能再拖，顯示 pending 樣式
  };

  const chart = el('div', 'chart');
  const side = el('div', 'chart-side');
  const body = el('div', 'chart-body');
  chart.append(side, body);
  container.replaceChildren(chart);

  function build() {
    const dates = [
      ...state.rows.flatMap((r) => [r.start, r.end]),
      ...state.markers.map((m) => m.date),
    ].filter(Boolean);
    const range = rangeFor(dates, state.today);
    state.scale = makeScale({ view: state.view, start: range.start, end: range.end });
    const scale = state.scale;
    const cells = headerCells(scale, state.today);
    const blocks = layoutRows(state.rows, scale);
    // 沒有列時也留三列的高度，里程碑線才看得到
    const height = Math.max(state.rows.length, 3) * ROW_HEIGHT;

    // 側欄
    const sideHead = el('div', 'chart-side-head');
    sideHead.append(el('span', 'qty', `${state.rows.length} 項`));
    side.replaceChildren(sideHead);
    for (const row of state.rows) {
      const cell = state.sidebarCell(row);
      cell.classList.add('chart-side-row');
      cell.dataset.rowId = row.id;
      side.append(cell);
    }

    // header
    const head = el('div', 'chart-head');
    head.style.width = `${scale.width}px`;
    const top = el('div', 'top');
    for (const c of cells.top) top.append(cellEl(c, ''));
    const bottom = el('div', 'bottom');
    for (const c of cells.bottom) bottom.append(cellEl(c, `${c.weekend ? ' weekend' : ''}${c.today ? ' today' : ''}`));
    head.append(top, bottom);

    // 格線、週末、今天線、里程碑
    const grid = el('div', 'chart-grid');
    grid.style.width = `${scale.width}px`;
    grid.style.height = `${height}px`;
    for (const c of cells.bottom) {
      if (!c.weekend) continue;
      const w = el('div', 'weekend');
      w.style.left = `${c.x}px`;
      w.style.width = `${c.width}px`;
      grid.append(w);
    }
    for (let i = 0; i < state.rows.length; i++) grid.append(el('div', 'row'));
    if (state.today >= scale.start && state.today <= scale.end) {
      const line = el('div', 'today-line');
      line.style.left = `${scale.xOf(state.today) + scale.dayWidth / 2 - 1}px`;
      grid.append(line);
    }
    for (const m of state.markers) {
      if (!m.date) continue;
      const line = el('div', `marker ${m.kind ?? ''}`);
      line.style.left = `${scale.xOf(m.date) + scale.dayWidth / 2}px`;
      line.dataset.markerId = m.id;
      line.append(el('span', 'tag', m.label));
      grid.append(line);
    }

    // 條
    const rowById = new Map(state.rows.map((r) => [r.id, r]));
    for (const b of blocks) {
      const row = rowById.get(b.id);
      const block = el('div', `block${row.done ? ' done' : ''}${b.hasStart ? '' : ' no-start'}`);
      block.dataset.blockId = b.id;
      block.style.left = `${b.x}px`;
      block.style.top = `${b.y + BLOCK_TOP}px`;
      block.style.width = `${b.width}px`;
      block.title = row.label ?? '';
      block.append(el('span', 'label', row.label ?? ''));
      if (state.pendingId === row.id) block.classList.add('pending');
      // row.draggable === false 的條（例如完成日期來源）唯讀
      if (state.onBlockDrag && row.end && row.draggable !== false) {
        block.classList.add('draggable');
        block.append(el('div', 'handle'));
        attachDrag(block, row, b);
      }
      grid.append(block);
    }

    // 箭頭
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'arrows');
    svg.setAttribute('width', scale.width);
    svg.setAttribute('height', height);
    const defs = document.createElementNS(SVG_NS, 'defs');
    const marker = document.createElementNS(SVG_NS, 'marker');
    marker.setAttribute('id', 'arrow-head');
    marker.setAttribute('viewBox', '0 0 8 8');
    marker.setAttribute('refX', '7');
    marker.setAttribute('refY', '4');
    marker.setAttribute('markerWidth', '6');
    marker.setAttribute('markerHeight', '6');
    marker.setAttribute('orient', 'auto');
    const tri = document.createElementNS(SVG_NS, 'path');
    tri.setAttribute('d', 'M 0 0 L 8 4 L 0 8 z');
    tri.setAttribute('fill', 'currentColor');
    marker.append(tri);
    defs.append(marker);
    svg.append(defs);
    for (const a of layoutArrows(state.relations, blocks)) {
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', a.d);
      path.setAttribute('marker-end', 'url(#arrow-head)');
      path.dataset.from = a.from;
      path.dataset.to = a.to;
      svg.append(path);
    }
    grid.append(svg);

    body.replaceChildren(head, grid);
  }

  function attachDrag(block, row, b) {
    block.addEventListener('pointerdown', (ev) => {
      if (ev.button !== 0 || state.pendingId) return;
      const mode = ev.target.classList.contains('handle') ? 'resize-right' : 'move';
      const startX = ev.clientX;
      const origLeft = b.x;
      const origWidth = b.width;
      let dx = 0;
      let cancelled = false;
      block.setPointerCapture(ev.pointerId);
      block.classList.add('dragging');
      ev.preventDefault();

      const onMove = (e) => {
        dx = e.clientX - startX;
        // 視覺位移夾在圖的範圍內；dragResult 另外會把範圍外判成不變
        const maxLeft = state.scale.width - origWidth;
        if (mode === 'move') block.style.left = `${Math.min(maxLeft, Math.max(0, origLeft + dx))}px`;
        else block.style.width = `${Math.min(maxLeft + origWidth - origLeft, Math.max(state.scale.dayWidth, origWidth + dx))}px`;
      };
      // 瀏覽器接管（失焦、觸控捲動、捕捉遺失）視同取消，不能拿半途的 dx 去寫入
      const onCancel = () => {
        cancelled = true;
        finish();
      };
      const onKey = (e) => {
        if (e.key === 'Escape') {
          cancelled = true;
          finish();
        }
      };
      const finish = async () => {
        block.removeEventListener('pointermove', onMove);
        block.removeEventListener('pointerup', finish);
        block.removeEventListener('pointercancel', onCancel);
        window.removeEventListener('keydown', onKey);
        block.classList.remove('dragging');
        const result = cancelled ? null : dragResult({ block: b, row, scale: state.scale, mode, dx });
        if (!result || !result.changed) {
          block.style.left = `${origLeft}px`;
          block.style.width = `${origWidth}px`;
          return;
        }
        state.pendingId = row.id;
        block.classList.add('pending');
        try {
          await state.onBlockDrag({ rowId: row.id, end: result.end });
        } finally {
          state.pendingId = null;
          body.querySelector(`.block[data-block-id="${CSS.escape(row.id)}"]`)?.classList.remove('pending');
        }
      };
      block.addEventListener('pointermove', onMove);
      block.addEventListener('pointerup', finish);
      block.addEventListener('pointercancel', onCancel);
      window.addEventListener('keydown', onKey);
    });
  }

  function cellEl(c, extra) {
    const d = el('div', `cell${extra}`, c.label);
    d.style.left = `${c.x}px`;
    d.style.width = `${c.width}px`;
    return d;
  }

  function scrollToToday() {
    const x = state.scale.xOf(state.today);
    chart.scrollLeft = Math.max(0, x - (chart.clientWidth - 360) / 2);
  }

  build();
  requestAnimationFrame(scrollToToday);

  return {
    setView(view) {
      state.view = view;
      build();
      scrollToToday();
    },
    update({ rows, markers, relations }) {
      if (rows) state.rows = rows;
      if (markers) state.markers = markers;
      if (relations) state.relations = relations;
      const left = chart.scrollLeft;
      const top = chart.scrollTop;
      build();
      chart.scrollLeft = left;
      chart.scrollTop = top;
    },
    scrollToToday,
    get scale() {
      return state.scale;
    },
    element: chart,
  };
}
