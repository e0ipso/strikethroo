import { parseComplexityScore } from '../skill-scripts/shared/complexity-score';

/**
 * Pure, dependency-light markdown parsing primitives for the serve data layer.
 *
 * These functions operate on already-read string content. File reading itself
 * belongs to the task scanner and the model assembler. Everything here is
 * synchronous, read-only, and side-effect-free: no `fs`, no network, no writes.
 *
 * The existing `src/skill-scripts/shared/frontmatter.ts` only recovers the
 * numeric `id`; it is intentionally not forked. This module provides a richer
 * frontmatter reader the UI needs (summary, created, status, group,
 * dependencies[], skills[]).
 */

/** Anchors the leading `---`-delimited frontmatter block (same as frontmatter.ts). */
const FRONTMATTER_RE = /^---\s*\r?\n([\s\S]*?)\r?\n---/;

/**
 * Parsed frontmatter. All fields are optional because real-world files vary and
 * malformed/missing frontmatter must degrade gracefully rather than throw.
 * `extra` retains any scalar keys not covered by the typed fields.
 */
export interface ParsedFrontmatter {
  id?: number;
  summary?: string;
  created?: string;
  status?: string;
  group?: string;
  complexity_score?: number;
  dependencies: Array<number | string>;
  skills: string[];
  extra: Record<string, string>;
}

/** A named `## ` section of a markdown body. */
export interface MarkdownSection {
  /** Heading text (the remainder of the `## ` line, trimmed). */
  heading: string;
  /** Section content from just after the heading line up to the next `## ` or EOF. */
  content: string;
  /** Character offset of the heading start within the body. */
  start: number;
  /** Character offset of the section end (exclusive) within the body. */
  end: number;
}

/** Result of sectioning a markdown body. */
export interface SectionedBody {
  /** Everything after the closing frontmatter `---`, verbatim. */
  rawBody: string;
  /** Ordered list of `## ` sections. */
  sections: MarkdownSection[];
}

/** A single extracted mermaid fenced block. */
export interface MermaidBlock {
  /** Raw mermaid source (inner content of the fenced block). */
  source: string;
  /** True when the block falls within an "Architectural Approach" section. */
  isArchitecturalApproach: boolean;
}

const stripQuotes = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
};

/** Strips a trailing unquoted YAML comment (`# ...`). Quoted scalars are left intact. */
const stripComment = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') || trimmed.startsWith("'")) return trimmed;
  const hashIndex = trimmed.indexOf('#');
  return hashIndex === -1 ? trimmed : trimmed.slice(0, hashIndex).trim();
};

/** Parses a bracketed inline array like `[a, b]` or `[]` into trimmed, unquoted items. */
const parseInlineArray = (value: string): string[] => {
  const inner = value.slice(1, -1).trim();
  if (inner.length === 0) return [];
  return inner
    .split(',')
    .map(item => stripQuotes(item))
    .filter(item => item.length > 0);
};

/** Coerces a dependency item to a number when it is purely numeric, else leaves it as-is. */
const coerceDependency = (item: string): number | string => {
  if (/^-?\d+$/.test(item)) {
    return parseInt(item, 10);
  }
  return item;
};

/**
 * Reads the leading frontmatter block into typed fields. Never throws: malformed
 * lines are skipped and absent keys fall back to defaults (undefined scalars,
 * empty arrays).
 */
