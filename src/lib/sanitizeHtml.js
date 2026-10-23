const ALLOWED_TAGS = new Set([
  'br',
  'hr',
  'p',
  'div',
  'span',
  'b',
  'strong',
  'i',
  'em',
  'u',
  's',
  'del',
  'ul',
  'ol',
  'li',
  'blockquote',
  'code',
  'pre',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'a',
]);

const DROP_SUBTREE_TAGS = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'applet',
  'svg',
  'math',
  'form',
  'input',
  'button',
  'select',
  'textarea',
  'meta',
  'link',
  'base',
]);

const VOID_TAGS = new Set(['br', 'hr']);

const ESCAPED_SAFE_TAG_RE =
  /&lt;\/?(?:br|p|div|span|a|u|b|strong|i|em|ul|ol|li|code|pre|blockquote|hr)\b/i;
const RAW_SAFE_TAG_RE =
  /<\/?(?:br|p|div|span|a|u|b|strong|i|em|ul|ol|li|code|pre|blockquote|hr)\b/i;

function escapeHtmlText(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return escapeHtmlText(str).replace(/'/g, '&#39;');
}

/**
 * Linkifies bare URLs and markdown-style "[label](url)" links found in plain text nodes.
 * Input text is already HTML-escaped by the caller.
 */
function linkifyEscapedText(escapedText) {
  const mdRe = /\[([^\]]{1,200})\]\((https?:\/\/[^\s)]+)\)/g;
  const segments = [];
  let lastIndex = 0;
  let match;
  while ((match = mdRe.exec(escapedText)) !== null) {
    segments.push({ type: 'text', value: escapedText.slice(lastIndex, match.index) });
    const label = match[1];
    const url = match[2];
    segments.push({
      type: 'anchor',
      href: url,
      label: /^https?:\/\//i.test(label) ? url : label,
    });
    lastIndex = match.index + match[0].length;
  }
  segments.push({ type: 'text', value: escapedText.slice(lastIndex) });

  return segments
    .map((segment) => {
      if (segment.type === 'anchor') {
        return `<a href="${segment.href}" rel="noopener noreferrer" target="_blank">${segment.label}</a>`;
      }
      return segment.value.replace(/(https?:\/\/[^\s<]+)/g, (raw) => {
        const trimmed = raw.replace(/[.,;:!?)\]]+$/, '');
        const trailing = raw.slice(trimmed.length);
        return `<a href="${trimmed}" rel="noopener noreferrer" target="_blank">${trimmed}</a>${trailing}`;
      });
    })
    .join('');
}

function maybeDecodeEscapedMarkup(input) {
  const str = String(input ?? '');
  if (!str) return '';
  if (ESCAPED_SAFE_TAG_RE.test(str) && !RAW_SAFE_TAG_RE.test(str)) {
    return str
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#0*39;|&#x0*27;|&apos;/gi, "'")
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&');
  }
  return str;
}

function sanitizeHref(rawHref) {
  if (!rawHref || typeof rawHref !== 'string') return null;
  let trimmed = rawHref.trim();
  if (!trimmed) return null;

  // Roblox system messages sometimes ship markdown-flavoured hrefs such as
  // "[https://www.roblox.com/x](https://www.roblox.com/x)" or "[url](url)".
  if (/[[\]()]/.test(trimmed)) {
    const mdMatch =
      trimmed.match(/\]\(\s*(https?:\/\/[^\s)\]]+)\s*\)/i) ||
      trimmed.match(/(https?:\/\/[^\s)\]}]+)/i);
    if (mdMatch) {
      trimmed = mdMatch[1];
    }
  }

  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.href;
    }
  } catch (_) {
    return null;
  }
  return null;
}

function serializeSanitizedNode(node, insideAnchor = false) {
  if (!node) return '';
  // TEXT_NODE
  if (node.nodeType === 3) {
    const textValue = node.nodeValue || '';
    if (insideAnchor) {
      return escapeHtmlText(textValue);
    }
    return linkifyEscapedText(escapeHtmlText(textValue));
  }
  // ELEMENT_NODE
  if (node.nodeType !== 1) {
    return '';
  }

  const tag = (node.tagName || '').toLowerCase();
  if (DROP_SUBTREE_TAGS.has(tag)) {
    return '';
  }

  let inner = '';
  for (let i = 0; i < node.childNodes.length; i += 1) {
    inner += serializeSanitizedNode(node.childNodes[i], tag === 'a');
  }

  if (!ALLOWED_TAGS.has(tag)) {
    return inner;
  }

  if (VOID_TAGS.has(tag)) {
    return `<${tag}>`;
  }

  if (tag === 'a') {
    const safeHref = sanitizeHref(node.getAttribute('href'));
    if (!safeHref) {
      return inner;
    }
    let extraAttrs = ' rel="noopener noreferrer"';
    if (/^https?:\/\//i.test(safeHref)) {
      try {
        const host = new URL(safeHref).hostname.toLowerCase();
        if (host !== 'www.roblox.com' && host !== 'web.roblox.com') {
          extraAttrs += ' target="_blank"';
        }
      } catch (_) {}
    }
    return `<a href="${escapeAttr(safeHref)}"${extraAttrs}>${inner}</a>`;
  }

  return `<${tag}>${inner}</${tag}>`;
}

export function sanitizeRichHtml(rawInput, { convertNewlines = false } = {}) {
  const raw = maybeDecodeEscapedMarkup(rawInput);
  if (!raw) return '';

  let prepared = raw;
  if (convertNewlines) {
    const hasAnyTag = /<\/?[a-z][^>]*>/i.test(prepared);
    if (!hasAnyTag) {
      // Plain-text body: escape it first, then preserve paragraph breaks.
      prepared = escapeHtmlText(prepared).replace(/\r?\n/g, '<br>');
    } else {
      // HTML body: keep markup, just normalize stray newlines into <br>.
      prepared = prepared
        .replace(/<br\s*\/?>\r?\n/gi, '<br>')
        .replace(/\r?\n/g, '<br>');
    }
  }

  if (typeof DOMParser === 'undefined') {
    return escapeHtmlText(raw).replace(/\r?\n/g, '<br>');
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${prepared}</div>`, 'text/html');
  const root = doc.body && doc.body.firstChild ? doc.body.firstChild : doc.body;
  if (!root) return '';

  let out = '';
  for (let i = 0; i < root.childNodes.length; i += 1) {
    out += serializeSanitizedNode(root.childNodes[i], false);
  }
  return out;
}

export function stripHtmlToText(rawInput) {
  const raw = maybeDecodeEscapedMarkup(rawInput);
  if (!raw) return '';
  const withoutMarkdown = raw.replace(
    /\[([^\]]{1,200})\]\((https?:\/\/[^\s)]+)\)/gi,
    (_m, label, url) => (/^https?:\/\//i.test(label) ? url : label)
  );
  const spaced = withoutMarkdown.replace(/<\s*(?:br|\/p|\/div|\/li|\/tr|\/h[1-6])\b[^>]*>/gi, ' ');
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${spaced}</div>`, 'text/html');
    return (doc.body?.textContent || '').replace(/\s+/g, ' ').trim();
  }
  return spaced.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
