/**
 * Workspace data layer for `npx strikethroo serve`.
 *
 * A pure, synchronous, side-effect-free module that scans a project's
 * `.ai/strikethroo/` directory tree and returns a stable JSON model. Three
 * reads: `getPlanSummaries` (the list — plan and task frontmatter plus the
 * phase count), `getPlanDetail` (one plan with its sections, mermaid blocks,
 * tasks, and phases), and `getConfig` (the customizable hooks, templates, and
 * `config.yaml`). The summary fields of both plan reads are assembled by one
 * function so the list can never disagree with the detail.
 *
 * This module performs reads only: no `fs.watch`, no `http`/`net`, no writes.
 * HTTP, file-watching, and caching belong to the runtime server, not here.
 * Discovery and plan enumeration reuse the existing shared helpers rather than
 * re-walking directories.
 */

import * as fs from 'fs';
import * as path from 'path';
import { findStrikethrooRoot } from '../skill-scripts/shared/root';
import { getAllPlans, PlanEntry } from '../skill-scripts/shared/plan-scan';
import { resolveContained, readContainedFile } from '../skill-scripts/shared/safe-fs';
import {
  parseFrontmatter,
  extractBody,
  sectionBody,
  extractMermaidBlocks,
  MarkdownSection,
  ParsedFrontmatter,
} from './markdown';
import {
  scanTasks,
  scanTaskMeta,
  deriveState,
  resolvePhases,
  DerivedState,
  Task,
  Phase,
  PlanState,
} from './derivation';

export type { Task, Phase, PlanState } from './derivation';
export type { MarkdownSection, MermaidBlock, ParsedFrontmatter } from './markdown';

/** A mermaid diagram as exposed by the model. */
export interface ModelMermaidBlock {
  source: string;
  isArchitecturalApproach: boolean;
}

/** Compact, list/board-facing view of a plan. */
export interface PlanSummary {
  id: number;
  /** Directory slug, e.g. `83--workspace-data-layer`. */
  name: string;
  summary?: string;
  created?: string;
  state: PlanState;
  done: number;
  total: number;
  phaseCount: number;
  archived: boolean;
}

/** Full, detail-screen view of a plan. */
export interface PlanDetail extends PlanSummary {
  /** Absolute path to the plan markdown file. */
  file: string;
  /** Absolute path to the plan directory. */
  dir: string;
  /** Verbatim markdown body after the frontmatter. */
  rawBody: string;
  /** Ordered named `##` sections. */
  sections: MarkdownSection[];
  /** Extracted mermaid blocks, with the Architectural Approach block flagged. */
  mermaid: ModelMermaidBlock[];
  tasks: Task[];
  phases: Phase[];
}

/** A customizable config file (hook or template). */
export interface ConfigFile {
  /** Basename without `.md`, e.g. `PRE_PHASE`. */
  id: string;
  /** Absolute path to the file. */
  file: string;
  /** Path relative to the workspace root, e.g. `config/hooks/POST_PLAN.md`. */
  relPath: string;
  /** File content. */
  content: string;
}

/** The customizable config slice (hooks + templates + workspace config.yaml). */
export interface WorkspaceConfig {
  hooks: ConfigFile[];
  templates: ConfigFile[];
  /** The structured workspace configuration `config/config.yaml`, if present. */
  workspace: ConfigFile | null;
}

/** Resolves the workspace root, falling back to discovery when none is given. */
const resolveRoot = (root?: string): string => {
  if (root) return root;
  const discovered = findStrikethrooRoot();
  if (!discovered) {
    throw new Error(
      'Could not locate a .ai/strikethroo/ workspace root. Pass an explicit root path.'
    );
  }
  return discovered;
};

/** Reads the plan file; an unreadable file reads as empty rather than throwing. */
const readPlanFile = (entry: PlanEntry): string => {
  try {
    return fs.readFileSync(entry.file, 'utf8');
  } catch {
    return '';
  }
};

/**
 * Assembles the summary fields. Both plan reads go through here, so the state,
 * the counts, and the key order cannot drift between the list and the detail.
 */
