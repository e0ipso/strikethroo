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
import { extractPlanId } from '../skill-scripts/shared/frontmatter';
import { readYamlFrontmatter } from '../skill-scripts/shared/task-frontmatter';
import { readTaskMetadata } from '../skill-scripts/shared/task-file';
import { parseFrontmatter, extractBody } from '../serve/markdown';

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

  it('accepts `failed`, which the execution skills themselves write', () => {
    const root = makeWorkspace();
    writePlan(root, '1--p', 'id: 1\nsummary: "s"\ncreated: 2026-01-01');
    // st-execute-task step 9 and dispatch-outcomes on `launched-failure` both set
    // this value, so reporting it would make `validate` fail on its own output.
    writeTask(root, '1--p', '01--failed.md', VALID_TASK.replace('"pending"', '"failed"'));

    expect(strictPass(root)).toEqual([]);
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

  /**
   * One table over the written-value forms rather than a test per form. Every
   * row's plan carries `summary: "a # b"`, so a quoted scalar whose value
   * legitimately contains `#` is asserted clean throughout; the `status` rows
   * prove the `#` actually survives into the value, since a malformed-value
   * message is the only place the pass echoes what it read. After a closing
   * quote only whitespace and a whitespace-led `#` comment may follow; any
   * other suffix is malformed YAML and must be reported, not discarded.
   */
  it('separates a trailing comment from a value, in every written form', () => {
    const commentedTask = [
      'id: 3 # third',
      'group: "g"',
      'dependencies: [] # none',
      'status: "completed"  # done',
      'created: 2026-01-01',
      'skills:',
      '  - typescript',
      'complexity_score: 5  # scored',
    ].join('\n');

    const cases: ReadonlyArray<{
      label: string;
      frontmatter: string;
      checks: string[];
      messageContains?: string;
    }> = [
      { label: 'plain and quoted scalars', frontmatter: VALID_TASK, checks: [] },
      { label: 'a comment on every scalar', frontmatter: commentedTask, checks: [] },
      {
        label: 'a quoted value containing a hash',
        frontmatter: VALID_TASK.replace('"pending"', '"a # b"'),
        checks: ['task/status-invalid'],
        messageContains: '`a # b`',
      },
      {
        label: 'a malformed quoted value behind a comment',
        frontmatter: VALID_TASK.replace('"pending"', '"complete"  # typo'),
        checks: ['task/status-invalid'],
        messageContains: '`complete`',
      },
      {
        label: 'an unterminated quote',
        frontmatter: VALID_TASK.replace('"pending"', '"pending'),
        checks: ['task/frontmatter-malformed'],
      },
      {
        label: 'a quoted value followed by text that is not a comment',
        frontmatter: VALID_TASK.replace('"pending"', '"completed" garbage'),
        checks: ['task/frontmatter-malformed'],
      },
      {
        label: 'a single-quoted value followed by text, then a comment',
        frontmatter: VALID_TASK.replace('"pending"', "'completed' x # c"),
        checks: ['task/frontmatter-malformed'],
      },
      {
        label: 'a comment glued to the closing quote',
        frontmatter: VALID_TASK.replace('"pending"', '"completed"# done'),
        checks: ['task/frontmatter-malformed'],
      },
      {
        label: 'an absent field',
        frontmatter: VALID_TASK.replace('status: "pending"\n', ''),
        checks: ['task/frontmatter-field-missing'],
        messageContains: '`status`',
      },
      {
        label: 'a malformed value behind a comment',
        frontmatter: `${VALID_TASK}\ncomplexity_score: 99  # too big`,
        checks: ['task/frontmatter-field-malformed'],
        messageContains: '`99`',
      },
    ];

    for (const testCase of cases) {
      const root = makeWorkspace();
      writePlan(root, '1--p', 'id: 1\nsummary: "a # b"\ncreated: 2026-01-01');
      writeTask(root, '1--p', '01--t.md', testCase.frontmatter);

      const findings = strictPass(root);

      expect({ label: testCase.label, checks: findings.map(f => f.check) }).toEqual({
        label: testCase.label,
        checks: testCase.checks,
      });
      if (testCase.messageContains !== undefined) {
        expect(`${testCase.label}: ${findings[0]?.message}`).toContain(testCase.messageContains);
      }
    }
  });
});

