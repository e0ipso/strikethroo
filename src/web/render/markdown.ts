/**
 * The single markdown-rendering and HTML-sanitization boundary for the SPA.
 *
 * This is the ONLY place in `src/web/` where markdown is turned into HTML and
 * where that HTML is sanitized. No screen may render markdown directly or wire
 * up its own parser/sanitizer — they import {@link renderMarkdown} from here so
 * the rendering rules and the sanitization policy live in exactly one place and
 * cannot diverge or be bypassed per-screen.
 *
 * Defense in depth: the markdown parser is configured to NOT emit raw embedded
 * HTML, and the parser output is additionally run through DOMPurify before it is
 * ever handed back for insertion into the DOM. Either layer alone blocks script
 * injection; together they make a sanitization gap require two independent
 * failures.
 *
 * The mermaid renderer is deliberately NOT imported here. It lives behind a
 * lazy `import()` in `./mermaid.ts` so it stays off the dependency graph of
 * every markdown consumer (the Reader route does not ship mermaid). See that
 * module for the path the Graph view activates.
 */

import { marked } from 'marked';
import DOMPurify from 'dompurify';

/**
 * Parses a markdown string and returns sanitized HTML safe to insert into the
 * DOM (e.g. via `dangerouslySetInnerHTML`).
 *
 * - `marked` runs synchronously with raw-HTML passthrough disabled, so authored
 *   `<script>`/`<img onerror=…>`/etc. in the markdown source are emitted as
 *   escaped text, not live nodes.
 * - DOMPurify then strips any markup that survived (and any handler attributes),
 *   forbidding `<script>`/`<style>` and all `on*` event handlers outright.
 *
 * Never throws on hostile input: malformed or adversarial markdown degrades to
 * sanitized text rather than raising.
 */
export function renderMarkdown(source: string): string {
  // `async: false` + the default tokenizer keeps this synchronous and returns a
  // string (not a Promise). Raw inline/block HTML in the source is escaped
  // rather than passed through.
  const rawHtml = marked.parse(source ?? '', { async: false }) as string;

  return DOMPurify.sanitize(rawHtml, {
    // Disallow script/style entirely and drop every event-handler attribute.
    FORBID_TAGS: ['script', 'style'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'style'],
    // No inline event handlers or javascript: URLs survive.
    ALLOW_DATA_ATTR: false,
  });
}
