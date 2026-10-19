import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeHtml(rawHtml: string): string {
  const fallback = '<p>There is no content for this article yet.</p>';
  if (!rawHtml || !String(rawHtml).trim()) return fallback;

  // Sanitize with strict whitelist matching legacy Hisbo
  let clean = DOMPurify.sanitize(String(rawHtml), {
    ALLOWED_TAGS: [
      'A', 'P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'DEL',
      'UL', 'OL', 'LI', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
      'PRE', 'CODE', 'IMG', 'FIGURE', 'FIGCAPTION', 'HR',
      'TABLE', 'THEAD', 'TBODY', 'TFOOT', 'TR', 'TH', 'TD',
      'SPAN', 'DIV', 'SUB', 'SUP', 'MARK'
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'colspan', 'rowspan', 'scope', 'align']
  });

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