describe('one YAML interpretation across discovery, execution, validation, and display', () => {
  it.each(['\n', '\r\n'])(
    'ignores nested IDs and scalar text while preserving YAML values (%j)',
    eol => {
      const root = makeWorkspace();
      const fields = [
        'metadata:',
        '  id: 999',
        'summary: |',
        '  id: 888',
        '  A multiline description.',
        'id: "03"',
        'created: 2026-01-01',
        'status: pending',
        'dependencies: [1, "02"]',
        'skills: ["typescript, vitest", "a # b"]',
        'complexity_score: "7"',
      ];
      const document = ['﻿---  ', ...fields, '...  ', '# Body', '---', 'unchanged'].join(eol);
      const parsed = readYamlFrontmatter(document);
      expect(parsed.kind).toBe('data');
      expect(extractPlanId(document, 'fixture.md')).toBe(3);
      expect(readTaskMetadata(document)).toEqual({
        kind: 'metadata',
        metadata: { status: 'pending', dependencies: [1, 2] },
      });
      expect(parseFrontmatter(document)).toMatchObject({
        id: 3,
        created: '2026-01-01',
        summary: 'id: 888\nA multiline description.\n',
        dependencies: [1, 2],
        skills: ['typescript, vitest', 'a # b'],
        complexity_score: 7,
      });
      expect(extractBody(document)).toBe(['# Body', '---', 'unchanged'].join(eol));
      write(path.join(root, 'plans', '3--shared', 'plan-shared.md'), document);
      write(path.join(root, 'plans', '3--shared', 'tasks', '03--shared.md'), document);
      expect(strictPass(root)).toEqual([]);
    }
  );

  it('reads flow mappings and quoted keys, and leaves body whitespace unchanged', () => {
    const root = makeWorkspace();
    const document =
      '---\n{"id": "03", "summary": "quoted # text", "created": "2026-01-01", "status": "pending", "dependencies": [], "skills": [], "complexity_score": 7}\n---\n\n# Body\n';
    expect(extractPlanId(document, 'fixture.md')).toBe(3);
    expect(readTaskMetadata(document)).toEqual({
      kind: 'metadata',
      metadata: { status: 'pending', dependencies: [] },
    });
    expect(parseFrontmatter(document)).toMatchObject({
      id: 3,
      summary: 'quoted # text',
      created: '2026-01-01',
      complexity_score: 7,
    });
    expect(extractBody(document)).toBe('\n# Body\n');
    write(path.join(root, 'plans', '3--flow', 'plan-flow.md'), document);
    write(path.join(root, 'plans', '3--flow', 'tasks', '03--flow.md'), document);
    expect(strictPass(root)).toEqual([]);
  });

  it('bounds metadata bytes while allowing a large Markdown body', () => {
    const document = `---\nid: 3\nstatus: pending\ndependencies: []\n---\n${'λ'.repeat(100_000)}`;
    expect(extractPlanId(document, 'fixture.md')).toBe(3);
    expect(readTaskMetadata(document).kind).toBe('metadata');
    const oversized = `---\nid: 3\nnotes: "${'λ'.repeat(32_768)}"\n---\n# Body\n`;
    expect(readYamlFrontmatter(oversized)).toEqual({
      kind: 'invalid',
      reason: 'Frontmatter exceeds the 65536-byte limit.',
    });
    expect(extractPlanId(oversized, 'fixture.md')).toBeNull();
    expect(parseFrontmatter(oversized)).toEqual({ dependencies: [], skills: [], extra: {} });
    expect(extractBody(oversized)).toBe('# Body\n');
  });

  it.each(['id: 3\nid: 4', 'id: "unterminated', '- id: 3', 'just a scalar'])(
    'rejects malformed or non-mapping metadata consistently: %s',
    fields => {
      const root = makeWorkspace();
      const document = `---\n${fields}\n---\n# Body\n`;
      expect(readYamlFrontmatter(document).kind).toBe('invalid');
      expect(extractPlanId(document, 'fixture.md')).toBeNull();
      expect(readTaskMetadata(document).kind).toBe('rejected');
      expect(parseFrontmatter(document)).toEqual({ dependencies: [], skills: [], extra: {} });
      expect(extractBody(document)).toBe('# Body\n');
      write(path.join(root, 'plans', '3--invalid', 'plan-invalid.md'), document);
      expect(strictPass(root).map(f => f.check)).toEqual(['plan/frontmatter-malformed']);
    }
  );
});