export const parseFrontmatter = (content: string): ParsedFrontmatter => {
  const result: ParsedFrontmatter = {
    dependencies: [],
    skills: [],
    extra: {},
  };

  const match = content.match(FRONTMATTER_RE);
  if (!match || match[1] === undefined) return result;

  const lines = match[1].split(/\r?\n/);
  const listFields = new Set(['dependencies', 'skills']);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    // Skip blank lines and dashed list items (they are consumed by their owning key).
    if (line.trim().length === 0) continue;
    if (/^\s*-\s+/.test(line)) continue;

    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    const rawValue = line.slice(colonIndex + 1);
    if (key.length === 0) continue;

    if (listFields.has(key)) {
      const value = stripComment(rawValue);
      let items: string[];
      if (value.startsWith('[') && value.endsWith(']')) {
        items = parseInlineArray(value);
      } else if (value.length > 0) {
        // A scalar on the same line that is not a bracketed array: treat as a
        // single-item list (lenient).
        items = [stripQuotes(value)];
      } else {
        // Empty value: collect subsequent dashed-list items until indentation ends.
        items = [];
        let j = i + 1;
        while (j < lines.length) {
          const next = lines[j];
          if (next === undefined) break;
          const dashMatch = next.match(/^\s*-\s+(.*)$/);
          if (!dashMatch || dashMatch[1] === undefined) break;
          items.push(stripQuotes(stripComment(dashMatch[1])));
          j++;
        }
        i = j - 1; // advance the outer cursor past the consumed items
      }

      if (key === 'dependencies') {
        result.dependencies = items.map(coerceDependency);
      } else {
        result.skills = items;
      }
      continue;
    }

    const value = stripQuotes(stripComment(rawValue));
    switch (key) {
      case 'id': {
        const parsed = parseInt(value, 10);
        if (!Number.isNaN(parsed)) result.id = parsed;
        break;
      }
      case 'summary':
        result.summary = value;
        break;
      case 'created':
        result.created = value;
        break;
      case 'status':
        result.status = value;
        break;
      case 'group':
        result.group = value;
        break;
      case 'complexity_score': {
        const parsed = parseComplexityScore(value);
        if (parsed !== undefined) result.complexity_score = parsed;
        break;
      }
      default:
        result.extra[key] = value;
        break;
    }
  }

  return result;
};

/** Returns the body: everything after the closing frontmatter `---`, or the whole content. */
export const extractBody = (content: string): string => {
  const match = content.match(FRONTMATTER_RE);
  if (!match) return content;
  return content.slice(match.index! + match[0].length).replace(/^\r?\n/, '');
};

/**
 * Splits a markdown body into the verbatim `rawBody` plus an ordered list of
 * `## ` sections addressable by heading text. Section access is additive:
 * callers may always fall back to `rawBody`.
 */
export const sectionBody = (body: string): SectionedBody => {
  const sections: MarkdownSection[] = [];
  const headingRe = /^##[ \t]+(.+?)[ \t]*$/gm;
  const matches: Array<{ heading: string; index: number; afterHeading: number }> = [];

  let m: RegExpExecArray | null;
  while ((m = headingRe.exec(body)) !== null) {
    const heading = (m[1] ?? '').trim();
    matches.push({
      heading,
      index: m.index,
      afterHeading: m.index + m[0].length,
    });
  }

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i]!;
    const next = matches[i + 1];
    const end = next ? next.index : body.length;
    const content = body.slice(current.afterHeading, end).replace(/^\r?\n/, '');
    sections.push({
      heading: current.heading,
      content,
      start: current.index,
      end,
    });
  }

  return { rawBody: body, sections };
};

const ARCH_APPROACH_RE = /architectural\s+approach/i;

/**
 * Extracts every fenced ```mermaid block's raw source from a body. Blocks whose
 * position falls within an "Architectural Approach" section are flagged. Plans
 * with no mermaid block yield an empty list (never an error).
 */
export const extractMermaidBlocks = (body: string): MermaidBlock[] => {
  const blocks: MermaidBlock[] = [];
  const { sections } = sectionBody(body);
  const archSpans = sections
    .filter(s => ARCH_APPROACH_RE.test(s.heading))
    .map(s => ({ start: s.start, end: s.end }));

  // Match a fence opening with ```mermaid (optional trailing whitespace) and
  // closing with a line of three backticks.
  const fenceRe = /^[ \t]*```mermaid[ \t]*\r?\n([\s\S]*?)\r?\n[ \t]*```[ \t]*$/gm;
  let m: RegExpExecArray | null;
  while ((m = fenceRe.exec(body)) !== null) {
    const source = m[1] ?? '';
    const offset = m.index;
    const isArch = archSpans.some(span => offset >= span.start && offset < span.end);
    blocks.push({ source, isArchitecturalApproach: isArch });
  }

  return blocks;
};

/** Returns the text of the first `# ` (level-1) heading in a body, or undefined. */
export const extractTitle = (body: string): string | undefined => {
  const match = body.match(/^#[ \t]+(.+?)[ \t]*$/m);
  return match && match[1] !== undefined ? match[1].trim() : undefined;
};
