/**
 * Unit tests for the execution-routing shared module: configuration
 * parsing/validation, assignment-map validation, and durable profile
 * frontmatter mutation.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import {
  loadRoutingConfig,
  validateAssignments,
  writeExecutionProfileFrontmatter,
  WORKSPACE_CONFIG_RELPATH,
} from '../skill-scripts/shared/execution-routing';
import { SUPPORTED_HARNESSES } from '../types';

const VALID_CONFIG = `
# config.yaml is generic: foreign sections belong to other features.
other_feature:
  flag: true
execution_routing:
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

const RESOLVER_SUFFIX = '  resolver:\n    script: ./scripts/pick.cjs\n';

describe('loadRoutingConfig', () => {
  let tempDir: string;

  const writeConfig = (contents: string): string => {
    const configPath = path.join(tempDir, WORKSPACE_CONFIG_RELPATH);
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

  it('returns no-config when config.yaml is absent', () => {
    expect(loadRoutingConfig(tempDir, SUPPORTED_HARNESSES).kind).toBe('no-config');
  });

  it.each([
    ['profiles is an empty mapping', 'execution_routing:\n  profiles: {}\n'],
    [
      'a bare profiles key with everything commented out',
      'execution_routing:\n  profiles:\n#   routine:\n',
    ],
    ['config.yaml has no execution_routing section', 'other_feature:\n  flag: true\n'],
    ['config.yaml contains only comments', '# nothing configured yet\n'],
  ])('returns disabled when %s', (_label, contents) => {
    writeConfig(contents);
    expect(loadRoutingConfig(tempDir, SUPPORTED_HARNESSES).kind).toBe('disabled');
  });

  it('returns disabled for the shipped template (routing section present, profiles empty)', () => {
    const template = fs.readFileSync(
      path.join(__dirname, '..', '..', 'templates', 'strikethroo', WORKSPACE_CONFIG_RELPATH),
      'utf8'
    );
    writeConfig(template);
    expect(loadRoutingConfig(tempDir, SUPPORTED_HARNESSES).kind).toBe('disabled');
  });

  it('parses valid profiles, ignoring foreign top-level sections', () => {
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
    writeConfig(`${VALID_CONFIG}${RESOLVER_SUFFIX}`);
    const result = loadRoutingConfig(tempDir, SUPPORTED_HARNESSES);
    expect(result.kind).toBe('config');
    if (result.kind !== 'config') return;
    expect(result.config.resolverScript).toBe('./scripts/pick.cjs');
  });

  it.each([
    ['not valid YAML', 'execution_routing: {'],
    ['a non-mapping document', '- just\n- a list\n'],
    ['a non-mapping execution_routing section', 'execution_routing: 7\n'],
    ['a routing section without profiles', 'execution_routing:\n  resolver:\n    script: ./x\n'],
    [
      'a profile without a description',
      'execution_routing:\n  profiles:\n    a:\n      models:\n        - model: m\n',
    ],
    [
      'a profile with an empty models array',
      'execution_routing:\n  profiles:\n    a:\n      description: d\n      models: []\n',
    ],
    [
      'a target without a model',
      'execution_routing:\n  profiles:\n    a:\n      description: d\n      models:\n        - harness: codex\n',
    ],
    [
      'a target with an unknown key',
      'execution_routing:\n  profiles:\n    a:\n      description: d\n      models:\n        - model: m\n          temperature: 1\n',
    ],
    [
      'a target with an unsupported harness',
      'execution_routing:\n  profiles:\n    a:\n      description: d\n      models:\n        - model: m\n          harness: nope\n',
    ],
    [
      'a non-string reasoning_effort',
      'execution_routing:\n  profiles:\n    a:\n      description: d\n      models:\n        - model: m\n          reasoning_effort: 3\n',
    ],
    [
      'an unknown key inside the routing section',
      'execution_routing:\n  profiles: {}\n  extra: true\n',
    ],
    ['a resolver without a script', `${VALID_CONFIG}  resolver: {}\n`],
  ])('rejects %s', (_label, contents) => {
    writeConfig(contents);
    const result = loadRoutingConfig(tempDir, SUPPORTED_HARNESSES);
    expect(result.kind).toBe('invalid');
    if (result.kind !== 'invalid') return;
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects a per-profile resolver with a pointed error', () => {
    writeConfig(
      'execution_routing:\n  profiles:\n    a:\n      description: d\n      resolver: ./x\n      models:\n        - model: m\n'
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

describe('writeExecutionProfileFrontmatter', () => {
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

  it('appends the durable profile and preserves all other content', () => {
    const mutated = writeExecutionProfileFrontmatter(task, 'demanding');
    expect(mutated).toContain('execution_profile: "demanding"\n---');
    // Everything except the inserted block is byte-identical.
    expect(mutated.replace('execution_profile: "demanding"\n', '')).toBe(task);
  });

  it('replaces an existing profile and removes unreleased concrete execution metadata', () => {
    const legacy = task.replace(
      '---\n## Objective',
      'execution:\n  model: old-model\n---\n## Objective'
    );
    const once = writeExecutionProfileFrontmatter(legacy, 'routine');
    const twice = writeExecutionProfileFrontmatter(once, 'demanding');
    expect(twice.match(/^execution_profile:/gm)).toHaveLength(1);
    expect(twice).toContain('execution_profile: "demanding"');
    expect(twice).not.toContain('old-model');
    expect(twice).not.toMatch(/^execution:/m);
  });

  it('throws on a document without frontmatter', () => {
    expect(() => writeExecutionProfileFrontmatter('# no frontmatter\n', 'routine')).toThrow(
      'missing frontmatter'
    );
  });
});
