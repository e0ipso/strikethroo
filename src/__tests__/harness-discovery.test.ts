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

  it('excludes the current harness and returns local reviewer arguments', async () => {
    fs.mkdirSync(path.join(root, 'config'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'config/config.yaml'),
      'harnesses:\n  codex:\n    cli_args:\n      - --sandbox\n      - workspace-write\n'
    );
    const dependencies = successfulDependencies();

    const result = await discoverHarnesses(request(), dependencies);

    expect(result.reviewerCandidates).not.toContain('claude');
    expect(result.reviewerCandidates.sort()).toEqual(
      SUPPORTED_HARNESSES.filter(harness => harness !== 'claude').sort()
    );
    expect(result.reviewerInvocations?.codex?.cliArgs).toEqual(['--sandbox', 'workspace-write']);
    expect(dependencies.runProbe).toHaveBeenCalledTimes(SUPPORTED_HARNESSES.length - 1);
  });

  it('serves a second discovery from cache', async () => {
    const dependencies = successfulDependencies();
    const now = () => 5_000;

    const first = await discoverHarnesses(request(), { ...dependencies, now });
    expect(dependencies.runProbe).toHaveBeenCalledTimes(SUPPORTED_HARNESSES.length - 1);

    const second = await discoverHarnesses(request(), { ...dependencies, now });
    expect(dependencies.runProbe).toHaveBeenCalledTimes(SUPPORTED_HARNESSES.length - 1);
    expect(second.reviewerCandidates).toEqual(first.reviewerCandidates);
  });

  it('rechecks harnesses after the cache expires', async () => {
    const dependencies = successfulDependencies();
    let now = 0;

    await discoverHarnesses(request(), { ...dependencies, now: () => now });
    now += AVAILABLE_TTL_MS + 1;
    await discoverHarnesses(request(), { ...dependencies, now: () => now });

    expect(dependencies.runProbe).toHaveBeenCalledTimes((SUPPORTED_HARNESSES.length - 1) * 2);
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
