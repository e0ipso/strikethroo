/**
 * Integration tests for execution routing:
 *   1. The bundled route-task-execution.cjs shipped with st-generate-tasks
 *      and st-full-workflow, exercised end-to-end against a fixture
 *      workspace (profiles listing, apply, custom resolver, atomic failure).
 *   2. The generation workflow ordering: routed frontmatter is exactly what
 *      PR #53's dispatch resolver reads at execution time.
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

const runScript = (script: string, args: string[], cwd: string): ScriptResult => {
  try {
    const stdout = execFileSync('node', [script, ...args], { cwd, encoding: 'utf8' });
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

    const apply = runScript(script, ['apply', '12', writeMapping({}), 'claude'], tempDir);
    expect(apply).toEqual({ exitCode: 0, json: { kind: 'no-config' } });
    expect(fs.readFileSync(path.join(tasksDir, '01--first.md'), 'utf8')).toBe(taskFile(1, 2));
  });

  it('lists configured profiles with their LLM-facing descriptions', () => {
    fs.writeFileSync(path.join(workspace, 'config', 'execution-routing.yaml'), ROUTING_CONFIG);
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

  it('applies a valid mapping: exact frontmatter, first-target default, dispatch-compatible', () => {
    fs.writeFileSync(path.join(workspace, 'config', 'execution-routing.yaml'), ROUTING_CONFIG);
    const mapping = writeMapping({ '1': 'routine', '2': 'demanding' });
    const result = runScript(script, ['apply', '12', mapping, 'claude'], tempDir);
    expect(result.exitCode).toBe(0);
    expect(result.json.kind).toBe('routed');

    const first = fs.readFileSync(path.join(tasksDir, '01--first.md'), 'utf8');
    expect(first).toContain('execution:\n  model: "haiku-x"\n---');
    expect(first).not.toContain('routine'); // profile names are never persisted
    // Everything else is preserved losslessly.
    expect(first.replace('execution:\n  model: "haiku-x"\n', '')).toBe(taskFile(1, 2));

    const second = fs.readFileSync(path.join(tasksDir, '02--second.md'), 'utf8');
    expect(second).toContain('execution:\n  model: "opus-x"\n  reasoning_effort: "high"\n---');

    // The written contract is exactly what execution-time dispatch reads.
    const dispatch = path.join(
      SKILLS_ROOT,
      'st-full-workflow',
      'scripts',
      'dispatch-task-execution.cjs'
    );
    const resolved = runScript(
      dispatch,
      ['resolve', path.join(tasksDir, '02--second.md'), 'claude', tempDir, '12', '2'],
      tempDir
    );
    expect(resolved.json).toEqual({
      kind: 'native-override',
      model: 'opus-x',
      reasoningEffort: 'high',
    });
  });

  it('routes through a custom global resolver and honors its in-profile choice', () => {
    fs.writeFileSync(
      path.join(workspace, 'config', 'execution-routing.yaml'),
      `${ROUTING_CONFIG}resolver:\n  script: ./pick.cjs\n`
    );
    fs.writeFileSync(
      path.join(tempDir, 'pick.cjs'),
      `let input = '';
process.stdin.on('data', d => (input += d));
process.stdin.on('end', () => {
  const req = JSON.parse(input);
  const selections = {};
  for (const t of req.tasks) selections[t.id] = t.candidates.length - 1;
  process.stdout.write(JSON.stringify({ selections }));
});`
    );
    const mapping = writeMapping({ '1': 'routine', '2': 'demanding' });
    const result = runScript(script, ['apply', '12', mapping, 'claude'], tempDir);
    expect(result.exitCode).toBe(0);
    expect(result.json.kind).toBe('routed');

    // demanding's second candidate is the external codex target.
    const second = fs.readFileSync(path.join(tasksDir, '02--second.md'), 'utf8');
    expect(second).toContain('execution:\n  harness: "codex"\n  model: "codex-x"\n---');
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
    fs.writeFileSync(path.join(workspace, 'config', 'execution-routing.yaml'), ROUTING_CONFIG);
    const result = runScript(script, ['apply', '12', writeMapping(mapping), 'claude'], tempDir);
    expect(result.exitCode).toBe(1);
    expect(result.json.kind).toBe(kind);
    expect(fs.readFileSync(path.join(tasksDir, '01--first.md'), 'utf8')).toBe(taskFile(1, 2));
    expect(fs.readFileSync(path.join(tasksDir, '02--second.md'), 'utf8')).toBe(taskFile(2, 8));
  });

  it('aborts atomically when the custom resolver fails', () => {
    fs.writeFileSync(
      path.join(workspace, 'config', 'execution-routing.yaml'),
      `${ROUTING_CONFIG}resolver:\n  script: ./pick.cjs\n`
    );
    fs.writeFileSync(path.join(tempDir, 'pick.cjs'), 'process.exit(3);');
    const mapping = writeMapping({ '1': 'routine', '2': 'demanding' });
    const result = runScript(script, ['apply', '12', mapping, 'claude'], tempDir);
    expect(result.exitCode).toBe(1);
    expect(result.json.kind).toBe('resolver-failure');
    expect(fs.readFileSync(path.join(tasksDir, '01--first.md'), 'utf8')).toBe(taskFile(1, 2));
    expect(fs.readFileSync(path.join(tasksDir, '02--second.md'), 'utf8')).toBe(taskFile(2, 8));
  });

  it('fails on an invalid configuration before touching anything', () => {
    fs.writeFileSync(
      path.join(workspace, 'config', 'execution-routing.yaml'),
      'profiles:\n  broken:\n    description: d\n    models: []\n'
    );
    const result = runScript(script, ['profiles', '12'], tempDir);
    expect(result.exitCode).toBe(1);
    expect(result.json.kind).toBe('invalid-config');
    expect((result.json.errors as string[]).join(' ')).toContain('broken');
  });

  it('rejects an unsupported current harness as a usage error', () => {
    fs.writeFileSync(path.join(workspace, 'config', 'execution-routing.yaml'), ROUTING_CONFIG);
    const mapping = writeMapping({ '1': 'routine', '2': 'routine' });
    const result = runScript(script, ['apply', '12', mapping, 'not-a-harness'], tempDir);
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
