/**
 * Structural checks over the task dependency graph and the execution blueprint:
 * dangling dependency references, dependency cycles, blueprint/task consistency
 * in both directions, agreement among the three coexisting task-id notions, and
 * task-id uniqueness within a plan.
 *
 * Scope is `plans/` only; `archive/` participates solely in plan-id uniqueness.
 * Plan clarification 1 settled that: an archived plan is immutable history, so a
 * content finding against it cannot be acted on and is therefore noise. Plan ids
 * are the exception because continuous numbering across active and archived
 * plans is exactly what stops an archived plan from colliding with a new one.
 *
 * Cycle detection exists nowhere else in this repository. The acyclicity rule is
 * written down only as instructions to a language model
 * (`src/skill-prompts/sections/validation-checklist.md`, the
 * `POST_TASK_GENERATION_ALL` hook). Today a cycle is a display defect in the
 * viewer plus a permanent, undiagnosed "phase not ready" stall from
 * `collectTaskReadinessIssues` — which is why naming the participating task ids
 * in the message is the point of the check, not a nicety.
 *
 * No blueprint parser is defined here. The repository already carries
 * `parseBlueprintPhases` twice (`src/serve/derivation.ts` and
 * `src/skill-scripts/shared/blueprint-parse.ts`), quietly diverging; a third
 * copy is the specific failure mode this file must not add. The serve copy is
 * reused because it is inside the CLI's `tsc` domain and already returns the
 * `Phase` shape. Deduplicating the existing two is out of scope.
 *
 * Known limitation, deliberately not fixed here: that parser's `TASK_REF_RE`
 * matches the first `Task NN` in *any* bulleted line, so ordinary prose in a
 * blueprint bullet is indistinguishable from a phase assignment and can yield a
 * phantom reference. Hardening it belongs to whoever deduplicates the two
 * parsers. The `blueprint/reference-unresolved` message therefore spells the
 * false-positive case out, so a human meets it as a known limitation instead of
 * a mystery.
 *
 * `findStrikethrooRoot` is never imported: it terminates the process on a
 * schema-version mismatch. The root arrives already resolved.
 */

import * as fs from 'fs';
import * as path from 'path';
import { extractBody } from '../serve/markdown';
import { scanTasks, parseBlueprintPhases, type Task, type Phase } from '../serve/derivation';
import { getAllPlans } from '../skill-scripts/shared/plan-scan';
import { Finding } from './types';

/** Leading `NN--` numeric prefix of a task filename — the id notion `findTaskFile` uses. */
const FILENAME_PREFIX_RE = /^(\d+)--/;

/** One plan under `plans/`, with everything the checks below need. */
interface PlanContext {
  /** Composite directory name, e.g. `110--strikethroo-validate-command`. */
  name: string;
  /** Workspace-relative path of the plan directory. */
  relDir: string;
  /** Workspace-relative path of the plan markdown file, or undefined when absent. */
  relPlanFile: string | undefined;
  /** Plan markdown body (after frontmatter); empty when no plan file was found. */
  body: string;
  tasks: Task[];
}

/** Ascending numeric sort, for stable id lists in messages. */
const byNumber = (a: number, b: number): number => a - b;

