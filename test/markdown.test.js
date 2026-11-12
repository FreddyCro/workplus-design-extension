import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMarkdown, parseInline } from '../src/ui/markdown.js';

test('段落與標題', () => {
  assert.deepEqual(parseMarkdown('# 標題\n\n第一段\n第二行\n\n## 小標'), [
    { type: 'heading', level: 1, inline: [{ type: 'text', text: '標題' }] },
    { type: 'paragraph', inline: [{ type: 'text', text: '第一段\n第二行' }] },
    { type: 'heading', level: 2, inline: [{ type: 'text', text: '小標' }] },
  ]);
});

test('清單', () => {
  assert.deepEqual(parseMarkdown('- a\n- b\n\n1. x\n2. y'), [
    { type: 'list', ordered: false, items: [[{ type: 'text', text: 'a' }], [{ type: 'text', text: 'b' }]] },
    { type: 'list', ordered: true, items: [[{ type: 'text', text: 'x' }], [{ type: 'text', text: 'y' }]] },
  ]);
});

test('code fence 原樣保留，未閉合也不會壞', () => {
  assert.deepEqual(parseMarkdown('```js\nconst a = "<b>";\n```\n後面'), [
    { type: 'code', lang: 'js', text: 'const a = "<b>";' },
    { type: 'paragraph', inline: [{ type: 'text', text: '後面' }] },
  ]);
  assert.deepEqual(parseMarkdown('```\n沒關'), [{ type: 'code', lang: '', text: '沒關' }]);
});

test('行內：粗體、斜體、code、連結', () => {
  assert.deepEqual(parseInline('a **b** *c* `d` [e](https://x.y/z)'), [
    { type: 'text', text: 'a ' },
    { type: 'strong', text: 'b' },
    { type: 'text', text: ' ' },
    { type: 'em', text: 'c' },
    { type: 'text', text: ' ' },
    { type: 'code', text: 'd' },
    { type: 'text', text: ' ' },
    { type: 'link', text: 'e', href: 'https://x.y/z' },
  ]);
});

test('裸網址也變連結', () => {
  assert.deepEqual(parseInline('看 https://office.synology.com/#a 這個'), [
    { type: 'text', text: '看 ' },
    { type: 'link', text: 'https://office.synology.com/#a', href: 'https://office.synology.com/#a' },
    { type: 'text', text: ' 這個' },
  ]);
});

test('javascript: 連結降級成純文字；HTML 標籤當純文字', () => {
  assert.deepEqual(parseInline('[x](javascript:alert(1))'), [{ type: 'text', text: '[x](javascript:alert(1))' }]);
  assert.deepEqual(parseInline('<script>alert(1)</script>'), [{ type: 'text', text: '<script>alert(1)</script>' }]);
});

test('圖片：附件 id 轉成 /file/static?id=…&filename=（檔名要帶，否則 404），http(s) 網址照用，其他降級成替代文字', () => {
  assert.deepEqual(parseInline('![強制比例.PNG](d25cf72d-1d14-48f6-ac55-062f5e869a93)'), [
    { type: 'image', alt: '強制比例.PNG', src: '/file/static?id=d25cf72d-1d14-48f6-ac55-062f5e869a93&filename=%E5%BC%B7%E5%88%B6%E6%AF%94%E4%BE%8B.PNG' },
  ]);
  assert.deepEqual(parseInline('![x](https://x/y.png)'), [{ type: 'image', alt: 'x', src: 'https://x/y.png' }]);
  assert.deepEqual(parseInline('![x](javascript:alert(1))'), [{ type: 'text', text: '![x](javascript:alert(1))' }]);
  assert.deepEqual(parseInline('![x](notaurl)'), [{ type: 'text', text: '![x](notaurl)' }]);
});

test('@提及變成 mention 節點，email 裡的 @ 不算', () => {
  assert.deepEqual(parseInline('@maoliihsu 看一下 a@b.com'), [
    { type: 'mention', text: '@maoliihsu' },
    { type: 'text', text: ' 看一下 a@b.com' },
  ]);
});

test('刪除線', () => {
  assert.deepEqual(parseInline('~~舊~~'), [{ type: 'del', text: '舊' }]);
});

test('引用與分隔線', () => {
  assert.deepEqual(parseMarkdown('> 引一句\n\n---\n\n後面'), [
    { type: 'blockquote', inline: [{ type: 'text', text: '引一句' }] },
    { type: 'hr' },
    { type: 'paragraph', inline: [{ type: 'text', text: '後面' }] },
  ]);
});

test('stripAttachmentMarkup：拿掉 $$attachment … $$ 包裝，保留裡面的圖片語法', async () => {
  const { stripAttachmentMarkup } = await import('../src/layouts/issue-peek.js');
  assert.equal(stripAttachmentMarkup('前 $$attachment ![a.png](id1)$$ 後'), '前 ![a.png](id1) 後');
  assert.equal(stripAttachmentMarkup('$$attachment ![a.png](id1)'), '![a.png](id1)');
});
