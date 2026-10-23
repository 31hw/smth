import React from 'react';
import DOMPurify from 'dompurify';

export function matter(raw = '') {
  const str = String(raw || '');
  const m = str.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!m) return { data: {}, content: str };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      data[k] = v;
    }
  }
  return { data, content: m[2] };
}

function simpleMarkdownToHtml(md = '') {
  return String(md || '')
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\n\n+/g, '</p><p>');
}

export default function ReactMarkdown({ children }) {
  const html = DOMPurify.sanitize('<p>' + simpleMarkdownToHtml(children) + '</p>');
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

export const rehypeRaw = () => {};
export const remarkGfm = () => {};
