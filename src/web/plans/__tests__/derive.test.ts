/**
 * Unit tests for the Plans-section derivation layer (`src/web/plans/derive.ts`).
 *
 * Covers the helpers that adapt API plan summaries into view-facing shapes and
 * build workspace-relative paths. These are pure functions, so the tests are
 * fast and deterministic.
 */

import { describe, it, expect } from 'vitest';
import { planMdPath, stripIdPrefix, humanizeSlug, mapPlan, type PlanView } from '../derive';
import type { PlanSummary } from '../../data/api';

const summary = (overrides: Partial<PlanSummary> = {}): PlanSummary => ({
  id: 4,
  name: '04--ai-summary-cost-guardrail',
  summary: 'AI summary cost guardrail',
  created: '2026-06-02',
  state: 'drafted',
  done: 0,
  total: 0,
  phaseCount: 0,
  archived: false,
  ...overrides,
});

describe('stripIdPrefix', () => {
  it('removes a numeric id prefix from a composite plan name', () => {
    expect(stripIdPrefix('04--ai-summary-cost-guardrail')).toBe('ai-summary-cost-guardrail');
    expect(stripIdPrefix('123--some-plan')).toBe('some-plan');
  });

  it('returns the input unchanged when there is no prefix', () => {
    expect(stripIdPrefix('no-prefix-here')).toBe('no-prefix-here');
  });
});

describe('humanizeSlug', () => {
  it('converts kebab-case slugs to Title Case', () => {
    expect(humanizeSlug('ai-summary-cost-guardrail')).toBe('Ai Summary Cost Guardrail');
  });

  it('handles underscores and multiple separators', () => {
    expect(humanizeSlug('some_plan-name')).toBe('Some Plan Name');
  });
});

describe('mapPlan', () => {
  it('preserves the composite directory name exactly as returned by the API', () => {
    const view = mapPlan(summary());
    expect(view.name).toBe('04--ai-summary-cost-guardrail');
    expect(view.id).toBe(4);
  });

  it('maps zero-task plans to null counts while preserving the reported state', () => {
    const view = mapPlan(summary({ state: 'doing', done: 0, total: 0 }));
    expect(view.state).toBe('doing');
    expect(view.done).toBeNull();
    expect(view.total).toBeNull();
  });
});

describe('planMdPath', () => {
  it('builds a workspace-relative markdown path from the composite directory name', () => {
    const view: PlanView = {
      id: 4,
      name: '04--ai-summary-cost-guardrail',
      slug: 'ai-summary-cost-guardrail',
      title: 'Ai Summary Cost Guardrail',
      summary: 'AI summary cost guardrail',
      state: 'drafted',
      done: null,
      total: null,
      phases: null,
      created: '2026-06-02',
    };

    expect(planMdPath(view)).toBe(
      '.ai/strikethroo/plans/04--ai-summary-cost-guardrail/plan-04--ai-summary-cost-guardrail.md'
    );
  });

  it('preserves leading zeros in the plan directory name (regression for #24)', () => {
    expect(planMdPath({ name: '04--short' })).toBe(
      '.ai/strikethroo/plans/04--short/plan-04--short.md'
    );
    expect(planMdPath({ name: '007--extra-padded' })).toBe(
      '.ai/strikethroo/plans/007--extra-padded/plan-007--extra-padded.md'
    );
  });

  it('falls back to a placeholder when no name is supplied', () => {
    expect(planMdPath({ name: '' })).toBe('.ai/strikethroo/plans/NN--slug/plan-NN--slug.md');
  });
});
