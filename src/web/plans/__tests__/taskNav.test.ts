/**
 * Unit tests for task navigation helpers (`src/web/plans/taskNav.ts`).
 */

import { describe, it, expect, vi } from 'vitest';
import { taskNavProps } from '../taskNav';

const mockNavigate = vi.fn();

describe('taskNavProps', () => {
  it('navigates to the composite plan name route, preserving zero-padded ids', () => {
    const props = taskNavProps('04--ai-summary-cost-guardrail', 1, mockNavigate);
    expect(props).not.toBeNull();
    props!.onClick();
    expect(mockNavigate).toHaveBeenCalledWith('/plans/04--ai-summary-cost-guardrail/tasks/1');
  });

  it('returns null for tasks without an id', () => {
    expect(taskNavProps('04--ai-summary-cost-guardrail', undefined, mockNavigate)).toBeNull();
  });

  it('URL-encodes the plan name segment', () => {
    taskNavProps('04--name with spaces', 2, mockNavigate)!.onClick();
    expect(mockNavigate).toHaveBeenCalledWith('/plans/04--name%20with%20spaces/tasks/2');
  });
});
