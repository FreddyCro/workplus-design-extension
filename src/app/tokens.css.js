// Plane 的設計 token（淺色值，取自 @makeplane/propel 0.9.9 的 variables.css）。
// 只取數值，不用 Plane 的程式碼。深色主題之後只要在 :host([data-theme="dark"]) 補一組。
export const TOKENS = `
  :host {
    --bg-canvas: oklch(0.9614 0.0013 286.38);
    --bg-surface-1: #fff;
    --bg-surface-2: oklch(0.9911 0 0);
    --bg-layer-1: oklch(0.9821 0 0);
    --bg-layer-2: oklch(0.9396 0.0017 247.84);
    --brand: oklch(0.4799 0.1158 242.91);
    --brand-hover: oklch(0.4347 0.1041 242.48);
    --brand-soft: oklch(0.9319 0.0316 255.59);
    --txt-1: oklch(0.1689 0.0021 286.18);
    --txt-2: oklch(0.3225 0.0045 219.62);
    --txt-3: oklch(0.4176 0.0072 239.98);
    --txt-placeholder: oklch(0.4928 0.0079 233.77);
    --txt-on-brand: #fff;
    --border-subtle: oklch(0.9396 0.0017 247.84);
    --border-strong: oklch(0.8782 0.0035 247.86);
    --green: oklch(0.6567 0.1599 148.98);
    --amber: oklch(0.6671 0.1685 53.38);
    --red: oklch(0.5954 0.1956 28.51);
    --font: Inter, system-ui, -apple-system, "Segoe UI", "Noto Sans TC", sans-serif;
    --radius-sm: 4px;
    --radius-md: 6px;
    --radius-lg: 8px;
    --top-h: 44px;
    --header-h: 44px;
  }
`;
