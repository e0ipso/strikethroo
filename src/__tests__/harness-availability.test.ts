import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AVAILABILITY_CACHE_RELATIVE_PATH,
  AVAILABLE_TTL_MS,
  checkHarnessAvailability,
  HARNESS_AVAILABILITY_REGISTRY,
  type HarnessAvailabilityDependencies,
} from '../skill-scripts/shared/harness-availability';
import { EXTERNAL_HARNESS_ADAPTERS } from '../skill-scripts/shared/external-dispatch';
import { loadHarnessConfiguration } from '../skill-scripts/shared/harness-configuration';
import { SUPPORTED_HARNESSES } from '../types';

describe('harness availability', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-availability-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  const writeConfig = (cliArgs: readonly string[]): void => {
    const configDir = path.join(root, 'config');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(
      path.join(configDir, 'config.yaml'),
      `harnesses:\n  claude:\n    cli_args:${
        cliArgs.length === 0 ? ' []' : `\n${cliArgs.map(arg => `      - ${arg}`).join('\n')}`
      }\n`
    );
  };

  const invocation = () => {
    const loaded = loadHarnessConfiguration(root);
    if (loaded.kind !== 'config') throw new Error(loaded.errors.join(' '));
    return loaded.config.claude;
  };

  const request = () => ({
    strikethrooRoot: root,
    workspace: root,
    harness: 'claude' as const,
    currentHarness: 'codex' as const,
    invocation: invocation(),
  });

  const successfulProbe = (): Pick<
    HarnessAvailabilityDependencies,
    'resolveExecutable' | 'runProbe'
  > => ({
    resolveExecutable: () => '/opt/bin/claude',
    runProbe: async command => {
      const match = /STRIKETHROO_READINESS=(\{[^\n]+\})/.exec(command.stdin);
      if (!match) return { exitCode: 1 };
      const evidence = JSON.parse(match[1]) as { file: string; content: string };
      fs.writeFileSync(path.join(command.cwd, evidence.file), evidence.content);
      return { exitCode: 0 };
    },
  });

  it('derives one configured command from each shared adapter', () => {
    for (const harness of SUPPORTED_HARNESSES) {
      const definition = HARNESS_AVAILABILITY_REGISTRY[harness];
      const adapter = EXTERNAL_HARNESS_ADAPTERS[harness];
      const command = definition.buildCommand(root, ['--local-arg'], 'probe');
      expect(definition.executable).toBe(adapter.executable);
      expect(command.argv).toContain('--local-arg');
      expect(command.stdin).toBe('probe');
    }
  });

  it('bypasses the current harness without probing', async () => {
    const runProbe = vi.fn();
    const result = await checkHarnessAvailability(
      {
        strikethrooRoot: root,
        workspace: root,
        harness: 'codex',
        currentHarness: 'codex',
      },
      { runProbe }
    );

    expect(result).toMatchObject({ available: true, source: 'bypass' });
    expect(runProbe).not.toHaveBeenCalled();
  });

  it('runs one configured request and verifies its file', async () => {
    writeConfig(['--permission-mode', 'acceptEdits']);
    let probeWorkspace = '';
    let probeArgv: string[] = [];
    const base = successfulProbe();

    const result = await checkHarnessAvailability(request(), {
      ...base,
      runProbe: async (command, timeout) => {
        probeWorkspace = command.cwd;
        probeArgv = command.argv;
        return base.runProbe(command, timeout);
      },
    });

    expect(result).toMatchObject({ available: true, source: 'probe' });
    expect(probeArgv).toContain('--permission-mode');
    expect(probeWorkspace.startsWith(os.tmpdir())).toBe(true);
    expect(fs.existsSync(probeWorkspace)).toBe(false);
  });

  it('rejects a zero-exit request that did not create the file', async () => {
    writeConfig([]);
    const result = await checkHarnessAvailability(request(), {
      resolveExecutable: () => '/opt/bin/claude',
      runProbe: async () => ({ exitCode: 0 }),
    });

    expect(result).toMatchObject({
      available: false,
      source: 'probe',
      reason: 'Harness readiness check failed.',
    });
  });

  it('caches by executable path and ordered argument hash', async () => {
    writeConfig(['--first']);
    const runProbe = vi.fn(successfulProbe().runProbe);
    const dependencies = {
      now: () => 1_000,
      resolveExecutable: () => '/opt/bin/claude',
      runProbe,
    };

    const first = await checkHarnessAvailability(request(), dependencies);
    expect(first.expiresAt).toBe(1_000 + AVAILABLE_TTL_MS);
    expect((await checkHarnessAvailability(request(), dependencies)).source).toBe('cache');
    expect(runProbe).toHaveBeenCalledTimes(1);

    writeConfig(['--second']);
    expect((await checkHarnessAvailability(request(), dependencies)).source).toBe('probe');
    expect(runProbe).toHaveBeenCalledTimes(2);

    const cache = JSON.parse(
      fs.readFileSync(path.join(root, AVAILABILITY_CACHE_RELATIVE_PATH), 'utf8')
    ) as { version: number; entries: unknown[] };
    expect(cache).toMatchObject({ version: 2 });
    expect(cache.entries).toHaveLength(2);
  });
});