/** Sorted directory names under `<root>/<area>`. Missing or unreadable dir -> []. */
const listPlanDirNames = (root: string, area: 'plans' | 'archive'): string[] => {
  try {
    return fs
      .readdirSync(path.join(root, area), { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
};

/**
 * Picks the plan document inside a plan directory: the first `plan-*.md` in
 * sorted order, falling back to the first `*.md`. Sorting keeps the choice
 * independent of `readdirSync` order.
 */
const findPlanFile = (planDir: string): string | undefined => {
  let names: string[];
  try {
    names = fs
      .readdirSync(planDir, { withFileTypes: true })
      .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
      .map(entry => entry.name)
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return undefined;
  }
  return names.find(name => name.startsWith('plan-')) ?? names[0];
};

/** Builds the per-plan context for every directory under `plans/`. Never throws. */
const collectPlans = (root: string): PlanContext[] =>
  listPlanDirNames(root, 'plans').map(name => {
    const planDir = path.join(root, 'plans', name);
    const planFile = findPlanFile(planDir);
    let body = '';
    if (planFile !== undefined) {
      try {
        body = extractBody(fs.readFileSync(path.join(planDir, planFile), 'utf8'));
      } catch {
        body = '';
      }
    }
    return {
      name,
      relDir: path.join('plans', name),
      relPlanFile: planFile === undefined ? undefined : path.join('plans', name, planFile),
      body,
      tasks: scanTasks(planDir),
    };
  });

/** The `NN` prefix of a task filename, or undefined when the name has none. */
const filenameId = (file: string): number | undefined => {
  const match = file.match(FILENAME_PREFIX_RE);
  if (!match || match[1] === undefined) return undefined;
  const parsed = parseInt(match[1], 10);
  return Number.isNaN(parsed) ? undefined : parsed;
};

/**
 * The id a task answers to. Frontmatter wins because it is the notion the viewer
 * and the dependency graph use; the filename prefix is the fallback so a task
 * with unparsable frontmatter still participates instead of vanishing.
 */
const effectiveId = (task: Task): number | undefined => task.id ?? filenameId(task.file);

/** Every id one task can be addressed by, across notions; deduplicated. */
const notionIds = (task: Task): number[] => {
  const ids: number[] = [];
  if (typeof task.id === 'number') ids.push(task.id);
  const fromName = filenameId(task.file);
  if (fromName !== undefined && !ids.includes(fromName)) ids.push(fromName);
  return ids;
};

/**
 * Every id by which a task in this plan can be addressed, across all notions.
 *
 * A reference resolves if *any* notion matches. That keeps a single id
 * disagreement from being reported three times: `identity/task-id-mismatch`
 * already names the root cause, so the dependency and blueprint checks stay
 * quiet about the same file.
 */
const resolvableIds = (tasks: Task[]): Set<number> => new Set(tasks.flatMap(notionIds));

/**
 * Canonical key for a cycle, invariant under rotation: rotate so the smallest id
 * leads. Two DFS entry points reaching the same cycle then produce one finding.
 */
const cycleKey = (cycle: number[]): string => {
  let pivot = 0;
  for (let i = 1; i < cycle.length; i++) {
    if ((cycle[i] as number) < (cycle[pivot] as number)) pivot = i;
  }
  return [...cycle.slice(pivot), ...cycle.slice(0, pivot)].join('>');
};

/**
 * Finds every distinct dependency cycle by depth-first search with a recursion
 * stack (white/grey/black colouring). Graphs here hold a handful of tasks, so
 * recursion depth is a non-issue. The stack slice is what supplies the member
 * list the finding message must name.
 *
 * @param edges - task id -> ids it depends on, restricted to ids in this plan.
 */
const findCycles = (edges: Map<number, number[]>): number[][] => {
  const GREY = 1;
  const BLACK = 2;
  const colour = new Map<number, number>();
  const stack: number[] = [];
  const cycles: number[][] = [];
  const seen = new Set<string>();

  const visit = (id: number): void => {
    colour.set(id, GREY);
    stack.push(id);
    for (const next of edges.get(id) ?? []) {
      const state = colour.get(next);
      if (state === undefined) {
        visit(next);
      } else if (state === GREY) {
        const start = stack.indexOf(next);
        if (start !== -1) {
          const cycle = stack.slice(start);
          const key = cycleKey(cycle);
          if (!seen.has(key)) {
            seen.add(key);
            cycles.push(cycle);
          }
        }
      }
    }
    stack.pop();
    colour.set(id, BLACK);
  };

  for (const id of [...edges.keys()].sort(byNumber)) {
    if (colour.get(id) === undefined) visit(id);
  }
  return cycles;
};

/** Cycles and dangling dependency references for one plan. */
const dependencyFindings = (plan: PlanContext): Finding[] => {
  const findings: Finding[] = [];
  const known = resolvableIds(plan.tasks);

  for (const task of plan.tasks) {
    const id = effectiveId(task);
    const label = id === undefined ? task.file : `task ${id} (${task.file})`;
    for (const dep of [...new Set(task.dependencies)].sort(byNumber)) {
      if (known.has(dep)) continue;
      findings.push({
        check: 'graph/dangling-dependency',
        path: path.join(plan.relDir, 'tasks', task.file),
        message: `Plan "${plan.name}": ${label} declares a dependency on task ${dep}, but no task file in that plan carries that id under any notion (frontmatter id or filename prefix). Remove the dependency or add the missing task.`,
      });
    }
  }

  // The graph is built over frontmatter ids only: that is the notion the viewer
  // and `inferPhases` traverse, so it is the notion in which a cycle actually
  // stalls execution.
  const graphIds = new Set(
    plan.tasks.map(task => task.id).filter((id): id is number => typeof id === 'number')
  );
  const edges = new Map<number, number[]>();
  for (const task of plan.tasks) {
    if (typeof task.id !== 'number') continue;
    const outgoing = [...new Set(task.dependencies)]
      .filter(dep => graphIds.has(dep))
      .sort(byNumber);
    edges.set(task.id, [...(edges.get(task.id) ?? []), ...outgoing]);
  }

  for (const cycle of findCycles(edges)) {
    const members = [...new Set(cycle)].sort(byNumber);
    const trail = [...cycle, cycle[0]].join(' -> ');
    const detail =
      members.length === 1
        ? `task ${members[0]} depends on itself`
        : `tasks ${members.join(', ')} (${trail})`;
    findings.push({
      check: 'graph/dependency-cycle',
      path: plan.relDir,
      message: `Plan "${plan.name}" has a dependency cycle: ${detail}. No phase ordering satisfies it, so these tasks can never become ready. Break the cycle by dropping one of the dependencies.`,
    });
  }

  return findings;
};

/** Blueprint <-> task consistency, in both directions, for one plan. */
const blueprintFindings = (plan: PlanContext): Finding[] => {
  const phases: Phase[] | undefined = parseBlueprintPhases(plan.body);
  // No blueprint section (or one with no phase headings) is a legitimate state
  // for a drafted plan, not a defect. Nothing to reconcile against.
  if (!phases || phases.length === 0) return [];

  const findings: Finding[] = [];
  const known = resolvableIds(plan.tasks);
  const scheduled = new Set<number>();
  const planFileLabel = plan.relPlanFile ?? plan.relDir;

  for (const phase of phases) {
    const phaseLabel =
      phase.name === undefined ? `phase ${phase.index}` : `phase ${phase.index} ("${phase.name}")`;
    for (const id of phase.taskIds) {
      scheduled.add(id);
      if (known.has(id)) continue;
      const finding: Finding = {
        check: 'blueprint/reference-unresolved',
        message: `Plan "${plan.name}": the Execution Blueprint's ${phaseLabel} references task ${id}, but no file in ${path.join(plan.relDir, 'tasks')} carries that id. Either the task file is missing, or this is a false positive: the shared blueprint parser treats the first "Task NN" in any bulleted line as a phase assignment, so a bullet whose prose merely mentions "Task ${id}" reads as a reference — reword that bullet if so.`,
      };
      if (plan.relPlanFile !== undefined) finding.path = plan.relPlanFile;
      findings.push(finding);
    }
  }

  for (const task of plan.tasks) {
    const id = effectiveId(task);
    if (id === undefined) continue;
    // Symmetric with the incoming direction above, which resolves through
    // `resolvableIds`: a task counts as scheduled when *any* of its notions is
    // named by a phase. Keying this sweep on `effectiveId` alone would report a
    // file whose frontmatter id and filename prefix disagree as unscheduled
    // even though a phase names it by filename — a second finding for a root
    // cause `identity/task-id-mismatch` already reports, carrying remediation
    // ("Add it to a phase") that is wrong for that cause.
    if (notionIds(task).some(notion => scheduled.has(notion))) continue;
    findings.push({
      check: 'blueprint/task-in-no-phase',
      path: path.join(plan.relDir, 'tasks', task.file),
      message: `Plan "${plan.name}": task ${id} (${task.file}) appears in no phase of the Execution Blueprint in ${planFileLabel}, so nothing will ever execute it. Add it to a phase or remove the file.`,
    });
  }

  return findings;
};

/** Task-id agreement across notions, plus per-plan task-id uniqueness. */
const taskIdentityFindings = (plan: PlanContext): Finding[] => {
  const findings: Finding[] = [];

  for (const task of plan.tasks) {
    const fromName = filenameId(task.file);
    if (typeof task.id !== 'number' || fromName === undefined) continue;
    if (task.id === fromName) continue;
    findings.push({
      check: 'identity/task-id-mismatch',
      path: path.join(plan.relDir, 'tasks', task.file),
      message: `Plan "${plan.name}": ${task.file} declares frontmatter id ${task.id} but its filename prefix is ${fromName}. The viewer and the dependency graph resolve tasks by frontmatter id while the execution path (\`findTaskFile\`) resolves by filename prefix, so the two consumers would pick different files. Make them agree.`,
    });
  }

  // Task ids are unique *within a plan* only: `config/STRIKETHROO.md` specifies
  // auto-incremental ids that restart at 01 per plan, so a global check would
  // flag every healthy multi-plan workspace.
  const byId = new Map<number, string[]>();
  for (const task of plan.tasks) {
    if (typeof task.id !== 'number') continue;
    byId.set(task.id, [...(byId.get(task.id) ?? []), task.file]);
  }
  for (const id of [...byId.keys()].sort(byNumber)) {
    const files = [...(byId.get(id) ?? [])].sort((a, b) => a.localeCompare(b));
    if (files.length < 2) continue;
    findings.push({
      check: 'identity/duplicate-task-id',
      path: plan.relDir,
      message: `Plan "${plan.name}" has ${files.length} task files declaring frontmatter id ${id}: ${files.join(', ')}. Task ids must be unique within a plan; dependencies on task ${id} are ambiguous until this is fixed.`,
    });
  }

  return findings;
};

/**
 * Plan-id uniqueness across `plans/` and `archive/` together — the only check
 * that reads `archive/`. Continuous numbering across both trees is what keeps a
 * newly created plan from colliding with an archived one.
 */
const planIdFindings = (root: string): Finding[] => {
  const byId = new Map<number, string[]>();
  for (const entry of getAllPlans(root)) {
    byId.set(entry.id, [...(byId.get(entry.id) ?? []), path.relative(root, entry.file)]);
  }

  const findings: Finding[] = [];
  for (const id of [...byId.keys()].sort(byNumber)) {
    const files = [...(byId.get(id) ?? [])].sort((a, b) => a.localeCompare(b));
    if (files.length < 2) continue;
    findings.push({
      check: 'identity/duplicate-plan-id',
      message: `Plan id ${id} is claimed by ${files.length} plans across plans/ and archive/: ${files.join(', ')}. Plan ids must be unique across both, since numbering continues when a plan is archived.`,
    });
  }
  return findings;
};

/**
 * Runs the graph and identity checks against an already-resolved absolute
 * workspace root. Pure: reads only, never writes, never exits.
 */
export function graphChecks(root: string): Finding[] {
  const plans = collectPlans(root);
  return [
    ...plans.flatMap(dependencyFindings),
    ...plans.flatMap(blueprintFindings),
    ...plans.flatMap(taskIdentityFindings),
    ...planIdFindings(root),
  ];
}
