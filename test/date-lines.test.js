import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDateLine, setDateLine, DATE_LABELS } from '../src/ui/date-lines.js';

const d = (y, m, day) => new Date(y, m - 1, day).getTime();

test('parseDateLine：空值與沒有那一行回 null', () => {
  assert.equal(parseDateLine(null, '開始日期'), null);
  assert.equal(parseDateLine('', '開始日期'), null);
  assert.equal(parseDateLine('只有描述', '開始日期'), null);
});

test('parseDateLine：粗體 / 底線 / 無粗體、全形半形冒號、前後空白、各種分隔符都接受，回當地午夜', () => {
  assert.equal(parseDateLine('**開始日期**：2026-11-01', '開始日期'), d(2026, 11, 1));
  assert.equal(parseDateLine('__開始日期__: 2026/11/1', '開始日期'), d(2026, 11, 1));
  assert.equal(parseDateLine('  開始日期 ：2026.11.01  ', '開始日期'), d(2026, 11, 1));
  assert.equal(parseDateLine('*開始日期*：2026-1-5', '開始日期'), d(2026, 1, 5));
});

test('parseDateLine：多行符合取最後一行；CRLF；只認自己的標籤', () => {
  const md = '前言\r\n**開始日期**：2026-01-01\r\n中間\r\n**開始日期**：2026-02-02\r\n**收到需求**：2026-03-03';
  assert.equal(parseDateLine(md, '開始日期'), d(2026, 2, 2));
  assert.equal(parseDateLine(md, '收到需求'), d(2026, 3, 3));
  assert.equal(parseDateLine(md, '設計初稿'), null);
});

test('parseDateLine：不合法的日期當作沒有', () => {
  assert.equal(parseDateLine('**開始日期**：2026-02-30', '開始日期'), null);
  assert.equal(parseDateLine('**開始日期**：2026-13-01', '開始日期'), null);
  assert.equal(parseDateLine('**開始日期**：明天', '開始日期'), null);
});

test('parseDateLine：行內有其他文字的不算', () => {
  assert.equal(parseDateLine('開始日期：2026-11-01 之後再說', '開始日期'), null);
});

test('setDateLine：加在尾端、前面空一行；沒有結尾換行也正常', () => {
  assert.equal(setDateLine('描述', '開始日期', d(2026, 11, 1)), '描述\n\n**開始日期**：2026-11-01');
  assert.equal(setDateLine('描述\n', '開始日期', d(2026, 11, 1)), '描述\n\n**開始日期**：2026-11-01');
  assert.equal(setDateLine('', '開始日期', d(2026, 11, 1)), '**開始日期**：2026-11-01');
  assert.equal(setDateLine(null, '開始日期', d(2026, 11, 1)), '**開始日期**：2026-11-01');
});

test('setDateLine：冪等；只換自己的標籤那行，其他行（含附件標記）一字不動', () => {
  const md = '圖 $$attachment ![a.png](id1)$$\n\n**收到需求**：2026-03-03\n**開始日期**：2026-01-01';
  const once = setDateLine(md, '開始日期', d(2026, 11, 1));
  assert.equal(once, '圖 $$attachment ![a.png](id1)$$\n\n**收到需求**：2026-03-03\n\n**開始日期**：2026-11-01');
  assert.equal(setDateLine(once, '開始日期', d(2026, 11, 1)), once);
});

test('setDateLine：清除只移除那幾行，不留多餘空行', () => {
  const md = '描述\n\n**開始日期**：2026-01-01\n**開始日期**：2026-02-02';
  assert.equal(setDateLine(md, '開始日期', null), '描述');
  assert.equal(setDateLine('**開始日期**：2026-01-01', '開始日期', null), '');
});

test('DATE_LABELS 包含四個設計師日期與開始日期', () => {
  assert.deepEqual(DATE_LABELS, ['開始日期', '收到需求', '設計初稿', '窗口確認']);
});
