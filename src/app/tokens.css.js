// 設計 token。內容區的值取自設計師原型（temp/PM_Platform_calendar 1.html）；
// 側欄（rail + 專案面板）與頂欄凍結成 --side-* / --top-*，值是第二階段的 Plane 值，改其他 token 不會波及。
// 深色主題之後只要在 :host([data-theme="dark"]) 補一組。
export const TOKENS = `
  :host {
    --bg-canvas: #f5f5f3;
    --bg-surface-1: #fff;
    --bg-surface-2: #fafafa;
    --bg-layer-1: #fafafa;
    --bg-layer-2: #f4f4f4;
    --brand: #5094dc;
    --brand-hover: #3f7fc6;
    --brand-soft: #eef4ff;
    --brand-faint: #f0f5ff;
    --txt-1: #1a1a1a;
    --txt-2: #555;
    --txt-3: #888;
    --txt-4: #bbb;
    --txt-placeholder: #bbb;
    --txt-on-brand: #fff;
    --border-subtle: #ebebeb;
    --border-strong: #e5e5e5;
    --border-focus: #b8ccf0;
    --green: #30a46c;
    --amber: #e79b3d;
    --red: #e54d2e;
    --green-soft: #e8f5ee;
    --amber-soft: #fff8ee;
    --red-soft: #fff0ee;
    --font: Inter, system-ui, -apple-system, "Segoe UI", "Noto Sans TC", sans-serif;
    --radius-sm: 5px;
    --radius-md: 8px;
    --radius-lg: 10px;
    --radius-xl: 16px;
    --shadow-card: 0 1px 3px rgb(0 0 0 / 4%);
    --shadow-card-hover: 0 4px 16px rgb(0 0 0 / 8%);
    --shadow-modal: 0 24px 64px rgb(0 0 0 / 16%);
    --top-h: 44px;
    --header-h: 44px;

    /* 凍結：側欄與頂欄（第二階段的 Plane 值） */
    --side-bg: oklch(0.9911 0 0);
    --side-bg-rail: #fff;
    --side-hover: oklch(0.9396 0.0017 247.84);
    --side-txt: oklch(0.3225 0.0045 219.62);
    --side-txt-dim: oklch(0.4176 0.0072 239.98);
    --side-txt-strong: oklch(0.1689 0.0021 286.18);
    --side-border: oklch(0.9396 0.0017 247.84);
    --top-bg: #fff;
    --top-border: oklch(0.9396 0.0017 247.84);
    --top-txt: oklch(0.3225 0.0045 219.62);
    --top-txt-dim: oklch(0.4176 0.0072 239.98);
    --top-search-border: oklch(0.8782 0.0035 247.86);
    --top-hover: oklch(0.9821 0 0);
  }
`;
