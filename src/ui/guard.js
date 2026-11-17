// 寫入保險：只有 WRITABLE_PROJECTS 裡的專案可以寫（彈出視窗編輯、看板拖曳改狀態、行事曆 / Gantt 拖曳改日期）。
// 其他專案一律唯讀：彈出視窗不顯示編輯控制項，拖曳時擋下並提示。正式開放時再把其他專案加進來。
export const WRITABLE_PROJECTS = new Set(['DESIGN_TEST']);

export function canWrite(projectKey) {
  return WRITABLE_PROJECTS.has(String(projectKey));
}

export function assertWritable(_id, projectKey, serialNumber) {
  if (!canWrite(projectKey)) {
    throw new Error(`目前只有 DESIGN_TEST 專案可以編輯（這張是 ${projectKey}-${serialNumber}）`);
  }
}
