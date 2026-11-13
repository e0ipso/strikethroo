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

export type FrontmatterBlock =
  | { kind: 'none' }
  | { kind: 'invalid'; reason: string }
  | { kind: 'block'; text: string; start: number; bodyStart: number };

/** Locate only the leading block, preserving offsets into the original document. */
export const splitFrontmatter = (markdown: string): FrontmatterBlock => {
  const offset = markdown.startsWith('﻿') ? 1 : 0;
  const source = markdown.slice(offset);
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

  return {
    kind: 'block',
    text: rest.slice(0, closing.index),
    start: offset + opening[0].length,
    bodyStart: offset + opening[0].length + closing.index + closing[0].length,
  };
};

/** Parse YAML data once. Callers decide whether malformed or absent metadata blocks their work. */
export const readYamlFrontmatter = (markdown: string): FrontmatterResult => {
  const block = splitFrontmatter(markdown);
  if (block.kind !== 'block') return block;
  if (Buffer.byteLength(block.text, 'utf8') > MAX_FRONTMATTER_BYTES) {
    return {
      kind: 'invalid',
      reason: `Frontmatter exceeds the ${MAX_FRONTMATTER_BYTES}-byte limit.`,
    };
  }
  // js-yaml v5 throws on an empty document; an empty block is an empty mapping.
  if (!hasYamlContent(block.text)) return { kind: 'data', data: {} };

  let parsed: unknown;
  try {
    parsed = yaml.load(block.text);
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
