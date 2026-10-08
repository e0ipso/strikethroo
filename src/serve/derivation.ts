/**
 * Per-plan derivation layer for the serve data layer.
 *
 * Scans a plan directory's `tasks/*.md` into structured task records, computes
 * the derived plan lifecycle state (`drafted` -> `ready` -> `doing` -> `done`)
 * with done/total counts, and resolves execution phases (from a blueprint
 * document when present, otherwise inferred from task `group` + `dependencies`).
 *
 * Everything is synchronous and read-only: file reads only, no watches, no
 * network, no writes.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  parseFrontmatter,
  extractBody,
  extractTitle,
  sectionBody,
  type MarkdownSection,
  type ParsedFrontmatter,
} from './markdown';
import { parseBlueprintPhases, type BlueprintPhase } from '../skill-scripts/shared/blueprint-parse';

/** A single task parsed from a plan's `tasks/` directory. */
export interface Task {
  id: number | undefined;
  /** Task title (first `# ` heading), falling back to the filename. */
  name: string;
  group: string | undefined;
  complexity_score: number | undefined;
  dependencies: number[];
  status: string | undefined;
  skills: string[];
  /** Source filename (basename). */
  file: string;
  /** Raw markdown body after frontmatter. */
  body: string;
  /** Ordered named `##` sections of the body (via `sectionBody`, mirrors
   * `PlanDetail.sections`). Additive to `body`, which is retained. */
  sections: MarkdownSection[];
}

/** The task frontmatter that state derivation and phase inference read. */
export type TaskMeta = Pick<Task, 'id' | 'dependencies' | 'status'>;

/** Derived lifecycle state of a plan. */
export type PlanState = 'drafted' | 'ready' | 'doing' | 'done';

/** Derived state plus done/total counts. */
export interface DerivedState {
  state: PlanState;
  done: number;
  total: number;
}

/** An execution phase as the viewer presents it: the shared shape plus `parallel`. */
export interface Phase extends BlueprintPhase {
  /** True when the phase holds more than one task. */
  parallel: boolean;
}

const STATUS_DONE = 'completed';
const STATUS_NOT_STARTED = 'pending';

/** One task file, read and its frontmatter parsed, before either projection. */
interface TaskSource {
  /** Source filename (basename). */
  file: string;
  fm: ParsedFrontmatter;
  content: string;
}

/** Reads a plan directory's `tasks/*.md` in name order. Missing dir -> []. */
const readTaskSources = (planDir: string): TaskSource[] => {
  const tasksDir = path.join(planDir, 'tasks');
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(tasksDir, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries
    .filter(e => e.isFile() && e.name.endsWith('.md'))
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap(e => {
      let content: string;
      try {
        content = fs.readFileSync(path.join(tasksDir, e.name), 'utf8');
      } catch {
        return [];
      }
      return [{ file: e.name, fm: parseFrontmatter(content), content }];
    });
};

/** Numeric dependency ids; entries that are not numbers are dropped. */
const numericDependencies = (fm: ParsedFrontmatter): number[] =>
  fm.dependencies
    .map(d => (typeof d === 'number' ? d : parseInt(d, 10)))
    .filter((d): d is number => !Number.isNaN(d));

/** Reads a plan directory's `tasks/*.md` into full records. Missing dir -> []. */
export const scanTasks = (planDir: string): Task[] =>
  readTaskSources(planDir).map(({ file, fm, content }) => {
    const body = extractBody(content);
    return {
      id: fm.id,
      name: extractTitle(body) ?? file.replace(/\.md$/, ''),
      group: fm.group,
      complexity_score: fm.complexity_score,
      dependencies: numericDependencies(fm),
      status: fm.status,
      skills: fm.skills,
      file,
      body,
      sections: sectionBody(body).sections,
    };
  });

/**
 * The list read's task scan: frontmatter only. No title, body, or sections are
 * built, which is what keeps `/api/plans` cheap.
 */
export const scanTaskMeta = (planDir: string): TaskMeta[] =>
  readTaskSources(planDir).map(({ fm }) => ({
    id: fm.id,
    dependencies: numericDependencies(fm),
    status: fm.status,
  }));

/** Classifies a task status. Unknown/in-progress values count as "started". */
const classify = (status: string | undefined): 'done' | 'notStarted' | 'started' => {
  if (status === STATUS_DONE) return 'done';
  if (status === STATUS_NOT_STARTED) return 'notStarted';
  return 'started';
};

/**
 * Computes the derived plan state and counts. Never throws on unknown statuses.
 *
 * - empty list -> `drafted`
 * - tasks present, none started or done -> `ready`
 * - all done -> `done`
 * - otherwise -> `doing`
 */
export const deriveState = (tasks: readonly TaskMeta[]): DerivedState => {
  const total = tasks.length;
  if (total === 0) {
    return { state: 'drafted', done: 0, total: 0 };
  }

  let done = 0;
  let started = 0;
  for (const task of tasks) {
    const klass = classify(task.status);
    if (klass === 'done') {
      done += 1;
      started += 1;
    } else if (klass === 'started') {
      started += 1;
    }
  }

  let state: PlanState;
  if (done === total) {
    state = 'done';
  } else if (started === 0) {
    state = 'ready';
  } else {
    state = 'doing';
  }

  return { state, done, total };
};

/**
 * Infers phases from tasks by grouping on satisfied dependencies. Tasks whose
 * dependencies are all already emitted (or absent from the task set) form a
 * phase; dependents fall into later phases. Best-effort and cycle-safe: if no
 * progress is made, the remaining tasks are emitted as a final phase rather
 * than looping forever. Never throws.
 */
export const inferPhases = (tasks: readonly TaskMeta[]): Phase[] => {
  const withIds = tasks.filter((t): t is TaskMeta & { id: number } => typeof t.id === 'number');
  if (withIds.length === 0) return [];

  const idSet = new Set(withIds.map(t => t.id));
  const emitted = new Set<number>();
  const phases: Phase[] = [];
  let remaining = [...withIds];

  while (remaining.length > 0) {
    const ready = remaining.filter(t =>
      t.dependencies.every(dep => !idSet.has(dep) || emitted.has(dep))
    );

    const batch = ready.length > 0 ? ready : remaining; // no progress -> emit the rest
    const taskIds = batch.map(t => t.id);
    phases.push({
      index: phases.length + 1,
      taskIds,
      parallel: taskIds.length > 1,
    });
    for (const id of taskIds) emitted.add(id);
    remaining = remaining.filter(t => !emitted.has(t.id));
  }

  return phases;
};

/**
 * Resolves a plan's phases: the shared blueprint parser's phases when the plan
 * body carries an `## Execution Blueprint` section with phase headings, otherwise
 * phases inferred from task dependencies.
 */
export const resolvePhases = (planBody: string, tasks: readonly TaskMeta[]): Phase[] => {
  const fromBlueprint = parseBlueprintPhases(planBody);
  if (fromBlueprint && fromBlueprint.length > 0) {
    return fromBlueprint.map(phase => ({ ...phase, parallel: phase.taskIds.length > 1 }));
  }
  return inferPhases(tasks);
};
