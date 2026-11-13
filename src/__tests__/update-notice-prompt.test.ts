/**
 * Rendered-prompt regression tests for parent-owned update notices.
 */

import * as fs from 'fs';
import * as path from 'path';
import { BUILT_SKILLS_ROOT } from './built-skills';

const SKILLS_ROOT = BUILT_SKILLS_ROOT;

const PARENT_SKILLS = [
  'st-create-plan',
  'st-refine-plan',
  'st-generate-tasks',
  'st-execute-blueprint',
  'st-full-workflow',
  'st-execute-task',
] as const;

const PLAN_SUMMARY_BLOCK = `\`\`\`
---

Plan Summary:
- Plan ID: [numeric-id]
- Plan File: [absolute-path-to-plan-file]
\`\`\``;

const EXECUTION_SUMMARY_BLOCK = `\`\`\`
---
Execution Summary:
- Plan ID: [numeric-id]
- Status: [Archived or Halted]
- Location: [absolute path to current plan directory]
- Code Review: [codeReview from the review result, or Failed with the reason no result was produced]
---
\`\`\``;

const readSkill = (skill: string): string =>
  fs.readFileSync(path.join(SKILLS_ROOT, skill, 'SKILL.md'), 'utf8');

const countOccurrences = (haystack: string, needle: string): number => {
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
};

/** Extract the fenced Plan Summary block the way downstream automation reads it. */
const extractPlanSummaryBlock = (response: string): string | null => {
  const start = response.indexOf('```\n---\n\nPlan Summary:');
  if (start === -1) return null;
  const end = response.indexOf('```', start + 3);
  if (end === -1) return null;
  return response.slice(start, end + 3);
};

describe('rendered parent skills compose update notices', () => {
  test.each(PARENT_SKILLS)('%s contains the update check and final-notice placement', skill => {
    const content = readSkill(skill);
    expect(content).toContain('check-for-updates.cjs "<root>"');
    expect(content).toContain('Nothing may follow the notice');
    expect(content).toContain('Never pause for permission and never run an update');
  });

  test.each(PARENT_SKILLS)('%s runs the update check at the end, not at startup', skill => {
    const content = readSkill(skill);
    const check = content.indexOf('run `scripts/check-for-updates.cjs "<root>"`');
    expect(check).toBeGreaterThan(-1);
    expect(check).toBeGreaterThan(content.lastIndexOf('\n### '));
    expect(content).not.toContain('Delegated execution workers');
  });

  test('st-code-review does not reference check-for-updates', () => {
    const content = readSkill('st-code-review');
    expect(content).not.toContain('check-for-updates');
  });

  test('st-full-workflow runs exactly one parent update check', () => {
    const content = readSkill('st-full-workflow');
    expect(countOccurrences(content, 'run `scripts/check-for-updates.cjs "<root>"`')).toBe(1);
  });

  test('st-create-plan preserves the Plan Summary fence byte-for-byte', () => {
    const content = readSkill('st-create-plan');
    expect(content).toContain(PLAN_SUMMARY_BLOCK);
    expect(content).not.toContain('Conclude with exactly this block as the final output:');
  });

  test('execution skills preserve the Execution Summary fence byte-for-byte', () => {
    for (const skill of ['st-execute-blueprint', 'st-full-workflow'] as const) {
      const content = readSkill(skill);
      expect(content).toContain(EXECUTION_SUMMARY_BLOCK);
      expect(content).not.toContain('Conclude with exactly this block as the final output:');
    }
  });

  test('a trailing notice after the Plan Summary block still extracts the summary', () => {
    const summary = PLAN_SUMMARY_BLOCK.replace('[numeric-id]', '42').replace(
      '[absolute-path-to-plan-file]',
      '/tmp/plan.md'
    );
    const notice =
      'A newer Strikethroo release is available. Run `npx strikethroo@latest update` to update.';
    const response = `Done.\n\n${summary}\n\n${notice}`;
    expect(extractPlanSummaryBlock(response)).toBe(summary);
  });
});
