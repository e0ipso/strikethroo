/**
 * The single markdown-rendering and HTML-sanitization boundary for the SPA.
 *
 * This is the ONLY place in `src/web/` where markdown is turned into HTML and
 * where that HTML is sanitized. No screen may render markdown directly or wire
 * up its own parser/sanitizer — they import {@link renderMarkdown} from here so
 * the rendering rules and the sanitization policy live in exactly one place and
 * cannot diverge or be bypassed per-screen. The CodeMirror editor is outside
 * this boundary on purpose: it shows raw editable source and never renders it.
 *
 * What happens, exactly:
 *
 * 1. `marked` parses the markdown and PASSES RAW HTML THROUGH. Authored
 *    `<form>`, `<img onerror>`, `<div class="fixed inset-0">` and the like come
 *    out of the parser as live markup, not escaped text. marked is not a
 *    security layer here and is not configured as one.
 * 2. DOMPurify is the enforcing layer, with an explicit allowlist. Only the
 *    tags in {@link ALLOWED_TAGS} and the attributes in {@link ALLOWED_ATTR}
 *    survive; everything else is removed (text content of a removed element is
 *    kept, except for the script/style/media/frame family DOMPurify always
 *    drops whole). That removes forms and every form control, iframes,
 *    objects/embeds, video/audio, link/meta/base, inline `<svg>`/`<math>`,
 *    `style` attributes, event handlers, and every author-supplied `id`.
 * 3. {@link uponSanitizeAttribute} narrows the allowed attributes further, per
 *    tag: `class` is kept only as the renderer-emitted `md-task` /
 *    `md-task--done` pair on `<li>` and a single `language-*` token on
 *    `<code>` — any other class, including Tailwind utilities an author might
 *    use to paint an overlay, is dropped (an author who hand-writes those two
 *    class names gets the same inert strikethrough styling, nothing more);
 *    `align` only on table cells with a left/center/right value; `start` only
 *    as a number on `<ol>`; `open` only on `<details>`; `href`/`src`/`alt`/
 *    `title` only on `<a>` and `<img>`, with the URL policy below.
 * 4. URL policy. `a[href]` keeps `http:`, `https:`, `mailto:`, same-document
 *    `#…` fragments, and relative paths; anything else (`javascript:`,
 *    `data:`, `vbscript:`, protocol-relative `//host`) is removed, leaving
 *    inert link text. `img[src]` keeps same-origin relative paths and
 *    `data:image/(png|gif|jpeg|webp);base64,…` URIs up to
 *    {@link MAX_DATA_IMAGE_CHARS}; a remote `src` is removed and the image is
 *    replaced by its alt text, or by a plain link to the URL when it has no
 *    alt, so the document never triggers a third-party load on its own.
 * 5. {@link afterSanitizeAttributes} gives every surviving `http:`/`https:`
 *    link `rel="noopener noreferrer"` and `target="_blank"`, so an external
 *    page never gets an opener handle on the viewer.
 *
 * The hooks below run on a private DOMPurify instance, not on the shared default
 * one. Hooks are per-instance, and mermaid sanitizes its rendered SVG through the
 * default instance under `securityLevel: 'strict'`; a prose-only attribute policy
 * registered there would strip every `viewBox`, `d`, and `x` from a diagram and
 * leave a blank canvas. The instance is created once at module load, which is
 * safe because this module is browser-only (its one importer is `ReaderProse`).
 *
 * The mermaid renderer is deliberately NOT imported here. It lives behind a lazy
 * `import()` in `./mermaid.ts` so it stays off the dependency graph of every
 * markdown consumer (the Reader route does not ship mermaid).
 */

import { marked } from 'marked';
import createDOMPurify from 'dompurify';

/**
 * This module's own DOMPurify instance. Hooks are per-instance, so registering
 * the prose policy here cannot reach mermaid's sanitize pass on the default one.
 */
const purify = createDOMPurify(window);

/**
 * GFM task lists (`- [ ]` / `- [x]`) are authored throughout the plan and task
 * markdown, but a checkbox is an *input* — a control the reader expects to
 * toggle. In a read-only viewer it is a lie: a disabled `<input type=checkbox>`
 * dressed up as a done/not-done indicator the user can never change. So we strip
 * the checkbox entirely and convey task state the way the rest of the app does —
 * `done` items render as strikethrough text (`.md-task--done`), open items as a
 * plain list row (`.md-task`). Normal and ordered list items are untouched.
 */
marked.use({
  renderer: {
    // Defense in depth: should any path still ask for a checkbox, emit nothing.
    checkbox() {
      return '';
    },
    listitem(item) {
      // Mirror marked's own list-item body rendering (`parser.parse` with the
      // item's loose flag) so nested lists and multi-paragraph items render
      // correctly — `parseInline` alone throws on a nested `list` token. The
      // only departure from the default is dropping the checkbox `<input>`.
      const body = this.parser.parse(item.tokens, Boolean(item.loose));
      if (item.task) {
        return `<li class="md-task${item.checked ? ' md-task--done' : ''}">${body}</li>\n`;
      }
      return `<li>${body}</li>\n`;
    },
  },
});

/** Inert prose structure. No controls, no embeds, no `svg`/`math`, no `div`/`span`. */
const ALLOWED_TAGS = [
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'ul',
  'ol',
  'li',
  'strong',
  'em',
  'b',
  'i',
  'code',
  'pre',
  'blockquote',
  'hr',
  'br',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'details',
  'summary',
  'a',
  'img',
  'del',
  's',
  'sup',
  'sub',
  'kbd',
];