const toSummary = (
  entry: PlanEntry,
  fm: ParsedFrontmatter,
  derived: DerivedState,
  phaseCount: number
): PlanSummary => ({
  id: entry.id,
  name: entry.name,
  summary: fm.summary,
  created: fm.created,
  state: derived.state,
  done: derived.done,
  total: derived.total,
  phaseCount,
  archived: entry.isArchive,
});

/**
 * The list read: plan frontmatter, task frontmatter, and the phase count from
 * the shared blueprint parser (or dependency inference). No sections, no
 * mermaid, no retained body.
 */
const buildSummary = (entry: PlanEntry): PlanSummary => {
  const content = readPlanFile(entry);
  const tasks = scanTaskMeta(entry.dir);
  const phaseCount = resolvePhases(extractBody(content), tasks).length;
  return toSummary(entry, parseFrontmatter(content), deriveState(tasks), phaseCount);
};

/** Builds the full detail for a single plan entry. */
const buildDetail = (entry: PlanEntry): PlanDetail => {
  const content = readPlanFile(entry);
  const body = extractBody(content);
  const { rawBody, sections } = sectionBody(body);
  const mermaid: ModelMermaidBlock[] = extractMermaidBlocks(body).map(b => ({
    source: b.source,
    isArchitecturalApproach: b.isArchitecturalApproach,
  }));
  const tasks = scanTasks(entry.dir);
  const phases = resolvePhases(body, tasks);

  return {
    ...toSummary(entry, parseFrontmatter(content), deriveState(tasks), phases.length),
    file: entry.file,
    dir: entry.dir,
    rawBody,
    sections,
    mermaid,
    tasks,
    phases,
  };
};

/**
 * Enumerates `*.md` regular files in the config subdirectory `relDir` (relative
 * to `root`). The directory must itself be contained — a linked
 * `config/templates` pointing elsewhere yields [] rather than its contents —
 * and each file is read through the containment helper, so linked or special
 * entries are omitted from the model. Missing or unreadable dir -> [].
 */
const enumerateConfigDir = (root: string, relDir: string): ConfigFile[] => {
  const dir = resolveContained(root, relDir, { expect: 'directory' });
  if ('error' in dir) return [];

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir.path, { withFileTypes: true });
  } catch {
    return [];
  }

  const files: ConfigFile[] = [];
  for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!e.isFile() || !e.name.endsWith('.md')) continue;
    const relPath = path.join(relDir, e.name);
    const read = readContainedFile(root, relPath);
    if ('error' in read) continue;
    files.push({
      id: e.name.replace(/\.md$/, ''),
      file: path.join(root, relPath),
      relPath,
      content: read.content,
    });
  }
  return files;
};

/**
 * Reads `config/config.yaml` into a ConfigFile, or null when absent or when
 * it is not a plain contained file (a link out of the workspace reads as absent).
 */
const readWorkspaceConfigFile = (root: string): ConfigFile | null => {
  const relPath = path.join('config', 'config.yaml');
  const read = readContainedFile(root, relPath);
  if ('error' in read) return null;
  return { id: 'config', file: path.join(root, relPath), relPath, content: read.content };
};

/** Returns the config slice: hooks, templates, and config.yaml under `config/`. */
export const getConfig = (root?: string): WorkspaceConfig => {
  const resolved = resolveRoot(root);
  return {
    hooks: enumerateConfigDir(resolved, path.join('config', 'hooks')),
    templates: enumerateConfigDir(resolved, path.join('config', 'templates')),
    workspace: readWorkspaceConfigFile(resolved),
  };
};

/**
 * Returns the full detail for a single plan by its composite directory `name`
 * (`{id}--{slug}`), or undefined. Resolution is pure string equality against the
 * enumerated directory listing — no path is ever constructed from `name`. When
 * two entries share a name (active before archive in `getAllPlans` order), the
 * first match wins deterministically.
 */
export const getPlanDetail = (root: string | undefined, name: string): PlanDetail | undefined => {
  const resolved = resolveRoot(root);
  const entry = getAllPlans(resolved).find(p => p.name === name);
  if (!entry) return undefined;
  return buildDetail(entry);
};

/** Returns the summaries of every active and archived plan, in enumeration order. */
export const getPlanSummaries = (root?: string): PlanSummary[] =>
  getAllPlans(resolveRoot(root)).map(buildSummary);
