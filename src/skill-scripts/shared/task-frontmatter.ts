import * as yaml from 'js-yaml';

/**
 * Result of reading a task document's leading frontmatter block.
 *
 * - `none`: the document has no frontmatter block at all.
 * - `data`: the block parsed as a YAML mapping.
 * - `invalid`: the block exists but was rejected; `reason` says why.
 */
export type FrontmatterResult =
  | { kind: 'none' }
  | { kind: 'data'; data: Record<string, unknown> }
  | { kind: 'invalid'; reason: string };

/** Upper bound on the frontmatter block, checked before any parsing. */
export const MAX_FRONTMATTER_BYTES = 64 * 1024;

// The opening fence: `---`, then anything up to the line ending. Whatever
// follows the dashes is captured so a language tag (`---js`) can be refused.
const OPENING_FENCE = /^---([^\r\n]*)\r?\n/;
// A closing fence is a line that is exactly `---` or `...`, optionally
// followed by horizontal whitespace, terminated by a line ending or the end
// of the document.
const CLOSING_FENCE = /^(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/m;

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

export const hasYamlContent = (block: string): boolean =>
  block.split(/\r?\n/).some(line => {
    const trimmed = line.trim();
    return trimmed !== '' && !trimmed.startsWith('#');
  });

/**
 * Reads a task document's leading frontmatter as YAML data only.
 *
 * Task content is untrusted: it can arrive through a shared checkout or from
 * a worker's output. Nothing here evaluates it. Language-tagged fences
 * (`---js`, `---coffee`, ...) are rejected outright, and the block is parsed
 * with js-yaml's default schema, which has no executable types. Never throws.
 */
export const readYamlFrontmatter = (markdown: string): FrontmatterResult => {
  const source = markdown.startsWith('﻿') ? markdown.slice(1) : markdown;
  const opening = OPENING_FENCE.exec(source);
  if (!opening) return { kind: 'none' };
  if ((opening[1] ?? '').trim() !== '') {
    return {
      kind: 'invalid',
      reason: 'Executable or non-YAML frontmatter is not supported.',
    };
  }

  const rest = source.slice(opening[0].length);
  const closing = CLOSING_FENCE.exec(rest);
  if (!closing) {
    return { kind: 'invalid', reason: 'Frontmatter has no closing fence.' };
  }

  const block = rest.slice(0, closing.index);
  if (Buffer.byteLength(block, 'utf8') > MAX_FRONTMATTER_BYTES) {
    return {
      kind: 'invalid',
      reason: `Frontmatter exceeds the ${MAX_FRONTMATTER_BYTES}-byte limit.`,
    };
  }
  // js-yaml v5 throws on an empty document; an empty block is an empty mapping.
  if (!hasYamlContent(block)) return { kind: 'data', data: {} };

  let parsed: unknown;
  try {
    parsed = yaml.load(block);
  } catch (error) {
    return {
      kind: 'invalid',
      reason: `Frontmatter is not valid YAML: ${
        error instanceof Error ? error.message.split('\n')[0] : String(error)
      }`,
    };
  }
  if (!isPlainObject(parsed)) {
    return { kind: 'invalid', reason: 'Frontmatter must be a YAML mapping.' };
  }
  return { kind: 'data', data: parsed };
};
