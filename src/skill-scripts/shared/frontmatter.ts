import { readYamlFrontmatter, splitFrontmatter } from './task-frontmatter';

/** Preserve the original fences, line endings, and body while replacing the block text. */
export const rewriteFrontmatter = (
  markdown: string,
  rewrite: (block: string) => string
): string => {
  const block = splitFrontmatter(markdown);
  if (block.kind !== 'block') throw new Error('missing frontmatter');
  const text = block.text.replace(/\r?\n$/, '');
  return markdown.slice(0, block.start) + rewrite(text) + markdown.slice(block.start + text.length);
};

/** A YAML integer, or its exact string form; partial numbers and unsafe values are rejected. */
export const parseInteger = (value: unknown): number | undefined => {
  const number =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^[+-]?\d+$/.test(value.trim())
        ? Number(value)
        : NaN;
  return Number.isSafeInteger(number) ? number : undefined;
};

export const extractPlanId = (content: string, _filePath: string): number | null => {
  const parsed = readYamlFrontmatter(content);
  const id = parsed.kind === 'data' ? parseInteger(parsed.data.id) : undefined;
  return id !== undefined && id >= 0 ? id : null;
};

/** IDs in generated directory/file names also reserve numbers when metadata needs repair. */
export const idFromName = (name: string): number | null =>
  parseInteger(/^(?:plan-)?(\d+)--/.exec(name)?.[1]) ?? null;

export const nextIdAfter = (ids: Iterable<number>): number => {
  let max = 0;
  for (const id of ids) max = Math.max(max, id);
  const next = max + 1;
  if (!Number.isSafeInteger(next)) throw new Error('No safe integer remains for the next ID.');
  return next;
};
