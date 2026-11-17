export const CHART_CSS = `
  .chart-toolbar { display: flex; align-items: center; gap: 10px; padding: 8px 20px; height: 40px;
                   background: var(--bg-surface-1); border-bottom: 1px solid var(--border-subtle); font-size: 12px; color: var(--txt-3); }
  .chart-toolbar .spacer { flex: 1; }
  .chart-toolbar .count { display: inline-flex; align-items: center; gap: 6px; }
  .chart-toolbar .count .dot { margin: 0 2px; color: var(--txt-placeholder); }
  .chart-toolbar label { display: inline-flex; align-items: center; gap: 4px; cursor: pointer; }
  .chart-toolbar .tabs { display: flex; gap: 2px; background: var(--bg-layer-1); border: 1px solid var(--border-subtle);
                         border-radius: var(--radius-md); padding: 2px; }
  .chart-toolbar .tabs button { padding: 2px 8px; border-radius: var(--radius-sm); color: var(--txt-3); font-size: 12px; font-weight: 500; }
  .chart-toolbar .tabs button.active { background: var(--bg-surface-1); color: var(--txt-1); box-shadow: 0 1px 2px rgb(0 0 0 / 8%); }

  .chart { flex: 1; min-height: 0; overflow: auto; position: relative; background: var(--bg-surface-1);
           display: grid; grid-template-columns: 360px max-content; align-items: start; }
  .chart-side { position: sticky; left: 0; z-index: 12; background: var(--bg-surface-1); border-right: 1px solid var(--border-strong); }
  .chart-side-head { position: sticky; top: 0; z-index: 2; height: 48px; background: var(--bg-surface-1);
                     border-bottom: 1px solid var(--border-strong); display: flex; align-items: center; padding: 0 12px;
                     font-size: 12px; font-weight: 500; color: var(--txt-3); }
  .chart-side-row { height: 44px; border-bottom: 1px solid var(--border-subtle); display: flex; align-items: center; gap: 8px;
                    padding: 0 12px; min-width: 0; }
  .chart-side-row .key { font-size: 11px; font-weight: 600; color: var(--txt-3); flex: none; width: 28px; text-align: right; font-variant-numeric: tabular-nums; }
  .chart-side-row .title { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--txt-1); }
  .chart-side-row .title:hover { color: var(--brand); text-decoration: underline; }
  .chart-side-row .avatar { width: 20px; height: 20px; border-radius: 50%; background: var(--bg-layer-2); color: var(--txt-2);
                            display: grid; place-items: center; font-size: 9px; font-weight: 600; flex: none; }
  .chart-side-row .sub { font-size: 11px; color: var(--txt-3); flex: none; }

  .chart-body { position: relative; }
  .chart-head { position: sticky; top: 0; z-index: 10; height: 48px; background: var(--bg-surface-1); border-bottom: 1px solid var(--border-strong); }
  .chart-head .cell { position: absolute; font-size: 11px; color: var(--txt-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                      padding: 0 6px; display: flex; align-items: center; border-right: 1px solid var(--border-subtle); }
  .chart-head .top .cell { top: 0; height: 24px; font-weight: 500; color: var(--txt-2); }
  .chart-head .bottom .cell { top: 24px; height: 24px; justify-content: center; padding: 0; }
  .chart-head .bottom .cell.weekend { background: var(--bg-layer-1); }
  .chart-head .bottom .cell.today { color: var(--brand); font-weight: 600; }

  .chart-grid { position: relative; }
  .chart-grid .weekend { position: absolute; top: 0; bottom: 0; background: var(--bg-layer-1); }
  .chart-grid .row { height: 44px; border-bottom: 1px solid var(--border-subtle); }
  .chart-grid .today-line { position: absolute; top: 0; bottom: 0; width: 2px; background: var(--brand); z-index: 3; pointer-events: none; }
  .chart-grid .marker { position: absolute; top: 0; bottom: 0; border-left: 1px dashed var(--amber); z-index: 3; pointer-events: none; }
  .chart-grid .marker.stage { border-left-style: dotted; border-left-color: var(--txt-placeholder); }
  .chart-grid .marker .tag { position: absolute; top: 4px; left: 3px; font-size: 10px; color: var(--amber); background: var(--bg-surface-1);
                             padding: 0 4px; border-radius: var(--radius-sm); white-space: nowrap; max-width: 160px; overflow: hidden; text-overflow: ellipsis; }
  .chart-grid .marker.stage .tag { color: var(--txt-3); }

  .block { position: absolute; height: 28px; border-radius: var(--radius-sm); background: var(--brand); color: var(--txt-on-brand);
           z-index: 5; display: flex; align-items: center; padding: 0 8px; font-size: 12px; white-space: nowrap; overflow: hidden;
           text-overflow: ellipsis; box-shadow: 0 1px 2px rgb(0 0 0 / 15%); user-select: none; }
  .block.done { background: var(--border-strong); color: var(--txt-2); }
  .block.no-start { border-left: 3px dashed rgb(255 255 255 / 60%); }
  .block.draggable { cursor: grab; }
  .block.dragging { cursor: grabbing; opacity: .85; box-shadow: 0 4px 12px rgb(0 0 0 / 25%); z-index: 8; }
  .block.pending { opacity: .6; }
  .block .handle { position: absolute; top: 0; bottom: 0; right: 0; width: 8px; cursor: ew-resize; }
  .block .handle:hover { background: rgb(255 255 255 / 25%); }

  .arrows { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 4; overflow: visible; }
  .arrows path { fill: none; stroke: var(--txt-3); stroke-width: 1.5; }
`;
