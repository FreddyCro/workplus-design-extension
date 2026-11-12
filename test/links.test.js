import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findFigmaUrl } from '../src/ui/links.js';

test('findFigmaUrl', () => {
  assert.equal(findFigmaUrl('沒有連結'), null);
  assert.equal(findFigmaUrl('figma.com/file/abc 沒有 scheme'), null);
  assert.equal(findFigmaUrl('看 https://www.figma.com/design/abc?node=1 和 https://figma.com/x'), 'https://www.figma.com/design/abc?node=1');
  assert.equal(findFigmaUrl('[稿](https://www.figma.com/design/abc?node-id=1-2)'), 'https://www.figma.com/design/abc?node-id=1-2');
  assert.equal(findFigmaUrl(null), null);
});

test('findFigmaUrl：緊接中文或結尾標點不吃進網址', () => {
  assert.equal(findFigmaUrl('請看https://www.figma.com/design/abc/Name?node-id=1-2，謝謝'), 'https://www.figma.com/design/abc/Name?node-id=1-2');
  assert.equal(findFigmaUrl('稿在 https://www.figma.com/file/abc.'), 'https://www.figma.com/file/abc');
});
