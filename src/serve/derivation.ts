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
} from './markdown';

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

/** Derived lifecycle state of a plan. */
export type PlanState = 'drafted' | 'ready' | 'doing' | 'done';

/** Derived state plus done/total counts. */
export interface DerivedState {
  state: PlanState;
  done: number;
  total: number;
}

/** An execution phase: an ordered group of task ids that run together. */
export interface Phase {
  /** 1-based phase index. */
  index: number;
  /** Optional descriptive name (from a blueprint doc). */
  name?: string;
  /** Task ids scheduled in this phase. */
  taskIds: number[];
  /** True when the phase holds more than one task. */
  parallel: boolean;
}

const STATUS_DONE = 'completed';
const STATUS_NOT_STARTED = 'pending';

/** Reads a plan directory's `tasks/*.md` into structured records. Missing dir -> []. */
export const scanTasks = (planDir: string): Task[] => {
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
      const filePath = path.join(tasksDir, e.name);
      let content: string;
      try {
        content = fs.readFileSync(filePath, 'utf8');
      } catch {
        return [];
      }
      const fm = parseFrontmatter(content);
      const body = extractBody(content);
      const dependencies = fm.dependencies
        .map(d => (typeof d === 'number' ? d : parseInt(d, 10)))
        .filter((d): d is number => !Number.isNaN(d));
      return [
        {
          id: fm.id,
          name: extractTitle(body) ?? e.name.replace(/\.md$/, ''),
          group: fm.group,
          complexity_score: fm.complexity_score,
          dependencies,
          status: fm.status,
          skills: fm.skills,
          file: e.name,
          body,
          sections: sectionBody(body).sections,
        },
      ];
    });
};

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
export const deriveState = (tasks: Task[]): DerivedState => {
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

const BLUEPRINT_SECTION_RE = /^##[ \t]+Execution Blueprint[ \t]*$/m;
const PHASE_HEADING_RE = /^###[ \t]+(?:✅[ \t]*)?Phase[ \t]+(\d+)[ \t]*:?[ \t]*(.*?)[ \t]*$/gm;
const TASK_REF_RE = /Task[ \t]+0*(\d+)/i;

/**
 * Parses phases from an "## Execution Blueprint" section if the plan body
 * contains one. Returns undefined when no blueprint section is present.
 */
export const parseBlueprintPhases = (planBody: string): Phase[] | undefined => {
  const sectionMatch = planBody.match(BLUEPRINT_SECTION_RE);
  if (!sectionMatch || sectionMatch.index === undefined) return undefined;

  const blueprint = planBody.slice(sectionMatch.index);
  const headings: Array<{ index: number; afterHeading: number; name: string }> = [];
  PHASE_HEADING_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = PHASE_HEADING_RE.exec(blueprint)) !== null) {
    headings.push({
      index: m.index,
      afterHeading: m.index + m[0].length,
      name: (m[2] ?? '').trim(),
    });
  }
  if (headings.length === 0) return undefined;

  const phases: Phase[] = [];
  for (let i = 0; i < headings.length; i++) {
    const current = headings[i]!;
    const next = headings[i + 1];
    const end = next ? next.index : blueprint.length;
    const segment = blueprint.slice(current.afterHeading, end);

    const taskIds: number[] = [];
    for (const line of segment.split(/\r?\n/)) {
      const trimmed = line.trim();
      // Only consider bulleted task references to avoid matching prose.
      if (!trimmed.startsWith('-') && !trimmed.startsWith('*')) continue;
      const ref = trimmed.match(TASK_REF_RE);
      if (ref && ref[1] !== undefined) {
        const id = parseInt(ref[1], 10);
        if (!Number.isNaN(id) && !taskIds.includes(id)) taskIds.push(id);
      }
    }

    phases.push({
      index: i + 1,
      name: current.name.length > 0 ? current.name : undefined,
      taskIds,
      parallel: taskIds.length > 1,
    });
  }

  return phases;
};

/**
 * Infers phases from tasks by grouping on satisfied dependencies. Tasks whose
 * dependencies are all already emitted (or absent from the task set) form a
 * phase; dependents fall into later phases. Best-effort and cycle-safe: if no
 * progress is made, the remaining tasks are emitted as a final phase rather
 * than looping forever. Never throws.
 */
export const inferPhases = (tasks: Task[]): Phase[] => {
  const withIds = tasks.filter((t): t is Task & { id: number } => typeof t.id === 'number');
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
 * Resolves a plan's phases: parses a blueprint document's phase list when the
 * plan body contains one, otherwise infers phases from task dependencies.
 */
export const resolvePhases = (planBody: string, tasks: Task[]): Phase[] => {
  const fromBlueprint = parseBlueprintPhases(planBody);
  if (fromBlueprint && fromBlueprint.length > 0) return fromBlueprint;
  return inferPhases(tasks);
};
