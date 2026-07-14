/**
 * Integration tests for execution routing:
 *   1. The bundled route-task-execution.cjs shipped with st-generate-tasks
 *      and st-full-workflow, exercised end-to-end against a fixture
 *      workspace (profiles listing, apply, and atomic failure).
 *   2. Generation persists profiles without selecting concrete targets.
 *   3. The assembled SKILL.md artifacts: both task-generation skills carry
 *      the routing procedure at the right lifecycle point, with no
 *      unresolved template directives.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SKILLS_ROOT = path.join(REPO_ROOT, 'templates', 'harness', 'skills');

interface ScriptResult {
  exitCode: number;
  json: Record<string, unknown>;
}

const runScript = (
  script: string,
  args: string[],
  cwd: string,
  env?: Record<string, string | undefined>
): ScriptResult => {
  try {
    // Invoke node by absolute path so a caller-restricted PATH (used to control
    // which harnesses count as "available") still finds the interpreter.
    const stdout = execFileSync(process.execPath, [script, ...args], {
      cwd,
      encoding: 'utf8',
      env: env ?? process.env,
    });
    return { exitCode: 0, json: JSON.parse(stdout.trim()) };
  } catch (error) {
    const e = error as { status?: number; stdout?: string };
    return { exitCode: e.status ?? 1, json: JSON.parse((e.stdout ?? '').trim()) };
  }
};

const taskFile = (id: number, complexity: number): string =>
  [
    '---',
    `id: ${id}`,
    'group: "core"',
    'dependencies: []',
    'status: "pending"',
    'created: 2026-01-01',
    'skills:',
    '  - typescript',
    `complexity_score: ${complexity}`,
    '---',
    '## Objective',
    '',
    `Task ${id}.`,
    '',
  ].join('\n');

const ROUTING_CONFIG = `
# Foreign sections belong to other features and must not disturb routing.
some_future_feature:
  enabled: true
execution_routing:
  profiles:
    routine:
      description: Localized low-risk work.
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

const RESOLVER_SUFFIX = '  resolver:\n    script: ./pick.cjs\n';

describe('route-task-execution bundle integration', () => {
  let tempDir: string;
  let workspace: string;
  let tasksDir: string;
  let script: string;

  const writeMapping = (mapping: Record<string, string>): string => {
    const file = path.join(tempDir, 'mapping.json');
    fs.writeFileSync(file, JSON.stringify(mapping));
    return file;
  };

  beforeAll(() => {
    execFileSync('npm', ['run', 'build:skills'], { cwd: REPO_ROOT, stdio: 'pipe' });
  });

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'route-exec-'));
    workspace = path.join(tempDir, '.ai', 'strikethroo');
    const planDir = path.join(workspace, 'plans', '12--fixture');
    tasksDir = path.join(planDir, 'tasks');
    fs.mkdirSync(tasksDir, { recursive: true });
    fs.mkdirSync(path.join(workspace, 'config'), { recursive: true });
    fs.writeFileSync(
      path.join(workspace, '.init-metadata.json'),
      JSON.stringify({ version: 'test', workspaceSchemaVersion: 4 })
    );
    fs.writeFileSync(
      path.join(planDir, 'plan-12--fixture.md'),
      '---\nid: 12\nsummary: "fixture"\ncreated: 2026-01-01\n---\nbody\n'
    );
    fs.writeFileSync(path.join(tasksDir, '01--first.md'), taskFile(1, 2));
    fs.writeFileSync(path.join(tasksDir, '02--second.md'), taskFile(2, 8));

    // The bundle is copied out of the repo so root discovery resolves the
    // fixture workspace, not this repository.
    script = path.join(tempDir, 'route-task-execution.cjs');
    fs.copyFileSync(
      path.join(SKILLS_ROOT, 'st-generate-tasks', 'scripts', 'route-task-execution.cjs'),
      script
    );
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('reports no-config so generation continues without execution metadata', () => {
    const profiles = runScript(script, ['profiles', '12'], tempDir);
    expect(profiles).toEqual({ exitCode: 0, json: { kind: 'no-config' } });

    const apply = runScript(script, ['apply', '12', writeMapping({})], tempDir);
    expect(apply).toEqual({ exitCode: 0, json: { kind: 'no-config' } });
    expect(fs.readFileSync(path.join(tasksDir, '01--first.md'), 'utf8')).toBe(taskFile(1, 2));
  });

  it('lists configured profiles with their LLM-facing descriptions', () => {
    fs.writeFileSync(path.join(workspace, 'config', 'config.yaml'), ROUTING_CONFIG);
    const result = runScript(script, ['profiles', '12'], tempDir);
    expect(result.exitCode).toBe(0);
    expect(result.json).toEqual({
      kind: 'profiles',
      profiles: [
        { name: 'routine', description: 'Localized low-risk work.', targetCount: 1 },
        { name: 'demanding', description: 'Cross-cutting risky work.', targetCount: 2 },
      ],
      customResolver: false,
    });
  });

  it('applies a valid mapping as durable profiles without selecting targets', () => {
    fs.writeFileSync(path.join(workspace, 'config', 'config.yaml'), ROUTING_CONFIG);
    const mapping = writeMapping({ '1': 'routine', '2': 'demanding' });
    const result = runScript(script, ['apply', '12', mapping], tempDir);
    expect(result.exitCode).toBe(0);
    expect(result.json.kind).toBe('routed');

    const first = fs.readFileSync(path.join(tasksDir, '01--first.md'), 'utf8');
    expect(first).toContain('execution_profile: "routine"\n---');
    expect(first).not.toContain('haiku-x');
    // Everything else is preserved losslessly.
    expect(first.replace('execution_profile: "routine"\n', '')).toBe(taskFile(1, 2));

    const second = fs.readFileSync(path.join(tasksDir, '02--second.md'), 'utf8');
    expect(second).toContain('execution_profile: "demanding"\n---');
    expect(second).not.toContain('opus-x');
    expect(second).not.toMatch(/^execution:/m);
  });

  it('does not execute the configured resolver during generation', () => {
    fs.writeFileSync(
      path.join(workspace, 'config', 'config.yaml'),
      `${ROUTING_CONFIG}${RESOLVER_SUFFIX}`
    );
    fs.writeFileSync(
      path.join(tempDir, 'pick.cjs'),
      `require('fs').writeFileSync(${JSON.stringify(path.join(tempDir, 'resolver-ran'))}, 'yes');`
    );
    const mapping = writeMapping({ '1': 'routine', '2': 'demanding' });
    const result = runScript(script, ['apply', '12', mapping], tempDir);
    expect(result.exitCode).toBe(0);
    expect(result.json.kind).toBe('routed');

    const second = fs.readFileSync(path.join(tasksDir, '02--second.md'), 'utf8');
    expect(second).toContain('execution_profile: "demanding"\n---');
    expect(fs.existsSync(path.join(tempDir, 'resolver-ran'))).toBe(false);
  });

  it.each([
    ['an incomplete mapping', { '1': 'routine' }, 'invalid-assignments'],
    ['an unknown profile', { '1': 'routine', '2': 'mystery' }, 'invalid-assignments'],
    [
      'an unknown task ID',
      { '1': 'routine', '2': 'routine', '9': 'routine' },
      'invalid-assignments',
    ],
  ])('rejects %s and leaves every task file untouched', (_label, mapping, kind) => {
    fs.writeFileSync(path.join(workspace, 'config', 'config.yaml'), ROUTING_CONFIG);
    const result = runScript(script, ['apply', '12', writeMapping(mapping)], tempDir);
    expect(result.exitCode).toBe(1);
    expect(result.json.kind).toBe(kind);
    expect(fs.readFileSync(path.join(tasksDir, '01--first.md'), 'utf8')).toBe(taskFile(1, 2));
    expect(fs.readFileSync(path.join(tasksDir, '02--second.md'), 'utf8')).toBe(taskFile(2, 8));
  });

  it('fails on an invalid configuration before touching anything', () => {
    fs.writeFileSync(
      path.join(workspace, 'config', 'config.yaml'),
      'execution_routing:\n  profiles:\n    broken:\n      description: d\n      models: []\n'
    );
    const result = runScript(script, ['profiles', '12'], tempDir);
    expect(result.exitCode).toBe(1);
    expect(result.json.kind).toBe('invalid-config');
    expect((result.json.errors as string[]).join(' ')).toContain('broken');
  });

  it('rejects obsolete current-harness arguments as a usage error', () => {
    fs.writeFileSync(path.join(workspace, 'config', 'config.yaml'), ROUTING_CONFIG);
    const mapping = writeMapping({ '1': 'routine', '2': 'routine' });
    const result = runScript(script, ['apply', '12', mapping, 'claude'], tempDir);
    expect(result.exitCode).toBe(2);
    expect(result.json.kind).toBe('infrastructure-failure');
  });
});

describe('task-generation skill artifacts carry the routing procedure', () => {
  beforeAll(() => {
    execFileSync('npm', ['run', 'build:skill-prompts'], { cwd: REPO_ROOT, stdio: 'pipe' });
  });

  it.each(['st-generate-tasks', 'st-full-workflow'])(
    '%s SKILL.md routes after task emission and before blueprint generation',
    skill => {
      const content = fs.readFileSync(path.join(SKILLS_ROOT, skill, 'SKILL.md'), 'utf8');
      expect(content).toContain('route-task-execution.cjs profiles');
      expect(content).toContain('route-task-execution.cjs apply');
      expect(content).toContain('execution_profile');
      expect(content).toContain('never during generation');
      expect(content).toContain('TASK_EXECUTION_ROUTING.md');
      expect(content).not.toContain('{{include');
      expect(content).not.toContain('{{variable');

      const emitIndex = content.indexOf('Emit the task files');
      const routingIndex = content.indexOf('Route task execution');
      const blueprintIndex = content.indexOf('POST_TASK_GENERATION_ALL hook');
      expect(emitIndex).toBeGreaterThan(-1);
      expect(routingIndex).toBeGreaterThan(emitIndex);
      expect(blueprintIndex).toBeGreaterThan(routingIndex);
    }
  );

  it.each(['st-generate-tasks', 'st-full-workflow'])('%s ships the routing bundle', skill => {
    expect(
      fs.existsSync(path.join(SKILLS_ROOT, skill, 'scripts', 'route-task-execution.cjs'))
    ).toBe(true);
  });
});
