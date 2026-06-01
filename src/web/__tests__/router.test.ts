/**
 * Unit tests for the SPA router's pure path parser (Plan 96, Task 01).
 *
 * The only non-trivial logic is the ordering of the `/plans/:id/tasks/:taskId`
 * pattern ahead of the broader `/plans/:id` pattern: the longer task-detail
 * path must not be swallowed by the plan-detail one. These two assertions cover
 * that documented collision risk; the React hooks and provider are framework
 * wiring and are not retested here.
 */

import { parsePath } from '../router';

describe('parsePath', () => {
  it('resolves /plans/:id/tasks/:taskId to the taskDetail section', () => {
    expect(parsePath('/plans/12/tasks/03')).toEqual({
      section: 'taskDetail',
      params: { id: '12', taskId: '03' },
    });
  });

  it('still resolves /plans/:id to the planDetail section', () => {
    expect(parsePath('/plans/12')).toEqual({
      section: 'planDetail',
      params: { id: '12' },
    });
  });
});
