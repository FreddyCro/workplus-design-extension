// 驗證期間的寫入保險：只允許寫 DG-90（955801）。確認正式使用時把 WRITABLE_IDS 設成 null。
export const WRITABLE_IDS = new Set(['955801']);

export function assertWritable(id, projectKey, serialNumber) {
  if (WRITABLE_IDS && !WRITABLE_IDS.has(String(id))) {
    throw new Error(`測試期間只允許寫 DG-90（這張是 ${projectKey}-${serialNumber}）`);
  }
}
