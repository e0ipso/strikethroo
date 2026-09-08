/**
 * Rendered-prompt regression tests for the terminal code review gate.
 *
 * The halt/continue decision is compiled into `code-review.cjs` and emitted as
 * the result's top-level `action`. These assertions hold the prompt to reading
 * that field instead of re-deriving it from the outcome kind, and hold both
 * consumers of the shared execution procedure to the fixed
 * POST_EXECUTION -> review -> summary -> archive order.
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { BUILT_SKILLS_ROOT } from './built-skills';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SKILLS_ROOT = BUILT_SKILLS_ROOT;
const PROCEDURE = path.join(
  REPO_ROOT,
  'src',
  'skill-prompts',
  '_partials',
  'procedure-execute-blueprint.md.hbs'
);

/** The headings each call site produces from its heading-level and step arguments. */
interface Consumer {
  skill: string;
  post: string;
  review: string;
  summary: string;
  archive: string;
}

const CONSUMERS: Consumer[] = [
  {
    skill: 'st-execute-blueprint',
    post: '### 8. Post-execution validation',
    review: '#### Run the code review gate',
    summary: '### 9. Append execution summary',
    archive: '### 10. Archive the plan',
  },
  {
    skill: 'st-full-workflow',
    post: '#### 7. Post-execution validation',
    review: '##### Run the code review gate',
    summary: '#### 8. Append execution summary',
    archive: '#### 9. Archive the plan',
  },
];

const readSkill = (skill: string): string =>
  fs.readFileSync(path.join(SKILLS_ROOT, skill, 'SKILL.md'), 'utf8');

/** Locates an exact heading line, so a substring elsewhere cannot match it. */
const headingIndex = (content: string, heading: string): number =>
  content.indexOf(`\n${heading}\n`);

describe('rendered execution skills compose the review gate', () => {
  beforeAll(() => {
    execFileSync('npm', ['run', 'build:skill-prompts'], { cwd: REPO_ROOT, stdio: 'pipe' });
  });

  test.each(CONSUMERS)(
    '$skill orders POST_EXECUTION validation, code review, summary, then archive',
    ({ skill, post, review, summary, archive }) => {
      const content = readSkill(skill);
      const order = [post, review, summary, archive].map(heading => headingIndex(content, heading));
      expect(order).not.toContain(-1);
      expect([...order].sort((a, b) => a - b)).toEqual(order);

      // The hook and evidence gate stay at the call site, ahead of the review.
      const postSection = content.slice(order[0], order[1]);
      expect(postSection).toContain('`<root>/config/hooks/POST_EXECUTION.md`');
      expect(postSection).toContain('`<root>/config/shared/verification-gate.md`');
    }
  );

  test.each(CONSUMERS)(
    '$skill follows the compiled review action',
    ({ skill, review, summary }) => {
      const content = readSkill(skill);
      const section = content.slice(headingIndex(content, review), headingIndex(content, summary));

      expect(section).toContain('code-review.cjs <plan-id> <current-harness>');
      expect(section).toContain('If the `st-code-review` skill is not installed');
      expect(section).toContain('record that outcome');
      expect(section).toContain('verbatim');
      expect(section).toContain('top-level `action`');
      expect(section).toContain('`halt`');
      expect(section).toContain('`continue`');
      expect(section).toContain('top-level `detail`');
      // Findings exist to read only after a certified review.
      expect(section).toContain('`verdict.kind` is `review-recorded`');
      expect(section).toContain('review.xml');
      expect(section).toContain('findings.json');

      expect(section).toContain('Never report an uncertified review as clean');

      // The three rules no compiled field can express. Scoped to the rules
      // block, so prose elsewhere in the section cannot stand in for them.
      const hardRules = section.slice(section.indexOf('Hard rules:'));
      expect(hardRules).toContain('runs once');
      expect(hardRules).toContain('Do not re-run');
      expect(hardRules).toContain('reviewer route');
      expect(hardRules).toContain('implementer route');
      expect(hardRules).toContain('`POST_EXECUTION.md` in full');
    }
  );

  test.each(CONSUMERS)(
    '$skill does not re-derive the gate decision',
    ({ skill, review, summary }) => {
      const content = readSkill(skill);
      const section = content.slice(headingIndex(content, review), headingIndex(content, summary));

      // No outcome table, and no per-outcome dispatch to re-derive halt/continue.
      expect(section).not.toMatch(/^\|/m);
      for (const kind of [
        '`skipped`',
        '`fallback`',
        '`launched-failure`',
        '`infrastructure-failure`',
      ])
        expect(section).not.toContain(kind);

      // Internal diagnostics and the old nested detail left the contract.
      expect(content).not.toContain('findingsGate');
      expect(content).not.toContain('reviewFilePresent');
      expect(content).not.toContain('verdict.detail');
      expect(section).not.toContain('creates no task files');
      expect(section).not.toContain('mutates the Execution Blueprint');
      expect(content).not.toContain('{{');
      expect(content).toContain('- Code Review: [codeReview from the review result');
      expect(content).toContain('Emit this block even when the review gate halts execution');
      expect(content).toContain('never claim archival after a halt');
    }
  );

  test('the shared procedure composes the lifecycle from named partials', () => {
    const source = fs.readFileSync(PROCEDURE, 'utf8');
    const post = source.indexOf('POST_EXECUTION.md');
    const review = source.indexOf('{{> code-review-gate');
    const archive = source.indexOf('{{> summary-and-archive');

    expect(post).toBeGreaterThan(-1);
    expect(review).toBeGreaterThan(post);
    expect(archive).toBeGreaterThan(review);
    expect(source).not.toContain('post-execution-archive');
  });
});
