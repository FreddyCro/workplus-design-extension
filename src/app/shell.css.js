export const SHELL_CSS = `
  :host { all: initial; display: block; font: 13px/1.54 var(--font); color: var(--txt-1);
          background: var(--bg-surface-1); height: 100vh; box-sizing: border-box; overflow: hidden; }
  *, *::before, *::after { box-sizing: border-box; }
  a { color: inherit; text-decoration: none; }
  button { font: inherit; color: inherit; background: none; border: 0; padding: 0; cursor: pointer; }
  button:disabled { cursor: not-allowed; opacity: .5; }
  input { font: inherit; color: inherit; }
  svg.icon { display: block; flex: none; }

  .shell { display: grid; grid-template-rows: var(--top-h) 1fr; height: 100vh; }

  /* 頂欄 */
  .topbar { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 0 12px;
            border-bottom: 1px solid var(--top-border); background: var(--top-bg); color: var(--top-txt); }
  .topbar .ws { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 14px; padding: 4px 6px; border-radius: 4px; width: fit-content; position: relative; color: var(--side-txt-strong); }
  .topbar .ws:hover { background: var(--top-hover); }
  .topbar .ws .logo { width: 22px; height: 22px; border-radius: 4px; background: var(--side-txt-strong); color: #fff;
                      display: grid; place-items: center; font-size: 12px; }
  .topbar .search { display: flex; align-items: center; gap: 8px; width: 320px; height: 30px; padding: 0 10px;
                    border: 1px solid var(--top-search-border); border-radius: 6px; background: var(--top-bg); color: var(--top-txt-dim); }
  .topbar .search input { flex: 1; border: 0; outline: 0; background: none; min-width: 0; color: var(--side-txt-strong); }
  .topbar .search input::placeholder { color: var(--top-txt-dim); }
  .topbar .right { display: flex; align-items: center; justify-content: flex-end; gap: 6px; }
  .topbar .right .iconbtn { color: var(--top-txt); }
  .topbar .right .iconbtn:hover { background: var(--top-hover); color: var(--side-txt-strong); }
  .topbar .right .avatar { background: var(--side-txt-strong); }
  .avatar { width: 24px; height: 24px; border-radius: 50%; background: var(--txt-1); color: #fff; display: grid; place-items: center;
            font-size: 10px; font-weight: 600; flex: none; }
  .avatar.soft { background: var(--bg-layer-2); color: var(--txt-2); }

  /* 下層：rail + 專案面板 + 內容 */
  /* rail（Work / Settings）目前沒有用途，先隱藏（使用者 2026-11-12 指定）；專案面板由 header 第一顆 icon 開關 */
  .body { display: grid; grid-template-columns: 0 0 1fr; min-height: 0; transition: grid-template-columns .15s; }
  .body.panel-open { grid-template-columns: 0 230px 1fr; }
  .rail { display: none; }
  /* 面板 display:none 時不佔格，所以三欄都明確指定 grid-column，content 才不會被塞進寬 0 的第 2 欄 */
  .rail { grid-column: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 0; border-right: 1px solid var(--side-border); background: var(--side-bg-rail); }
  .panel { grid-column: 2; }
  .content { grid-column: 3; }
  .rail button, .rail a { display: flex; flex-direction: column; align-items: center; gap: 2px; width: 40px; padding: 6px 0; border-radius: 6px;
                          color: var(--side-txt-dim); font-size: 10px; }
  .rail button:hover, .rail a:hover { background: var(--top-hover); color: var(--side-txt-strong); }
  .rail .active { color: var(--side-txt-strong); }
  .rail .active .ico { background: var(--side-txt-strong); color: #fff; }
  .rail .ico { width: 24px; height: 24px; border-radius: 4px; display: grid; place-items: center; }
  .rail .spacer { flex: 1; }

  .panel { overflow: hidden auto; border-right: 1px solid var(--side-border); background: var(--side-bg); padding: 10px 8px; display: flex; flex-direction: column; gap: 2px; }
  .body:not(.panel-open) .panel { display: none; }
  .panel .section { font-size: 11px; font-weight: 600; color: var(--side-txt-dim); padding: 6px 8px 4px; letter-spacing: .02em; }
  .panel .item { display: flex; align-items: center; gap: 8px; padding: 5px 8px; border-radius: 4px; color: var(--side-txt); min-width: 0; }
  .panel .item:hover { background: var(--side-hover); }
  .panel .item.active { background: var(--brand-soft); color: var(--brand); font-weight: 500; }
  .panel .item .key { font-size: 10px; font-weight: 600; min-width: 26px; max-width: 72px; height: 18px; padding: 0 5px; border-radius: 4px;
                      background: var(--side-hover); color: var(--side-txt-dim); flex: none; display: block; line-height: 18px; text-align: center;
                      overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .panel .item.active .key { background: var(--brand); color: #fff; }
  .panel .item .label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .square { width: 20px; height: 20px; border-radius: var(--radius-sm); color: #fff; font-size: 9px; font-weight: 700; letter-spacing: .02em;
            display: grid; place-items: center; flex: none; }
  .panel .item.project { padding: 5px 8px; }
  .panel .item.project .label { font-size: 13px; }
  .panel .item.active .square { box-shadow: 0 0 0 2px var(--brand-soft), 0 0 0 3px var(--brand); }
  .panel .sub { padding-left: 36px; font-size: 12px; }
  .menu .dim { margin-left: auto; color: var(--txt-placeholder); font-size: 11px; }

  .content { display: flex; flex-direction: column; min-width: 0; min-height: 0; background: var(--bg-surface-1); }
  .header { height: var(--header-h); display: flex; align-items: center; gap: 8px; padding: 0 12px 0 8px; border-bottom: 1px solid var(--border-subtle); }
  .iconbtn { display: grid; place-items: center; width: 28px; height: 28px; border-radius: var(--radius-sm); color: var(--txt-3); }
  .iconbtn:hover { background: var(--bg-layer-1); color: var(--txt-1); }
  .crumbs { display: flex; align-items: center; gap: 6px; font-weight: 500; color: var(--txt-2); min-width: 0; }
  .crumbs .sep { color: var(--txt-placeholder); }
  .crumbs .current { color: var(--txt-1); display: flex; align-items: center; gap: 6px; }
  /* 數量標籤（「N 項」）：所有版面共用，樣式照看板欄位標題的數量 */
  .qty { display: inline-flex; align-items: center; flex: none; background: var(--border-subtle); color: var(--txt-2); font-size: 11px; font-weight: 700;
         line-height: 16px; border-radius: 6px; padding: 1px 7px; white-space: nowrap; letter-spacing: 0; }
  .header .spacer { flex: 1; }
  .layouts { display: flex; gap: 2px; background: var(--bg-layer-1); border-radius: var(--radius-md); padding: 2px; }
  .layouts button { display: grid; place-items: center; width: 26px; height: 24px; border-radius: var(--radius-sm); color: var(--txt-3); }
  .layouts button:hover { color: var(--txt-1); }
  .layouts button.active { background: var(--bg-surface-1); color: var(--brand); box-shadow: 0 1px 2px rgb(0 0 0 / 8%); }
  .btn { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border-radius: var(--radius-sm);
         border: 1px solid var(--border-strong); background: var(--bg-surface-1); color: var(--txt-2); font-size: 12px; font-weight: 500; white-space: nowrap; }
  .btn:hover { background: var(--bg-layer-1); }
  .btn.primary { background: var(--brand); border-color: var(--brand); color: #fff; }
  .btn.primary:hover { background: var(--brand-hover); }
  .btn.active { background: var(--brand-soft); border-color: var(--brand); color: var(--brand); }

  .menu { position: absolute; top: calc(100% + 4px); right: 0; z-index: 30; min-width: 260px; background: var(--bg-surface-1); border: 1px solid var(--border-strong);
          border-radius: var(--radius-md); box-shadow: 0 8px 24px rgb(0 0 0 / 12%); padding: 6px; font-weight: 400; }
  .menu.left { right: auto; left: 0; }
  .menu label, .menu a, .menu button.row { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: var(--radius-sm); cursor: pointer; width: 100%; text-align: left; font-size: 12px; white-space: nowrap; }
  .menu label:hover, .menu a:hover, .menu button.row:hover { background: var(--bg-layer-1); }
  .menu .title { font-size: 11px; color: var(--txt-3); padding: 4px 8px; }
  .menu .sep { border-top: 1px solid var(--border-subtle); margin: 4px 0; }
  .has-menu { position: relative; }

  .filterbar-slot:empty { display: none; }
  .main { flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: auto; background: var(--bg-canvas); }
  .msg { margin: 24px; padding: 16px; background: var(--bg-surface-1); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); }
  .msg.error { color: var(--red); }
  .main > .empty, .chart-side > .empty { margin: 48px auto; text-align: center; color: var(--txt-3); }
  .empty strong { display: block; color: var(--txt-1); font-size: 15px; margin-bottom: 4px; }

  .status-dot { width: 10px; height: 10px; border-radius: 50%; flex: none; border: 1.5px solid var(--txt-placeholder); }
  .status-dot.in_process { border-color: var(--amber); background: radial-gradient(circle, var(--amber) 35%, transparent 40%); }
  .status-dot.resolved { border-color: var(--brand); background: radial-gradient(circle, var(--brand) 35%, transparent 40%); }
  .status-dot.done { border-color: var(--green); background: var(--green); }

  .type-bug { color: var(--red); }
  .type-feature { color: var(--amber); }
  .type-task { color: var(--brand); }

  .toast { position: fixed; right: 20px; bottom: 20px; z-index: 100; padding: 10px 14px; border-radius: var(--radius-md);
           background: var(--txt-1); color: #fff; font-size: 13px; box-shadow: 0 4px 12px rgb(0 0 0 / 20%); max-width: 420px; }
  .toast.error { background: var(--red); }
`;
