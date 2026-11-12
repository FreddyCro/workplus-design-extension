import { test } from 'node:test';
import assert from 'node:assert/strict';
import { statusStyle, priorityStyle, memberColor, labelColor, MEMBER_COLORS } from '../src/ui/palette.js';

test('statusStyle：名稱優先於 category', () => {
  assert.deepEqual(statusStyle({ name: '開發中', category: { name: 'in_process' } }), { color: '#8b5cf6', glyph: '◐' });
  assert.deepEqual(statusStyle({ name: 'In Process', category: { name: 'in_process' } }), { color: '#5094dc', glyph: '◑' });
  assert.deepEqual(statusStyle({ name: 'Done', category: { name: 'done' } }), { color: '#30a46c', glyph: '●' });
});

test('statusStyle：名稱查不到退回 category；都沒有退回灰色 ○', () => {
  assert.deepEqual(statusStyle({ name: 'QA', category: { name: 'resolved' } }), { color: '#e79b3d', glyph: '◈' });
  assert.deepEqual(statusStyle(null), { color: '#aaa', glyph: '○' });
});

test('priorityStyle', () => {
  assert.deepEqual(priorityStyle('HIGH'), { label: '高', color: '#e54d2e', bg: '#fff0ee' });
  assert.equal(priorityStyle('CRITICAL').label, '緊急');
  assert.equal(priorityStyle(null).label, '—');
});

test('memberColor：同帳號永遠同色、在色表內、空值灰', () => {
  assert.equal(memberColor('freddyyang'), memberColor('freddyyang'));
  assert.ok(MEMBER_COLORS.includes(memberColor('freddyyang')));
  assert.equal(memberColor(undefined), '#e8e8e8');
});

test('labelColor：合法 hex → 類型表 → hash', () => {
  assert.equal(labelColor({ text: 'Enews', color: '#123456' }), '#123456');
  assert.equal(labelColor({ text: 'Enews', color: 'red' }), '#06b6d4');
  assert.equal(labelColor({ text: 'Enews', color: '' }), '#06b6d4');
  assert.match(labelColor({ text: 'whatever' }), /^oklch\(0\.62 0\.13 \d+\)$/);
});

test('labelColor：5 位 hex 不合法，退回類型表', () => {
  assert.equal(labelColor({ text: 'Enews', color: '#12345' }), '#06b6d4');
});
