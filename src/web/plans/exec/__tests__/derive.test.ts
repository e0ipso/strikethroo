/**
 * Unit tests for the Execution blueprint derivation helpers (Plan 89, Task 05).
 *
 * Exercises the only non-trivial custom logic in the feature — `phaseStateOf`
 * and the done/doing/todo `tally` — against constructed plan-detail fixtures
 * with mixed raw task statuses. Per the project's test philosophy these helpers
 * are the business logic worth covering; the React views, vendored CSS, shared
 * primitives, and data layer are framework / upstream-owned and not retested
 * here. The tests import the real implementations (no logic re-implementation),
 * including the raw-status normalization through `toTickboxState`.
 */

import { phaseStateOf, tally, tasksById, execSummaryOf } from '../derive';
import type { Phase, PlanDetail, Task } from '../../../data/api';

/** Builds a minimal task with a raw status string. */
const task = (id: number, status: string): Task => ({ id, name: `Task ${id}`, status });

/** Builds a minimal phase referencing the given task ids. */
const phase = (index: number, taskIds: number[], parallel = true): Phase => ({
  index,
  taskIds,
  parallel,
});

/** Wraps tasks/phases/sections in a minimal PlanDetail for the helpers. */
const detailOf = (tasks: Task[], phases: Phase[] = [], sections: PlanDetail['sections'] = []) =>
  ({
    id: 1,
    name: '01--fixture',
    state: 'doing',
    done: 0,
    total: tasks.length,
    phaseCount: phases.length,
    archived: false,
    file: '/tmp/plan.md',
    dir: '/tmp',
    rawBody: '',
    sections,
    mermaid: [],
    tasks,
    phases,
  }) as PlanDetail;

describe('tally', () => {
  it('counts done/doing/todo from raw statuses and reports the total', () => {
    // 2 done (completed), 1 doing (in-progress), 1 todo (pending) = 4 total.
    const tasks = [
      task(1, 'completed'),
      task(2, 'completed'),
      task(3, 'in-progress'),
      task(4, 'pending'),
    ];
    expect(tally(tasks)).toEqual({ done: 2, doing: 1, todo: 1, total: 4 });
  });

  it('treats an absent status as todo and unknown custom statuses as doing', () => {
    const tasks = [task(1, undefined as unknown as string), task(2, 'blocked')];
    expect(tally(tasks)).toEqual({ done: 0, doing: 1, todo: 1, total: 2 });
  });

  it('returns all zeros for an empty task list', () => {
    expect(tally([])).toEqual({ done: 0, doing: 0, todo: 0, total: 0 });
  });
});

describe('phaseStateOf', () => {
  const stateFor = (statuses: string[]) => {
    const tasks = statuses.map((s, i) => task(i + 1, s));
    const ph = phase(
      1,
      tasks.map(t => t.id),
    );
    return phaseStateOf(ph, tasksById(tasks));
  };

  it('is done when every task is done', () => {
    expect(stateFor(['completed', 'completed'])).toBe('done');
  });

  it('is todo when every task is todo', () => {
    expect(stateFor(['pending', 'pending'])).toBe('todo');
  });

  it('is doing for any mixed combination', () => {
    expect(stateFor(['completed', 'pending'])).toBe('doing'); // done + todo
    expect(stateFor(['completed', 'in-progress'])).toBe('doing'); // done + doing
    expect(stateFor(['in-progress', 'pending'])).toBe('doing'); // doing + todo
  });

  it('is todo for a phase whose task references resolve to nothing', () => {
    const orphan = phase(1, [99]);
    expect(phaseStateOf(orphan, tasksById([task(1, 'completed')]))).toBe('todo');
  });
});

describe('execSummaryOf', () => {
  it('surfaces the parsed Execution Summary section when present', () => {
    const detail = detailOf([], [], [
      { heading: 'Execution Summary', content: '\n- **Status**: Completed Successfully\n' },
    ]);
    expect(execSummaryOf(detail)).toEqual({
      eyebrow: 'Execution summary',
      text: '**Status**: Completed Successfully',
    });
  });

  it('returns undefined when the plan has no Execution Summary section', () => {
    const detail = detailOf([], [], [{ heading: 'Context', content: 'background' }]);
    expect(execSummaryOf(detail)).toBeUndefined();
  });
});
