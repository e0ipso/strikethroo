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
      reason:
        'Harness exited 0 but did not create the required readiness file with the expected content.',
    });
  });

  it('captures bounded stdout and stderr from a real failed process and preserves them in cache', async () => {
    writeConfig([]);
    const executable = path.join(root, 'fake-harness');
    fs.writeFileSync(
      executable,
      `#!/usr/bin/env node
process.stdout.write('x'.repeat(10000) + 'quota exceeded');
process.stderr.write('Authentication expired');
process.exit(7);
`,
      { mode: 0o755 }
    );
    const dependencies = { resolveExecutable: () => executable };
    const first = await checkHarnessAvailability(request(), dependencies);
    expect(first.available).toBe(false);
    expect(first.reason).toContain('exited 7');
    expect(first.reason).toContain('stderr: Authentication expired');
    expect(first.reason).toContain('quota exceeded');
    expect(first.reason.length).toBeLessThan(8300);
    const cached = await checkHarnessAvailability(request(), dependencies);
    expect(cached.source).toBe('cache');
    expect(cached.reason).toBe(first.reason);
  });

  it.each([
    [
      { exitCode: 1, timedOut: true, stderr: 'Sandbox denied' },
      'timed out after 20000 ms. stderr: Sandbox denied',
    ],
    [
      { exitCode: 0, stdout: 'Command execution is disabled' },
      'expected content. stdout: Command execution is disabled',
    ],
  ])('explains readiness failures with harness diagnostics', async (probe, reason) => {
    writeConfig([]);
    const result = await checkHarnessAvailability(request(), {
      resolveExecutable: () => '/opt/bin/claude',
      runProbe: async () => probe,
    });
    expect(result.available).toBe(false);
    expect(result.reason).toContain(reason);
  });

  it('reports the OS error when the executable disappears before launch', async () => {
    writeConfig([]);
    const result = await checkHarnessAvailability(request(), {
      resolveExecutable: () => path.join(root, 'missing-executable'),
    });
    expect(result.reason).toContain('could not launch:');
    expect(result.reason).toContain('ENOENT');
  });

  describe('review purpose', () => {
    const reviewRequest = () => ({
      ...request(),
      harness: 'claude' as const,
      currentHarness: 'claude' as const,
      purpose: 'review' as const,
    });

    let savedClaudeCode: string | undefined;
    beforeEach(() => {
      savedClaudeCode = process.env.CLAUDECODE;
      process.env.CLAUDECODE = '1';
    });
    afterEach(() => {
      if (savedClaudeCode === undefined) delete process.env.CLAUDECODE;
      else process.env.CLAUDECODE = savedClaudeCode;
    });

    it('probes the current harness with a clean-session command and caches the result', async () => {
      writeConfig(['--permission-mode', 'acceptEdits']);
      const base = successfulProbe();
      const runProbe = vi.fn(base.runProbe);
      const dependencies = { ...base, runProbe };

      const first = await checkHarnessAvailability(reviewRequest(), dependencies);
      expect(first).toMatchObject({ harness: 'claude', available: true, source: 'probe' });
      expect(runProbe).toHaveBeenCalledTimes(1);
      const command = runProbe.mock.calls[0]![0];
      expect(command.argv).toEqual(['-p', '--permission-mode', 'acceptEdits']);
      expect(command.env).toBeDefined();
      expect(command.env).not.toHaveProperty('CLAUDECODE');
      expect(command.env).toHaveProperty('PATH', process.env.PATH);

      const second = await checkHarnessAvailability(reviewRequest(), dependencies);
      expect(second.source).toBe('cache');
      expect(runProbe).toHaveBeenCalledTimes(1);
    });

    it('passes the cleaned environment to the real probe process', async () => {
      writeConfig([]);
      const executable = path.join(root, 'fake-harness');
      fs.writeFileSync(
        executable,
        `#!/usr/bin/env node
process.stdout.write('CLAUDECODE=' + (process.env.CLAUDECODE ?? 'unset'));
process.exit(7);
`,
        { mode: 0o755 }
      );
      const dependencies = { resolveExecutable: () => executable };

      const review = await checkHarnessAvailability(reviewRequest(), dependencies);
      expect(review.reason).toContain('CLAUDECODE=unset');
      const task = await checkHarnessAvailability(request(), dependencies);
      expect(task.reason).toContain('CLAUDECODE=1');
    });

    it('does not bypass a missing current-harness executable, and needs an explicit harness', async () => {
      writeConfig([]);
      const runProbe = vi.fn();
      const missing = await checkHarnessAvailability(reviewRequest(), {
        resolveExecutable: () => null,
        runProbe,
      });
      expect(missing).toMatchObject({ available: false, source: 'probe' });
      expect(missing.reason).toContain("'claude' was not found on PATH");

      const { harness: _harness, ...withoutHarness } = reviewRequest();
      const implicit = await checkHarnessAvailability(withoutHarness, {
        ...successfulProbe(),
        runProbe,
      });
      expect(implicit).toMatchObject({ harness: 'claude', available: false });
      expect(implicit.source).not.toBe('bypass');
      expect(implicit.reason).toContain('explicit harness');
      expect(runProbe).not.toHaveBeenCalled();
    });

    it('rejects a session-reuse argument without probing or caching', async () => {
      writeConfig(['--resume', 'abc']);
      const runProbe = vi.fn();
      const result = await checkHarnessAvailability(reviewRequest(), {
        resolveExecutable: () => '/opt/bin/claude',
        runProbe,
      });

      expect(result).toMatchObject({ available: false, source: 'probe' });
      expect(result.reason).toContain('harnesses.claude.cli_args[0]');
      expect(result.reason).toContain('--resume');
      expect(runProbe).not.toHaveBeenCalled();
      expect(fs.existsSync(path.join(root, AVAILABILITY_CACHE_RELATIVE_PATH))).toBe(false);
    });

    it('keeps task and review cache entries apart in both directions', async () => {
      writeConfig(['--same']);
      const task = { ...request(), purpose: 'task' as const };
      const review = { ...request(), purpose: 'review' as const };
      const dependencies = (runProbe: ReturnType<typeof vi.fn>) => ({
        now: () => 1_000,
        resolveExecutable: () => '/opt/bin/claude',
        runProbe,
      });

      const taskFirst = vi.fn(successfulProbe().runProbe);
      expect((await checkHarnessAvailability(task, dependencies(taskFirst))).source).toBe('probe');
      expect((await checkHarnessAvailability(review, dependencies(taskFirst))).source).toBe(
        'probe'
      );
      expect(taskFirst).toHaveBeenCalledTimes(2);
      expect((await checkHarnessAvailability(task, dependencies(taskFirst))).source).toBe('cache');
      expect((await checkHarnessAvailability(review, dependencies(taskFirst))).source).toBe(
        'cache'
      );
      expect(taskFirst).toHaveBeenCalledTimes(2);

      fs.rmSync(path.join(root, AVAILABILITY_CACHE_RELATIVE_PATH));
      const reviewFirst = vi.fn(successfulProbe().runProbe);
      expect((await checkHarnessAvailability(review, dependencies(reviewFirst))).source).toBe(
        'probe'
      );
      expect((await checkHarnessAvailability(task, dependencies(reviewFirst))).source).toBe(
        'probe'
      );
      expect(reviewFirst).toHaveBeenCalledTimes(2);
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
