import { marked } from 'marked';
import { FilterXSS } from 'xss';

// Pure JavaScript sanitizer: no DOM emulation or CommonJS-to-ESM imports.
const articleTags = [
  'a', 'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'del',
  'ul', 'ol', 'li', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'pre', 'code', 'img', 'figure', 'figcaption', 'hr',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'span', 'div', 'sub', 'sup', 'mark',
];
const articleAttributes = ['href', 'src', 'alt', 'title', 'colspan', 'rowspan', 'scope', 'align'];
const articleSanitizer = new FilterXSS({
  whiteList: Object.fromEntries(articleTags.map(tag => [tag, articleAttributes])),
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style', 'iframe', 'object', 'embed', 'template', 'noscript'],
  css: false,
});

export function sanitizeHtml(rawHtml: string): string {
  const fallback = '<p>There is no content for this article yet.</p>';
  if (!rawHtml || !String(rawHtml).trim()) return fallback;

  let clean = articleSanitizer.process(String(rawHtml));

  // Ensure table wrapping for horizontal scroll on mobile
  clean = clean.replace(/<table(\b[^>]*)>/gi, '<div class="table-wrap"><table$1>');
  clean = clean.replace(/<\/table>/gi, '</table></div>');

  return clean || fallback;
}

export function renderMarkdown(markdown: string): string {
  const source = String(markdown || '').trim();
  if (!source) return '<p>There is no content for this article yet.</p>';

  try {
    const rawHtml = marked.parse(source, { gfm: true, breaks: false }) as string;
    return sanitizeHtml(rawHtml);
  } catch (error) {
    console.warn('[Markdown] Parsing failed:', error);
    // Escape fallback text
    const escaped = source
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\r?\n/g, '<br>');
    return `<p>${escaped}</p>`;
  }
}

