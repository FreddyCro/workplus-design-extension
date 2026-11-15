// fixture 的對照鍵：GraphQL 查詢（壓掉空白）＋ variables（key 排序後的 JSON）。
// server.mjs 回應 /api 時用它查表；record.js 和 make-sample.mjs 只存原始的 query / variables，鍵在載入時才算。

export function fixtureKey(query, variables) {
  return `${normalizeQuery(query)}\n${stableStringify(variables ?? null)}`;
}

export function normalizeQuery(query) {
  return String(query ?? '').replace(/\s+/g, ' ').trim();
}

export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).filter((k) => value[k] !== undefined).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function isMutation(query) {
  return /^mutation\b/.test(normalizeQuery(query));
}

// 寫入一律回假成功：api.js 的 updateDueDate / updateStatus 只檢查 modifiedCount === 1
export function fakeMutationResponse() {
  return { data: { updateIssue: { modifiedCount: 1 } } };
}