/** Every attribute that may survive at all; `uponSanitizeAttribute` narrows per tag. */
const ALLOWED_ATTR = ['href', 'title', 'alt', 'src', 'align', 'class', 'open', 'start'];

/** The classes the custom `listitem` renderer emits on task-list items. */
const TASK_ITEM_CLASSES = new Set(['md-task', 'md-task--done']);

/** The fence info-string class marked emits on `<pre><code>`. */
const CODE_LANGUAGE_CLASS_RE = /^language-[a-z0-9_+#.-]+$/i;

/** Bounded inline raster images; non-base64 and SVG data URIs are rejected. */
const DATA_IMAGE_RE = /^data:image\/(?:png|gif|jpeg|webp);base64,[a-z0-9+/]+=*$/i;
const MAX_DATA_IMAGE_CHARS = 100 * 1024;

/** A URL that names a scheme (`http:`, `javascript:`, …) as opposed to a path. */
const SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;

/** Placeholder origin: any relative reference resolves inside it, anything else leaves it. */
const RELATIVE_BASE = new URL('https://relative.invalid/doc/');

/**
 * True when `value` is a same-document fragment or a path relative to the
 * document (no scheme, not protocol-relative). Resolving against a throwaway
 * origin and checking the origin survived catches every host-changing form the
 * URL parser accepts — `//host`, `\\host`, embedded newlines — without
 * hand-listing them.
 */
const isRelativeReference = (value: string): boolean => {
  if (SCHEME_RE.test(value)) return false;
  try {
    return new URL(value, RELATIVE_BASE).origin === RELATIVE_BASE.origin;
  } catch {
    return false;
  }
};

/** `http:`/`https:` — the links that get `rel`/`target` hardening. */
const isWebUrl = (value: string): boolean => /^https?:/i.test(value);

const isAllowedHref = (value: string): boolean =>
  isWebUrl(value) || /^mailto:/i.test(value) || isRelativeReference(value);

const isAllowedImageSrc = (value: string): boolean =>
  isRelativeReference(value) || (value.length <= MAX_DATA_IMAGE_CHARS && DATA_IMAGE_RE.test(value));

/** Remote image sources dropped by the attribute hook, for the element hook to replace. */
const droppedImageSrc = new WeakMap<Element, string>();

/**
 * Per-tag attribute policy. DOMPurify has already confirmed the attribute name
 * is in {@link ALLOWED_ATTR}; this decides whether THIS element may carry it
 * with THIS value. Setting `keepAttr = false` removes it. DOMPurify's own URI
 * check still runs afterwards, so this only ever tightens.
 */
purify.addHook('uponSanitizeAttribute', (node, data) => {
  const tag = node.localName;
  const value = data.attrValue;
  let keep = false;
  switch (data.attrName) {
    case 'class': {
      const tokens = value.split(/\s+/).filter(Boolean);
      if (tag === 'li') {
        keep = tokens.includes('md-task') && tokens.every(t => TASK_ITEM_CLASSES.has(t));
      } else if (tag === 'code') {
        keep = tokens.length === 1 && CODE_LANGUAGE_CLASS_RE.test(tokens[0] ?? '');
      }
      break;
    }
    case 'align':
      keep = (tag === 'th' || tag === 'td') && /^(?:left|center|right)$/i.test(value);
      break;
    case 'start':
      keep = tag === 'ol' && /^\d{1,6}$/.test(value);
      break;
    case 'open':
      keep = tag === 'details';
      break;
    case 'href':
      keep = tag === 'a' && isAllowedHref(value);
      break;
    case 'src':
      keep = tag === 'img' && isAllowedImageSrc(value);
      if (tag === 'img' && !keep) droppedImageSrc.set(node, value);
      break;
    case 'title':
      keep = tag === 'a' || tag === 'img';
      break;
    case 'alt':
      keep = tag === 'img';
      break;
  }
  data.keepAttr = keep;
});

/**
 * Element-level follow-through once attributes are settled: external links lose
 * opener access, and an image whose remote `src` was dropped is replaced by its
 * alt text (or a plain link to the URL) instead of lingering as a broken image.
 */
purify.addHook('afterSanitizeAttributes', node => {
  const doc = node.ownerDocument;
  if (node.localName === 'a' && isWebUrl(node.getAttribute('href') ?? '')) {
    node.setAttribute('rel', 'noopener noreferrer');
    node.setAttribute('target', '_blank');
    return;
  }
  if (node.localName === 'img' && !node.hasAttribute('src')) {
    const alt = node.getAttribute('alt')?.trim() ?? '';
    const remote = droppedImageSrc.get(node) ?? '';
    if (alt) {
      node.replaceWith(doc.createTextNode(alt));
    } else if (isWebUrl(remote)) {
      const link = doc.createElement('a');
      link.setAttribute('href', remote);
      link.setAttribute('rel', 'noopener noreferrer');
      link.setAttribute('target', '_blank');
      link.textContent = remote;
      node.replaceWith(link);
    } else {
      node.remove();
    }
  }
});

/**
 * Parses a markdown string and returns sanitized HTML safe to insert into the
 * DOM (e.g. via `dangerouslySetInnerHTML`). Raw HTML in the source is NOT
 * escaped by the parser; it is reduced to the allowlisted inert structure by
 * DOMPurify as described in the module comment.
 *
 * Never throws on hostile input: malformed or adversarial markdown degrades to
 * sanitized text rather than raising.
 */
export function renderMarkdown(source: string): string {
  // `async: false` + the default tokenizer keeps this synchronous and returns a
  // string (not a Promise).
  const rawHtml = marked.parse(source ?? '', { async: false }) as string;

  return purify.sanitize(rawHtml, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    RETURN_TRUSTED_TYPE: false,
  });
}
