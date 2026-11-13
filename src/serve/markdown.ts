import { parseComplexityScore } from '../skill-scripts/shared/complexity-score';
import { parseInteger } from '../skill-scripts/shared/frontmatter';
import { readYamlFrontmatter, splitFrontmatter } from '../skill-scripts/shared/task-frontmatter';

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

/** Display scalar values without interpreting YAML syntax a second time. */
const scalarText = (value: unknown): string | undefined =>
  value === null
    ? ''
    : typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
      ? String(value)
      : undefined;
const list = (value: unknown): unknown[] =>
  value === null || value === undefined ? [] : Array.isArray(value) ? value : [value];

/** Malformed documents render without metadata; the Markdown body remains available. */
export const parseFrontmatter = (content: string): ParsedFrontmatter => {
  const result: ParsedFrontmatter = { dependencies: [], skills: [], extra: {} };
  const parsed = readYamlFrontmatter(content);
  if (parsed.kind !== 'data') return result;
  const data = parsed.data;
  result.id = parseInteger(data.id);
  for (const key of ['summary', 'created', 'status', 'group'] as const) {
    if (Object.prototype.hasOwnProperty.call(data, key)) result[key] = scalarText(data[key]);
  }
  result.complexity_score = parseComplexityScore(data.complexity_score);
  result.dependencies = list(data.dependencies).flatMap(item => {
    const value = parseInteger(item) ?? scalarText(item);
    return value === undefined ? [] : [value];
  });
  result.skills = list(data.skills).flatMap(item => {
    const value = scalarText(item);
    return value ? [value] : [];
  });
  const known = new Set([
    'id',
    'summary',
    'created',
    'status',
    'group',
    'complexity_score',
    'dependencies',
    'skills',
  ]);
  for (const [key, value] of Object.entries(data)) {
    const text = scalarText(value);
    if (!known.has(key) && text !== undefined) result.extra[key] = text;
  }
  return result;
};

/** Return body bytes after the structural frontmatter fence, even when YAML is malformed. */
export const extractBody = (content: string): string => {
  const block = splitFrontmatter(content);
  return block.kind === 'block' ? content.slice(block.bodyStart) : content;
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
