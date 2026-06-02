/**
 * Workspace data layer for `npx strikethroo serve`.
 *
 * A pure, synchronous, side-effect-free module that scans a project's
 * `.ai/strikethroo/` directory tree and returns a stable JSON model describing
 * every plan, its derived lifecycle state, tasks, inferred execution phases,
 * embedded mermaid diagrams, the archive, and the customizable hooks and
 * templates under `config/`.
 *
 * This module performs reads only: no `fs.watch`, no `http`/`net`, no writes.
 * HTTP, file-watching, and caching belong to the runtime server (a later plan),
 * not here. Discovery and plan enumeration reuse the existing shared helpers
 * rather than re-walking directories.
 */

import * as fs from 'fs';
import * as path from 'path';
import { findStrikethrooRoot } from '../skill-scripts/shared/root';
import { getAllPlans, PlanEntry } from '../skill-scripts/shared/plan-scan';
import {
  parseFrontmatter,
  extractBody,
  sectionBody,
  extractMermaidBlocks,
  MarkdownSection,
} from './markdown';
import { scanTasks, deriveState, resolvePhases, Task, Phase, PlanState } from './derivation';

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

/** The customizable config slice (hooks + templates). */
export interface WorkspaceConfig {
  hooks: ConfigFile[];
  templates: ConfigFile[];
}

/** The complete workspace model. */
export interface WorkspaceModel {
  plans: PlanSummary[];
  config: WorkspaceConfig;
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

/** Builds the full detail for a single plan entry. */
const buildDetail = (entry: PlanEntry): PlanDetail => {
  let content = '';
  try {
    content = fs.readFileSync(entry.file, 'utf8');
  } catch {
    content = '';
  }

  const fm = parseFrontmatter(content);
  const body = extractBody(content);
  const { rawBody, sections } = sectionBody(body);
  const mermaid: ModelMermaidBlock[] = extractMermaidBlocks(body).map(b => ({
    source: b.source,
    isArchitecturalApproach: b.isArchitecturalApproach,
  }));
  const tasks = scanTasks(entry.dir);
  const { state, done, total } = deriveState(tasks);
  const phases = resolvePhases(body, tasks);

  return {
    id: entry.id,
    name: entry.name,
    summary: fm.summary,
    created: fm.created,
    state,
    done,
    total,
    phaseCount: phases.length,
    archived: entry.isArchive,
    file: entry.file,
    dir: entry.dir,
    rawBody,
    sections,
    mermaid,
    tasks,
    phases,
  };
};

/** Projects a detail down to its summary fields. */
const toSummary = (detail: PlanDetail): PlanSummary => ({
  id: detail.id,
  name: detail.name,
  summary: detail.summary,
  created: detail.created,
  state: detail.state,
  done: detail.done,
  total: detail.total,
  phaseCount: detail.phaseCount,
  archived: detail.archived,
});

/**
 * Enumerates `*.md` files in a config subdirectory. Missing dir -> [].
 * `root` is the workspace root used to derive each file's workspace-relative
 * path (e.g. `config/hooks/POST_PLAN.md`).
 */
const enumerateConfigDir = (root: string, dir: string): ConfigFile[] => {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries
    .filter(e => e.isFile() && e.name.endsWith('.md'))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(e => {
      const file = path.join(dir, e.name);
      let fileContent = '';
      try {
        fileContent = fs.readFileSync(file, 'utf8');
      } catch {
        fileContent = '';
      }
      return {
        id: e.name.replace(/\.md$/, ''),
        file,
        relPath: path.relative(root, file),
        content: fileContent,
      };
    });
};

/** Returns the config slice: hooks and templates under `config/`. */
export const getConfig = (root?: string): WorkspaceConfig => {
  const resolved = resolveRoot(root);
  return {
    hooks: enumerateConfigDir(resolved, path.join(resolved, 'config', 'hooks')),
    templates: enumerateConfigDir(resolved, path.join(resolved, 'config', 'templates')),
  };
};

/** Returns the full detail for a single plan by numeric id, or undefined. */
export const getPlanDetail = (root: string | undefined, planId: number): PlanDetail | undefined => {
  const resolved = resolveRoot(root);
  const entry = getAllPlans(resolved).find(p => p.id === planId);
  if (!entry) return undefined;
  return buildDetail(entry);
};

/**
 * Returns the complete workspace model: plan summaries for active and archived
 * plans, plus the config block.
 */
export const getWorkspaceModel = (root?: string): WorkspaceModel => {
  const resolved = resolveRoot(root);
  const plans = getAllPlans(resolved).map(entry => toSummary(buildDetail(entry)));
  return {
    plans,
    config: getConfig(resolved),
  };
};
