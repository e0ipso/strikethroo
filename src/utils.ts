/**
 * Helper Functions for the CLI
 *
 * Validation helpers for the `--harnesses` option.
 */

import { Harness } from './types';

const VALID_HARNESSES: readonly Harness[] = [
  'claude',
  'codex',
  'cursor',
  'gemini',
  'github',
  'opencode',
  'kiro',
];

/**
 * Parse comma-separated harness values into an array
 * @param value - Comma-separated string of harness names
 * @returns Array of harness names
 * @throws Error if invalid harness names are provided
 */
export function parseHarnesses(value: string): Harness[] {
  if (!value.trim()) {
    throw new Error('Harnesses parameter cannot be empty');
  }

  const harnesses = value
    .split(',')
    .map(a => a.trim().toLowerCase())
    .filter(a => a.length > 0);

  const invalidHarnesses = harnesses.filter(
    (harness): harness is string => !VALID_HARNESSES.includes(harness as Harness)
  );

  if (invalidHarnesses.length > 0) {
    throw new Error(
      `Invalid harness(es): ${invalidHarnesses.join(', ')}. Valid options are: ${VALID_HARNESSES.join(', ')}`
    );
  }

  return Array.from(new Set(harnesses)) as Harness[];
}

/**
 * Validate that all harnesses are supported
 * @param harnesses - Array of harnesses to validate
 * @throws Error if any harness is invalid or array is empty
 */
export function validateHarnesses(harnesses: Harness[]): void {
  if (harnesses.length === 0) {
    throw new Error('At least one harness must be specified');
  }

  for (const harness of harnesses) {
    if (!VALID_HARNESSES.includes(harness)) {
      throw new Error(
        `Invalid harness: ${harness}. Supported harnesses: ${VALID_HARNESSES.join(', ')}`
      );
    }
  }
}

// --- Template processing utilities ---

export interface MarkdownFrontmatter {
  [key: string]: string;
}

/**
 * Extract YAML frontmatter and body from a markdown string.
 * Returns an empty frontmatter object when no fences are found.
 */
export function parseFrontmatter(content: string): {
  frontmatter: MarkdownFrontmatter;
  body: string;
} {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n([\s\S]*))?$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const frontmatter: MarkdownFrontmatter = {};
  const lines = (match[1] || '').split('\n');

  let currentKey = '';
  let multilineValue: string[] = [];

  const flushMultiline = () => {
    if (currentKey && multilineValue.length > 0) {
      frontmatter[currentKey] = multilineValue.join('\n');
    }
    currentKey = '';
    multilineValue = [];
  };

  for (const line of lines) {
    if (currentKey && (line.startsWith('  ') || line.startsWith('\t'))) {
      multilineValue.push(line.replace(/^ {2}/, '').replace(/^\t/, ''));
      continue;
    }

    flushMultiline();

    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;
    const key = trimmed.substring(0, colonIndex).trim();
    const value = trimmed.substring(colonIndex + 1).trim();

    if (value === '|' || value === '>') {
      currentKey = key;
      multilineValue = [];
    } else {
      frontmatter[key] = value.replace(/^["']|["']$/g, '');
    }
  }
  flushMultiline();

  return { frontmatter, body: (match[2] || '').trimStart() };
}

/**
 * Escape a string for use inside a TOML basic (double-quoted) string.
 */
export function escapeTomlString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

/**
 * Escape a string for use inside a TOML multi-line basic (triple-quoted) string.
 */
export function escapeTomlTripleQuotedString(str: string): string {
  return str.replace(/\\\\/g, '\\\\\\\\').replace(/"""/g, '"\\""');
}

/**
 * Convert a canonical agent markdown template (with YAML frontmatter
 * containing `name` and `description`) into Codex's TOML agent format.
 */
export function convertAgentMdToToml(mdContent: string): string {
  const { frontmatter, body } = parseFrontmatter(mdContent);
  const name = escapeTomlString(frontmatter.name || '');
  const description = escapeTomlString((frontmatter.description || '').trim());
  const instructions = escapeTomlTripleQuotedString(body.trim());

  return [
    `name = "${name}"`,
    `description = "${description}"`,
    `developer_instructions = """`,
    instructions,
    `"""`,
    '',
  ].join('\n');
}

export interface AgentFormatInfo {
  format: 'md' | 'toml' | 'json';
  extension: string;
  directory: string;
}

/**
 * Return the agent file format, extension, and target directory for a harness.
 */
export function getAgentFormat(harness: Harness): AgentFormatInfo {
  switch (harness) {
    case 'codex':
      return { format: 'toml', extension: '.toml', directory: '.codex/agents' };
    case 'github':
      return { format: 'md', extension: '.agent.md', directory: '.github/agents' };
    case 'claude':
      return { format: 'md', extension: '.md', directory: '.claude/agents' };
    case 'gemini':
      return { format: 'md', extension: '.md', directory: '.gemini/agents' };
    case 'cursor':
      return { format: 'md', extension: '.md', directory: '.cursor/agents' };
    case 'opencode':
      return { format: 'md', extension: '.md', directory: '.opencode/agents' };
    case 'kiro':
      return { format: 'json', extension: '.json', directory: '.kiro/agents' };
  }
}

/**
 * Convert a canonical agent markdown template (with YAML frontmatter
 * containing `name` and `description`) into Kiro's JSON agent format.
 *
 * The resulting object uses the minimal set of fields needed to produce a
 * working Kiro agent. `prompt` carries the full instruction body.
 *
 * Tool access is intentionally conservative: only the tools a plan-creation
 * agent actually needs are listed. `tools: ['*']` (wildcard) is avoided to
 * limit blast radius from prompt-injection attacks embedded in plan content.
 * `allowedTools` is omitted; Kiro uses it as a secondary allowlist so leaving
 * it absent lets `tools` govern access exclusively.
 * `model` is omitted entirely when no model is specified, rather than
 * serializing as null, which Kiro may reject or misinterpret.
 */
export function convertAgentMdToKiroJson(mdContent: string): string {
  const { frontmatter, body } = parseFrontmatter(mdContent);
  const name = (frontmatter.name ?? '').trim();
  // Guard: description must be a string; coerce unexpected types to empty string
  const rawDescription = frontmatter.description;
  const description = (typeof rawDescription === 'string' ? rawDescription : '').trim();
  const agent: Record<string, unknown> = {
    name,
    description,
    prompt: body.trim(),
    // Conservative tool access: plan-creator needs reads, writes, and search.
    tools: ['read_file', 'write_file', 'list_directory', 'search_files', 'web_search'],
    mcpServers: {},
    toolAliases: {},
    resources: ['skill://.kiro/skills/*/SKILL.md', 'skill://~/.kiro/skills/*/SKILL.md'],
    hooks: {},
    toolsSettings: {},
    includeMcpJson: true,
    // `model` key intentionally omitted — absent key tells Kiro to use its default.
  };
  return JSON.stringify(agent, null, 2);
}
