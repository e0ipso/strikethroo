import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AVAILABLE_TTL_MS } from '../skill-scripts/shared/harness-availability';
import { discoverHarnesses } from '../skill-scripts/shared/harness-discovery';
import { SUPPORTED_HARNESSES } from '../types';

describe('harness discovery', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'strikethroo-discovery-'));
  });

  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  const request = () => ({
    strikethrooRoot: root,
    workspace: root,
    currentHarness: 'claude' as const,
  });

  const successfulDependencies = () => ({
    resolveExecutable: (executable: string) => `/fake/bin/${executable}`,
    runProbe: vi.fn(async (command: { cwd: string; stdin: string }) => {
      const match = /STRIKETHROO_READINESS=(\{[^\n]+\})/.exec(command.stdin);
      if (!match) return { exitCode: 1 };
      const evidence = JSON.parse(match[1]) as { file: string; content: string };
      fs.writeFileSync(path.join(command.cwd, evidence.file), evidence.content);
      return { exitCode: 0 };
    }),
  });

  it('lists alternatives in stable order, then the current harness last, with local reviewer arguments', async () => {
    fs.mkdirSync(path.join(root, 'config'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'config/config.yaml'),
      'harnesses:\n  codex:\n    cli_args:\n      - --sandbox\n      - workspace-write\n'
    );
    const dependencies = successfulDependencies();

    const result = await discoverHarnesses(request(), dependencies);

    expect(result.reviewerCandidates).toEqual([
      ...SUPPORTED_HARNESSES.filter(harness => harness !== 'claude'),
      'claude',
    ]);
    expect(Object.keys(result.reviewerInvocations ?? {}).sort()).toEqual(
      [...SUPPORTED_HARNESSES].sort()
    );
    expect(result.reviewerInvocations?.codex?.cliArgs).toEqual(['--sandbox', 'workspace-write']);
    // The current harness is probed too: no native bypass authorizes review.
    expect(dependencies.runProbe).toHaveBeenCalledTimes(SUPPORTED_HARNESSES.length);
    expect(result.outcomes.every(outcome => outcome.source !== 'bypass')).toBe(true);
  });

  it('gives reviewers the mapped cli_args model and drops a harness whose name cannot be mapped', async () => {
    fs.mkdirSync(path.join(root, 'config'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'config/config.yaml'),
      'harnesses:\n  codex:\n    cli_args:\n      - --config\n      - model="gpt-sol"\n' +
        '  cursor:\n    cli_args:\n      - --model\n      - grok-xhigh\n'
    );
    const dependencies = successfulDependencies();
    const delegate = dependencies.runProbe;
    const runProbe = vi.fn(async (command: { cwd: string; stdin: string; executable: string }) => {
      if (command.stdin.includes('strikethroo-models.json')) {
        const models = command.executable.endsWith('/codex') ? ['gpt-6.1-sol'] : ['grok-4.7-low'];
        fs.writeFileSync(
          path.join(command.cwd, 'strikethroo-models.json'),
          JSON.stringify({
            models,
            aliases: { '1': models[0] === 'gpt-6.1-sol' ? 'gpt-6.1-sol' : 'grok-9' },
          })
        );
      }
      return delegate(command);
    });

    const result = await discoverHarnesses(request(), { ...dependencies, runProbe });

    expect(result.reviewerInvocations?.codex?.cliArgs).toEqual(['--config', 'model="gpt-6.1-sol"']);
    expect(result.reviewerCandidates).not.toContain('cursor');
    expect(result.outcomes.find(outcome => outcome.harness === 'cursor')).toMatchObject({
      available: false,
      reason: expect.stringContaining('harnesses.cursor.cli_args'),
    });
  });

  it('offers only the current harness when no alternative is ready', async () => {
    const dependencies = successfulDependencies();
    const delegate = dependencies.runProbe;
    const runProbe = vi.fn(async (command: { cwd: string; stdin: string; executable: string }) =>
      command.executable.endsWith('/claude') ? delegate(command) : { exitCode: 1 }
    );

    const result = await discoverHarnesses(request(), { ...dependencies, runProbe });

    expect(result.reviewerCandidates).toEqual(['claude']);
    expect(Object.keys(result.reviewerInvocations ?? {})).toEqual(['claude']);
  });

  it('reports every harness as unavailable when the configuration is invalid', async () => {
    fs.mkdirSync(path.join(root, 'config'), { recursive: true });
    fs.writeFileSync(path.join(root, 'config/config.yaml'), 'harnesses: [\n');

    const result = await discoverHarnesses(request(), successfulDependencies());

    expect(result.configurationErrors?.length).toBeGreaterThan(0);
    expect(result.reviewerCandidates).toEqual([]);
    expect(result.outcomes).toHaveLength(SUPPORTED_HARNESSES.length);
    for (const outcome of result.outcomes) {
      expect(outcome).toMatchObject({
        available: false,
        reason: 'Harness configuration is invalid.',
      });
    }
  });

  it('serves a second discovery from cache', async () => {
    const dependencies = successfulDependencies();
    const now = () => 5_000;

    const first = await discoverHarnesses(request(), { ...dependencies, now });
    expect(dependencies.runProbe).toHaveBeenCalledTimes(SUPPORTED_HARNESSES.length);

    const second = await discoverHarnesses(request(), { ...dependencies, now });
    expect(dependencies.runProbe).toHaveBeenCalledTimes(SUPPORTED_HARNESSES.length);
    expect(second.reviewerCandidates).toEqual(first.reviewerCandidates);
  });

  it('rechecks harnesses after the cache expires', async () => {
    const dependencies = successfulDependencies();
    let now = 0;

    await discoverHarnesses(request(), { ...dependencies, now: () => now });
    now += AVAILABLE_TTL_MS + 1;
    await discoverHarnesses(request(), { ...dependencies, now: () => now });

    expect(dependencies.runProbe).toHaveBeenCalledTimes(SUPPORTED_HARNESSES.length * 2);
  });

  it('returns no candidates when probes fail', async () => {
    const result = await discoverHarnesses(request(), {
      resolveExecutable: executable => `/fake/bin/${executable}`,
      runProbe: async () => ({ exitCode: 1 }),
    });

    expect(result.reviewerCandidates).toEqual([]);
    expect(result.outcomes).toHaveLength(SUPPORTED_HARNESSES.length);
  });
});
