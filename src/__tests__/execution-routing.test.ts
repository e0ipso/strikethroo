/**
 * Unit tests for the execution-routing shared module: configuration
 * parsing/validation, assignment-map validation, deterministic target
 * selection (default and custom resolver), and exact frontmatter mutation.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import {
  loadRoutingConfig,
  validateAssignments,
  selectTargets,
  toExecutionMapping,
  writeExecutionFrontmatter,
  ROUTING_CONFIG_RELPATH,
  type RoutingConfig,
} from '../skill-scripts/shared/execution-routing';
import { readTaskExecutionPolicy } from '../skill-scripts/shared/execution-policy';
import { SUPPORTED_HARNESSES } from '../types';

const VALID_CONFIG = `
profiles:
  routine:
    description: >
      Localized low-risk work.
    models:
      - model: haiku-x
  demanding:
    description: Cross-cutting risky work.
    models:
      - model: opus-x
        reasoning_effort: high
      - harness: codex
        model: codex-x
`;

describe('loadRoutingConfig', () => {
  let tempDir: string;

  const writeConfig = (contents: string): string => {
    const configPath = path.join(tempDir, ROUTING_CONFIG_RELPATH);
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, contents);
    return tempDir;
  };

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routing-config-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns no-config when the file is absent', () => {
    expect(loadRoutingConfig(tempDir, SUPPORTED_HARNESSES).kind).toBe('no-config');
  });

  it('returns disabled when profiles is an empty mapping', () => {
    writeConfig('profiles: {}\n');
    expect(loadRoutingConfig(tempDir, SUPPORTED_HARNESSES).kind).toBe('disabled');
  });

  it('returns disabled for a bare profiles key with everything commented out', () => {
    writeConfig('profiles:\n# routine:\n#   description: d\n');
    expect(loadRoutingConfig(tempDir, SUPPORTED_HARNESSES).kind).toBe('disabled');
  });

  it('returns disabled for the shipped template (comments only + empty profiles)', () => {
    const template = fs.readFileSync(
      path.join(__dirname, '..', '..', 'templates', 'strikethroo', ROUTING_CONFIG_RELPATH),
      'utf8'
    );
    writeConfig(template);
    expect(loadRoutingConfig(tempDir, SUPPORTED_HARNESSES).kind).toBe('disabled');
  });

  it('parses valid profiles preserving names, descriptions, and target order', () => {
    writeConfig(VALID_CONFIG);
    const result = loadRoutingConfig(tempDir, SUPPORTED_HARNESSES);
    expect(result.kind).toBe('config');
    if (result.kind !== 'config') return;
    expect(result.config.profiles.map(p => p.name)).toEqual(['routine', 'demanding']);
    expect(result.config.profiles[0]?.description).toBe('Localized low-risk work.');
    expect(result.config.profiles[1]?.targets).toEqual([
      { model: 'opus-x', reasoning_effort: 'high' },
      { model: 'codex-x', harness: 'codex' },
    ]);
    expect(result.config.resolverScript).toBeUndefined();
  });

  it('parses the optional global resolver', () => {
    writeConfig(`${VALID_CONFIG}resolver:\n  script: ./scripts/pick.cjs\n`);
    const result = loadRoutingConfig(tempDir, SUPPORTED_HARNESSES);
    expect(result.kind).toBe('config');
    if (result.kind !== 'config') return;
    expect(result.config.resolverScript).toBe('./scripts/pick.cjs');
  });

  it.each([
    ['not valid YAML', 'profiles: {'],
    ['a non-mapping document', '- just\n- a list\n'],
    ['a missing profiles mapping', 'resolver:\n  script: ./x\n'],
    ['a profile without a description', 'profiles:\n  a:\n    models:\n      - model: m\n'],
    [
      'a profile with an empty models array',
      'profiles:\n  a:\n    description: d\n    models: []\n',
    ],
    [
      'a target without a model',
      'profiles:\n  a:\n    description: d\n    models:\n      - harness: codex\n',
    ],
    [
      'a target with an unknown key',
      'profiles:\n  a:\n    description: d\n    models:\n      - model: m\n        temperature: 1\n',
    ],
    [
      'a target with an unsupported harness',
      'profiles:\n  a:\n    description: d\n    models:\n      - model: m\n        harness: nope\n',
    ],
    [
      'a non-string reasoning_effort',
      'profiles:\n  a:\n    description: d\n    models:\n      - model: m\n        reasoning_effort: 3\n',
    ],
    ['an unknown top-level key', `${VALID_CONFIG}extra: true\n`],
    ['a resolver without a script', `${VALID_CONFIG}resolver: {}\n`],
  ])('rejects %s', (_label, contents) => {
    writeConfig(contents);
    const result = loadRoutingConfig(tempDir, SUPPORTED_HARNESSES);
    expect(result.kind).toBe('invalid');
    if (result.kind !== 'invalid') return;
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects a per-profile resolver with a pointed error', () => {
    writeConfig(
      'profiles:\n  a:\n    description: d\n    resolver: ./x\n    models:\n      - model: m\n'
    );
    const result = loadRoutingConfig(tempDir, SUPPORTED_HARNESSES);
    expect(result.kind).toBe('invalid');
    if (result.kind !== 'invalid') return;
    expect(result.errors.join(' ')).toContain('per-profile resolver');
  });
});

describe('validateAssignments', () => {
  const profiles = ['routine', 'demanding'];

  it('accepts a complete one-to-one mapping', () => {
    const result = validateAssignments({ '1': 'routine', '2': 'demanding' }, [1, 2], profiles);
    expect(result.kind).toBe('assignments');
    if (result.kind !== 'assignments') return;
    expect([...result.assignments.entries()]).toEqual([
      [1, 'routine'],
      [2, 'demanding'],
    ]);
  });

  it.each([
    ['a missing task assignment', { '1': 'routine' }, [1, 2]],
    ['an unknown task ID', { '1': 'routine', '2': 'routine', '9': 'routine' }, [1, 2]],
    ['an unknown profile name', { '1': 'mystery', '2': 'routine' }, [1, 2]],
    ['duplicate assignments via zero padding', { '1': 'routine', '01': 'demanding' }, [1]],
    ['a non-numeric key', { one: 'routine', '2': 'routine' }, [1, 2]],
    ['a non-object payload', ['routine'], [1]],
  ])('rejects %s', (_label, rawMap, taskIds) => {
    const result = validateAssignments(rawMap, taskIds as number[], profiles);
    expect(result.kind).toBe('invalid');
    if (result.kind !== 'invalid') return;
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe('selectTargets', () => {
  const config: RoutingConfig = {
    profiles: [
      { name: 'routine', description: 'd', targets: [{ model: 'first' }, { model: 'second' }] },
    ],
  };
  const assignments = new Map([
    [1, 'routine'],
    [2, 'routine'],
  ]);

  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'routing-resolver-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('defaults to the first configured target', () => {
    const result = selectTargets(config, assignments, { planId: 1, projectRoot: tempDir });
    expect(result.kind).toBe('selected');
    if (result.kind !== 'selected') return;
    expect(result.selections.get(1)).toEqual({ model: 'first' });
    expect(result.selections.get(2)).toEqual({ model: 'first' });
  });

  it('lets a custom resolver pick a later candidate by index', () => {
    const script = path.join(tempDir, 'pick.cjs');
    fs.writeFileSync(
      script,
      `let input = '';
process.stdin.on('data', d => (input += d));
process.stdin.on('end', () => {
  const req = JSON.parse(input);
  const selections = {};
  for (const t of req.tasks) selections[t.id] = 1;
  process.stdout.write(JSON.stringify({ selections }));
});`
    );
    const withResolver = { ...config, resolverScript: './pick.cjs' };
    const result = selectTargets(withResolver, assignments, { planId: 1, projectRoot: tempDir });
    expect(result.kind).toBe('selected');
    if (result.kind !== 'selected') return;
    expect(result.selections.get(1)).toEqual({ model: 'second' });
  });

  it.each([
    ['a missing resolver script', null],
    ['a crashing resolver', 'process.exit(3);'],
    ['non-JSON resolver output', "process.stdout.write('nope');"],
    [
      'an out-of-range candidate index',
      "process.stdout.write(JSON.stringify({ selections: { '1': 7, '2': 0 } }));",
    ],
    [
      'a selection for an unknown task',
      "process.stdout.write(JSON.stringify({ selections: { '1': 0, '2': 0, '9': 0 } }));",
    ],
    ['a missing selection', "process.stdout.write(JSON.stringify({ selections: { '1': 0 } }));"],
  ])('fails clearly on %s', (_label, scriptBody) => {
    if (scriptBody !== null) {
      fs.writeFileSync(path.join(tempDir, 'pick.cjs'), scriptBody);
    }
    const withResolver = { ...config, resolverScript: './pick.cjs' };
    const result = selectTargets(withResolver, assignments, { planId: 1, projectRoot: tempDir });
    expect(result.kind).toBe('resolver-failure');
    if (result.kind !== 'resolver-failure') return;
    expect(result.detail.length).toBeGreaterThan(0);
  });
});

describe('toExecutionMapping', () => {
  it('omits the harness when it names the current orchestrator', () => {
    expect(toExecutionMapping({ model: 'm', harness: 'claude' }, 'claude')).toEqual({
      model: 'm',
    });
  });

  it('keeps a different harness and the optional reasoning effort', () => {
    expect(
      toExecutionMapping({ model: 'm', harness: 'codex', reasoning_effort: 'high' }, 'claude')
    ).toEqual({ model: 'm', harness: 'codex', reasoning_effort: 'high' });
  });

  it('adds no implicit reasoning_effort default', () => {
    expect(toExecutionMapping({ model: 'm' }, 'claude')).toEqual({ model: 'm' });
  });
});

describe('writeExecutionFrontmatter', () => {
  const task = [
    '---',
    'id: 3',
    'group: "core"',
    'dependencies: [1]',
    'status: "pending"',
    'skills:',
    '  - typescript',
    'complexity_score: 6',
    '---',
    '## Objective',
    '',
    'Do the thing.',
    '',
  ].join('\n');

  it('appends an exact execution mapping and preserves all other content', () => {
    const mutated = writeExecutionFrontmatter(task, {
      harness: 'codex',
      model: 'codex-x',
      reasoning_effort: 'high',
    });
    expect(mutated).toContain(
      'execution:\n  harness: "codex"\n  model: "codex-x"\n  reasoning_effort: "high"\n---'
    );
    // Everything except the inserted block is byte-identical.
    expect(
      mutated.replace(
        'execution:\n  harness: "codex"\n  model: "codex-x"\n  reasoning_effort: "high"\n',
        ''
      )
    ).toBe(task);

    const policy = readTaskExecutionPolicy(mutated, {
      currentHarness: 'claude',
      supportedHarnesses: SUPPORTED_HARNESSES,
    });
    expect(policy).toEqual({
      kind: 'external-override',
      harness: 'codex',
      model: 'codex-x',
      reasoningEffort: 'high',
    });
  });

  it('replaces an existing execution block instead of stacking a second one', () => {
    const once = writeExecutionFrontmatter(task, { model: 'first-model' });
    const twice = writeExecutionFrontmatter(once, { model: 'second-model' });
    expect(twice.match(/^execution:/gm)).toHaveLength(1);
    expect(twice).toContain('model: "second-model"');
    expect(twice).not.toContain('first-model');
  });

  it('throws on a document without frontmatter', () => {
    expect(() => writeExecutionFrontmatter('# no frontmatter\n', { model: 'm' })).toThrow(
      'missing frontmatter'
    );
  });
});
