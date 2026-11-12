// 最小的 Markdown 解析器：只產生 AST，DOM 由 renderMarkdown 建（永遠用 textContent / 屬性，不用 innerHTML）。
// 支援：# 標題、段落、- / 1. 清單、> 引用、--- 分隔線、``` code fence、**粗體**、*斜體*、~~刪除~~、`code`、
// [文字](http(s)://…)、裸網址、@提及、圖片（WorkPlus 附件 id → /file/static?id=…&filename=…，或 http(s) 網址）。
// javascript: 等非 http(s) 連結降級成純文字；HTML 標籤一律當文字。

export function parseMarkdown(text) {
  const lines = (text ?? '').replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let i = 0;
  const listMatch = (l) => l.match(/^\s*(?:([-*+])|(\d+)[.)])\s+(.*)$/);
  const isBlockStart = (l) => /^```/.test(l) || /^#{1,6}\s/.test(l) || /^\s*>/.test(l) || /^\s*(-{3,}|\*{3,})\s*$/.test(l) || !!listMatch(l);
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '') {
      i++;
      continue;
    }
    const fence = line.match(/^```(\S*)\s*$/);
    if (fence) {
      const code = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) code.push(lines[i++]);
      i++; // 跳過結尾的 ```（沒有也沒關係）
      blocks.push({ type: 'code', lang: fence[1], text: code.join('\n') });
      continue;
    }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, inline: parseInline(heading[2].trim()) });
      i++;
      continue;
    }
    if (/^\s*>/.test(line)) {
      const quote = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) quote.push(lines[i++].replace(/^\s*>\s?/, ''));
      blocks.push({ type: 'blockquote', inline: parseInline(quote.join('\n')) });
      continue;
    }
    if (listMatch(line)) {
      const ordered = !!listMatch(line)[2];
      const items = [];
      while (i < lines.length && listMatch(lines[i]) && !!listMatch(lines[i])[2] === ordered) {
        items.push(parseInline(listMatch(lines[i])[3].trim()));
        i++;
      }
      blocks.push({ type: 'list', ordered, items });
      continue;
    }
    const para = [];
    while (i < lines.length && lines[i].trim() !== '' && !isBlockStart(lines[i])) para.push(lines[i++]);
    blocks.push({ type: 'paragraph', inline: parseInline(para.join('\n')) });
  }
  return blocks;
}

const SAFE_HREF = /^https?:\/\//i;
const ATTACHMENT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const INLINE_RE =
  /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(~~([^~]+)~~)|(`([^`]+)`)|(!\[([^\]]*)\]\(([^)\s]*)\))|(\[([^\]]+)\]\(([^)\s]*)\))|(https?:\/\/[^\s<>()\]]+)|((?:^|(?<=[\s(（,，、]))@([A-Za-z0-9_.-]+))/g;

// WorkPlus 附件的實際網址（原前端的寫法）：沒帶 filename 會 404
export function attachmentUrl(id, filename) {
  return `/file/static?id=${encodeURIComponent(id)}&filename=${encodeURIComponent(filename)}`;
}

export function parseInline(text) {
  const out = [];
  let last = 0;
  const pushText = (t) => {
    if (!t) return;
    const prev = out[out.length - 1];
    if (prev?.type === 'text') prev.text += t;
    else out.push({ type: 'text', text: t });
  };
  for (const m of text.matchAll(INLINE_RE)) {
    pushText(text.slice(last, m.index));
    last = m.index + m[0].length;
    if (m[1]) out.push({ type: 'strong', text: m[2] });
    else if (m[3]) out.push({ type: 'em', text: m[4] });
    else if (m[5]) out.push({ type: 'del', text: m[6] });
    else if (m[7]) out.push({ type: 'code', text: m[8] });
    else if (m[9]) {
      const alt = m[10];
      const src = m[11];
      if (ATTACHMENT_ID.test(src)) out.push({ type: 'image', alt, src: attachmentUrl(src, alt) });
      else if (SAFE_HREF.test(src)) out.push({ type: 'image', alt, src });
      else pushText(m[0]); // 不安全或看不懂的來源：原文照印，不當圖片
    } else if (m[12]) {
      if (SAFE_HREF.test(m[14])) out.push({ type: 'link', text: m[13], href: m[14] });
      else pushText(m[0]);
    } else if (m[15]) out.push({ type: 'link', text: m[15], href: m[15] });
    else if (m[16]) out.push({ type: 'mention', text: `@${m[17]}` });
  }
  pushText(text.slice(last));
  return out;
}

// AST → DOM
export function renderMarkdown(text) {
  const frag = document.createDocumentFragment();
  for (const block of parseMarkdown(text)) {
    let node;
    switch (block.type) {
      case 'heading':
        node = document.createElement(`h${Math.min(block.level + 2, 6)}`);
        node.append(renderInline(block.inline));
        break;
      case 'code':
        node = document.createElement('pre');
        node.append(Object.assign(document.createElement('code'), { textContent: block.text }));
        break;
      case 'hr':
        node = document.createElement('hr');
        break;
      case 'blockquote':
        node = document.createElement('blockquote');
        node.append(renderInline(block.inline));
        break;
      case 'list':
        node = document.createElement(block.ordered ? 'ol' : 'ul');
        for (const item of block.items) {
          const li = document.createElement('li');
          li.append(renderInline(item));
          node.append(li);
        }
        break;
      default:
        node = document.createElement('p');
        node.append(renderInline(block.inline));
    }
    frag.append(node);
  }
  return frag;
}

function renderInline(inline) {
  const frag = document.createDocumentFragment();
  for (const n of inline) {
    switch (n.type) {
      case 'strong':
      case 'em':
      case 'code':
      case 'del':
        frag.append(Object.assign(document.createElement(n.type), { textContent: n.text }));
        break;
      case 'mention': {
        const s = document.createElement('span');
        s.className = 'mention';
        s.textContent = n.text;
        frag.append(s);
        break;
      }
      case 'link': {
        const a = document.createElement('a');
        a.textContent = n.text;
        a.href = n.href;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        frag.append(a);
        break;
      }
      case 'image': {
        // 圖片包在連結裡，點了開新分頁看原圖
        const a = document.createElement('a');
        a.href = n.src;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.className = 'img';
        const img = document.createElement('img');
        img.src = n.src;
        img.alt = n.alt;
        img.title = n.alt;
        img.loading = 'lazy';
        img.addEventListener('error', () => {
          a.replaceChildren(document.createTextNode(`[圖片載入失敗：${n.alt}]`));
        });
        a.append(img);
        frag.append(a);
        break;
      }
      default:
        frag.append(document.createTextNode(n.text));
    }
  }
  return frag;
}
