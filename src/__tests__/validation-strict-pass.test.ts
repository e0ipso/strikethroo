/**
 * Integration tests for the strict frontmatter pass (`src/validation/strict-pass.ts`).
 *
 * Per the project's "write a few tests, mostly integration" philosophy these run
 * against real temp-directory workspaces rather than mocks, and they cover only
 * the logic that is genuinely custom: the missing-vs-malformed distinction the
 * viewer's lenient parser cannot express, the `status` typo that
 * `classify` in `src/serve/derivation.ts` swallows into `'started'`, the
 * dependency entries dropped twice over downstream, and the file scoping that
 * keeps `archive/` and `config/` out of the read set. The comprehensive suite
 * over intentionally-broken fixtures lands with task 6.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { strictPass } from '../validation/strict-pass';

const makeWorkspace = (): string => fs.mkdtempSync(path.join(os.tmpdir(), 'st-strict-'));

const write = (file: string, content: string): void => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content, 'utf-8');
};

const writePlan = (root: string, planDir: string, frontmatter: string): void =>
  write(
    path.join(root, 'plans', planDir, `plan-${planDir}.md`),
    `---\n${frontmatter}\n---\n\n# Plan\n`
  );

const writeTask = (root: string, planDir: string, file: string, frontmatter: string): void =>
  write(path.join(root, 'plans', planDir, 'tasks', file), `---\n${frontmatter}\n---\n\n# Task\n`);

const VALID_TASK = [
  'id: 1',
  'group: "g"',
  'dependencies: []',
  'status: "pending"',
  'created: 2026-01-01',
  'skills:',
  '  - typescript',
].join('\n');

describe('strict frontmatter pass', () => {
  it('gives a missing plan field and a malformed plan field different check identifiers', () => {
    const root = makeWorkspace();
    writePlan(root, '1--absent-id', 'summary: "s"\ncreated: 2026-01-01');
    writePlan(root, '2--garbage-id', 'id: abc\nsummary: "s"\ncreated: 2026-01-01');

    const findings = strictPass(root);

    const missing = findings.filter(f => f.check === 'plan/frontmatter-field-missing');
    const malformed = findings.filter(f => f.check === 'plan/frontmatter-field-malformed');
    expect(missing).toHaveLength(1);
    expect(malformed).toHaveLength(1);
    expect(missing[0].check).not.toBe(malformed[0].check);
    expect(missing[0].path).toBe(path.join('plans', '1--absent-id', 'plan-1--absent-id.md'));
    expect(malformed[0].path).toBe(path.join('plans', '2--garbage-id', 'plan-2--garbage-id.md'));
    // Both messages must name the offending field.
    expect(missing[0].message).toContain('id');
    expect(malformed[0].message).toContain('abc');
    // A plan whose id will not parse is still reported: enumeration must not run
    // through getAllPlans/scanPlanDir, which drop it.
    expect(findings.every(f => f.path !== undefined)).toBe(true);
  });

  it('reports a plausible status typo that the viewer classifies as started', () => {
    const root = makeWorkspace();
    writePlan(root, '1--p', 'id: 1\nsummary: "s"\ncreated: 2026-01-01');
    writeTask(root, '1--p', '01--typo.md', VALID_TASK.replace('"pending"', '"complete"'));

    const findings = strictPass(root);

    const invalid = findings.filter(f => f.check === 'task/status-invalid');
    expect(invalid).toHaveLength(1);
    expect(invalid[0].message).toContain('complete');
    // An absent status key is a different defect than an unrecognized value.
    expect(invalid[0].check).not.toBe('task/frontmatter-field-missing');
  });

  it('reports dependency entries that are not integers', () => {
    const root = makeWorkspace();
    writePlan(root, '1--p', 'id: 1\nsummary: "s"\ncreated: 2026-01-01');
    writeTask(root, '1--p', '01--bad-deps.md', VALID_TASK.replace('[]', '[task-three]'));

    const findings = strictPass(root);

    expect(findings.map(f => f.check)).toEqual(['task/frontmatter-field-malformed']);
    expect(findings[0].message).toContain('dependencies');
    expect(findings[0].message).toContain('task-three');
  });

  it('reads nothing under archive/ or config/', () => {
    const root = makeWorkspace();
    write(
      path.join(root, 'archive', '9--old', 'plan-9--old.md'),
      '---\nid: nope\n---\n\n# Archived\n'
    );
    write(
      path.join(root, 'config', 'templates', 'TASK_TEMPLATE.md'),
      '---\nid: [TASK-ID]\nstatus: "[STATUS]"\n---\n\n# Template\n'
    );

    expect(strictPass(root)).toEqual([]);
  });

  it('accepts well-formed plans and tasks without findings', () => {
    const root = makeWorkspace();
    writePlan(root, '1--p', 'id: 1\nsummary: "s"\ncreated: 2026-01-01');
    writeTask(root, '1--p', '01--ok.md', `${VALID_TASK}\ncomplexity_score: 4`);
    // complexity_score is optional: legacy tasks predate it and must stay clean.
    writeTask(root, '1--p', '02--ok.md', VALID_TASK.replace('id: 1', 'id: 2'));

    expect(strictPass(root)).toEqual([]);
  });
});
