import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import {
  AVAILABLE_TTL_MS,
  AVAILABILITY_CACHE_RELATIVE_PATH,
  AVAILABILITY_REGISTRY_VERSION,
  checkHarnessAvailability,
  HARNESS_AVAILABILITY_REGISTRY,
  IMPLEMENTATION_PROBE_FILE_LIMIT,
  PROBE_TIMEOUT_MS,
  UNAVAILABLE_TTL_MS,
  type HarnessReadinessStage,
  type ProbeResult,
} from '../skill-scripts/shared/harness-availability';
import { EXTERNAL_HARNESS_ADAPTERS } from '../skill-scripts/shared/external-dispatch';
import { SUPPORTED_HARNESSES } from '../types';

describe('harness availability', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'strikethroo-availability-'));
  });

  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  const writeConfig = (claudeArgs: readonly string[] = []): void => {
    fs.mkdirSync(path.join(root, 'config'), { recursive: true });
    fs.writeFileSync(
      path.join(root, 'config', 'config.yaml'),
      `harnesses:\n  claude:\n    cli_args:${
        claudeArgs.length === 0
          ? ' []'
          : `\n${claudeArgs.map(argument => `      - ${JSON.stringify(argument)}`).join('\n')}`
      }\n`
    );
  };

  const request = () => ({
    strikethrooRoot: root,
    workspace: root,
    currentHarness: 'codex' as const,
    harness: 'claude' as const,
  });

  const satisfyCapability = (cwd: string, prompt: string): void => {
    const match = /STRIKETHROO_EVIDENCE=(\{[^\n]+\})/.exec(prompt);
    if (!match) throw new Error('Capability prompt did not contain an evidence specification.');
    const evidence = JSON.parse(match[1]) as {
      phase: 'create' | 'modify';
      create: { file: string; content: string };
      modify: { file: string; initialContent: string; finalContent: string };
      command: { file: string; content: string };
    };
    if (evidence.phase === 'create') {
      fs.writeFileSync(path.join(cwd, evidence.create.file), evidence.create.content);
      fs.writeFileSync(path.join(cwd, evidence.modify.file), evidence.modify.initialContent);
    } else {
      fs.writeFileSync(path.join(cwd, evidence.modify.file), evidence.modify.finalContent);
      fs.writeFileSync(path.join(cwd, evidence.command.file), evidence.command.content);
    }
  };

  const successfulProbe =
    (
      calls: Array<{ stage: HarnessReadinessStage; command: { argv: string[]; cwd: string } }>,
      version = 'claude 9.1.0'
    ) =>
    async (
      command: { argv: string[]; cwd: string; stdin: string },
      timeout: number,
      stage: HarnessReadinessStage
    ): Promise<ProbeResult> => {
      expect(timeout).toBe(PROBE_TIMEOUT_MS);
      calls.push({ stage, command });
      if (stage === 'version') return { exitCode: 0, stdout: `${version}\n` };
      if (stage === 'implementation-capability') satisfyCapability(command.cwd, command.stdin);
      return { exitCode: 0 };
    };

  it('uses shared adapter metadata for version, literal auth, and configured invocation', () => {
    expect(Object.keys(HARNESS_AVAILABILITY_REGISTRY).sort()).toEqual(
      [...SUPPORTED_HARNESSES].sort()
    );
    for (const harness of SUPPORTED_HARNESSES) {
      const definition = HARNESS_AVAILABILITY_REGISTRY[harness];
      const adapter = EXTERNAL_HARNESS_ADAPTERS[harness];
      expect(definition.version).toBe(AVAILABILITY_REGISTRY_VERSION);
      expect(definition.executable).toBe(adapter.executable);
      expect(definition.buildVersionCommand(root).argv).toEqual(adapter.versionArgv());
      expect(definition.buildAuthenticationCommand(root).argv).toEqual(
        adapter.authenticationArgv()
      );
      const configured = definition.buildConfiguredCommand(root, ['one arg', '$(literal)']);
      expect(configured.argv).toContain('one arg');
      expect(configured.argv).toContain('$(literal)');
      expect(configured.stdin).toBe('Reply with OK.');
    }
  });

  it('bypasses absent and current harness targets without loading local configuration', async () => {
    fs.mkdirSync(path.join(root, 'config'), { recursive: true });
    fs.writeFileSync(path.join(root, 'config', 'config.yaml'), 'harnesses: invalid\n');
    const runProbe = vi.fn(async () => ({ exitCode: 0 }));
    const base = { strikethrooRoot: root, workspace: root, currentHarness: 'codex' as const };
    expect((await checkHarnessAvailability(base, { runProbe })).source).toBe('bypass');
    expect(
      (await checkHarnessAvailability({ ...base, harness: 'codex' }, { runProbe })).source
    ).toBe('bypass');
    expect(runProbe).not.toHaveBeenCalled();
  });

  it('runs stages in order and verifies nonce evidence in a disposable Git workspace', async () => {
    writeConfig(['--permission-mode', 'acceptEdits']);
    const calls: Array<{
      stage: HarnessReadinessStage;
      command: { argv: string[]; cwd: string };
    }> = [];
    const result = await checkHarnessAvailability(request(), {
      now: () => 10_000,
      resolveExecutable: () => '/opt/bin/claude',
      runProbe: successfulProbe(calls),
    });

    expect(calls.map(call => call.stage)).toEqual([
      'version',
      'authentication',
      'configured-invocation',
      'implementation-capability',
      'implementation-capability',
    ]);
    expect(calls[1].command.argv).toEqual(['auth', 'status']);
    expect(calls[1].command.argv).not.toContain('--permission-mode');
    expect(calls[2].command.argv).toContain('--permission-mode');
    expect(calls[3].command.argv).toContain('--permission-mode');
    expect(calls[2].command.cwd).toBe(calls[3].command.cwd);
    expect(calls[3].command.cwd.startsWith(os.tmpdir())).toBe(true);
    expect(fs.existsSync(calls[3].command.cwd)).toBe(false);
    expect(result).toMatchObject({
      available: true,
      source: 'probe',
      executableIdentity: '/opt/bin/claude',
      executableVersion: 'claude 9.1.0',
      readinessStage: 'ready',
    });
    expect(result.cliArgsHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('runs a fake harness executable with literal argv and no vendor service', async () => {
    writeConfig(['--permission-mode', 'acceptEdits']);
    const bin = path.join(root, 'bin');
    const log = path.join(root, 'fake-harness.jsonl');
    fs.mkdirSync(bin);
    fs.writeFileSync(
      path.join(bin, 'claude'),
      `#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
let stdin = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { stdin += chunk; });
process.stdin.on('end', () => {
  fs.appendFileSync(process.env.STRIKETHROO_FAKE_LOG, JSON.stringify({ argv: process.argv.slice(2), cwd: process.cwd() }) + '\\n');
  if (process.argv.includes('--version')) { process.stdout.write('fake-claude 1.0\\n'); return; }
  const match = /STRIKETHROO_EVIDENCE=(\\{[^\\n]+\\})/.exec(stdin);
  if (!match) return;
  const evidence = JSON.parse(match[1]);
  if (evidence.phase === 'create') {
    fs.writeFileSync(path.join(process.cwd(), evidence.create.file), evidence.create.content);
    fs.writeFileSync(path.join(process.cwd(), evidence.modify.file), evidence.modify.initialContent);
  } else {
    fs.writeFileSync(path.join(process.cwd(), evidence.modify.file), evidence.modify.finalContent);
    fs.writeFileSync(path.join(process.cwd(), evidence.command.file), evidence.command.content);
  }
});
`,
      { mode: 0o755 }
    );
    const previousPath = process.env.PATH;
    const previousLog = process.env.STRIKETHROO_FAKE_LOG;
    process.env.PATH = `${bin}${path.delimiter}${previousPath ?? ''}`;
    process.env.STRIKETHROO_FAKE_LOG = log;
    try {
      const result = await checkHarnessAvailability(request());
      expect(result).toMatchObject({ available: true, executableVersion: 'fake-claude 1.0' });
      const invocations = fs
        .readFileSync(log, 'utf8')
        .trim()
        .split('\n')
        .map(line => JSON.parse(line) as { argv: string[]; cwd: string });
      expect(invocations).toHaveLength(5);
      expect(invocations[1].argv).toEqual(['auth', 'status']);
      for (const invocation of invocations.slice(2)) {
        expect(invocation.argv).toContain('--permission-mode');
      }
      expect(invocations[2].cwd).toBe(invocations[4].cwd);
      expect(fs.existsSync(invocations[4].cwd)).toBe(false);
    } finally {
      if (previousPath === undefined) delete process.env.PATH;
      else process.env.PATH = previousPath;
      if (previousLog === undefined) delete process.env.STRIKETHROO_FAKE_LOG;
      else process.env.STRIKETHROO_FAKE_LOG = previousLog;
    }
  });

  it.each([
    ['version', 'Executable version check failed.'],
    ['authentication', 'Authentication check failed.'],
    ['configured-invocation', 'Configured invocation check failed.'],
    ['implementation-capability', 'Implementation capability check failed.'],
  ] as const)(
    'returns a sanitized %s-stage failure and cleans temp state',
    async (failedStage, reason) => {
      writeConfig(['--local-secret-looking-value']);
      let disposableWorkspace = '';
      const result = await checkHarnessAvailability(request(), {
        now: () => 1,
        resolveExecutable: () => '/opt/bin/claude',
        runProbe: async (command, _timeout, stage) => {
          if (stage === 'version') {
            return failedStage === stage
              ? { exitCode: 7, detail: 'SECRET\nmodel output' }
              : { exitCode: 0, stdout: 'claude 1.0' };
          }
          disposableWorkspace = command.cwd === root ? disposableWorkspace : command.cwd;
          if (stage === failedStage) return { exitCode: 7, detail: 'SECRET\nmodel output' };
          if (stage === 'implementation-capability') satisfyCapability(command.cwd, command.stdin);
          return { exitCode: 0 };
        },
      });

      expect(result).toMatchObject({ available: false, readinessStage: failedStage, reason });
      expect(result.reason).not.toContain('SECRET');
      expect(result.reason).not.toContain('--local-secret-looking-value');
      if (disposableWorkspace) expect(fs.existsSync(disposableWorkspace)).toBe(false);
    }
  );

  it('fails capability verification and enforces the created-file bound', async () => {
    writeConfig();
    let excessiveWorkspace = '';
    const result = await checkHarnessAvailability(request(), {
      resolveExecutable: () => '/opt/bin/claude',
      runProbe: async (command, _timeout, stage) => {
        if (stage === 'version') return { exitCode: 0, stdout: 'claude 1.0' };
        if (stage === 'implementation-capability') {
          excessiveWorkspace = command.cwd;
          for (let index = 0; index <= IMPLEMENTATION_PROBE_FILE_LIMIT; index += 1) {
            fs.writeFileSync(path.join(command.cwd, `extra-${index}`), 'x');
          }
        }
        return { exitCode: 0 };
      },
    });
    expect(result).toMatchObject({
      available: false,
      readinessStage: 'implementation-capability',
      reason: 'Implementation capability check failed: disposable workspace file limit exceeded.',
    });
    expect(fs.existsSync(excessiveWorkspace)).toBe(false);
  });

  it('keys cache v2 by version and ordered argument hash with asymmetric TTLs', async () => {
    writeConfig(['--first']);
    let now = 1_000;
    let version = 'claude 1.0';
    const calls: Array<{
      stage: HarnessReadinessStage;
      command: { argv: string[]; cwd: string };
    }> = [];
    const dependencies = {
      now: () => now,
      resolveExecutable: () => '/opt/bin/claude',
      runProbe: async (...args: Parameters<ReturnType<typeof successfulProbe>>) =>
        successfulProbe(calls, version)(...args),
    };

    const first = await checkHarnessAvailability(request(), dependencies);
    expect(first.expiresAt).toBe(now + AVAILABLE_TTL_MS);
    expect((await checkHarnessAvailability(request(), dependencies)).source).toBe('cache');
    expect(calls.filter(call => call.stage === 'implementation-capability')).toHaveLength(2);

    writeConfig(['--second']);
    await checkHarnessAvailability(request(), dependencies);
    expect(calls.filter(call => call.stage === 'implementation-capability')).toHaveLength(4);

    version = 'claude 2.0';
    await checkHarnessAvailability(request(), dependencies);
    expect(calls.filter(call => call.stage === 'implementation-capability')).toHaveLength(6);

    const cache = JSON.parse(
      fs.readFileSync(path.join(root, AVAILABILITY_CACHE_RELATIVE_PATH), 'utf8')
    );
    expect(cache.version).toBe(2);
    expect(cache.entries).toHaveLength(3);

    now = first.expiresAt;
    const unavailable = await checkHarnessAvailability(request(), {
      ...dependencies,
      runProbe: async (command, timeout, stage) =>
        stage === 'configured-invocation'
          ? { exitCode: 1 }
          : successfulProbe([], version)(command, timeout, stage),
    });
    expect(unavailable.expiresAt).toBe(now + UNAVAILABLE_TTL_MS);
  });

  it('ignores old cache records safely', async () => {
    writeConfig();
    const cachePath = path.join(root, AVAILABILITY_CACHE_RELATIVE_PATH);
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    fs.writeFileSync(
      cachePath,
      JSON.stringify({
        version: 1,
        harnesses: {
          claude: { available: true, observedAt: 1, expiresAt: Number.MAX_SAFE_INTEGER },
        },
      })
    );
    const calls: Array<{
      stage: HarnessReadinessStage;
      command: { argv: string[]; cwd: string };
    }> = [];
    const result = await checkHarnessAvailability(request(), {
      resolveExecutable: () => '/opt/bin/claude',
      runProbe: successfulProbe(calls),
    });
    expect(result.source).toBe('probe');
    expect(calls.map(call => call.stage)).toContain('implementation-capability');
  });

  it('atomically keeps valid cache v2 JSON after concurrent results', async () => {
    writeConfig();
    let release: (() => void) | undefined;
    const gate = new Promise<void>(resolve => (release = resolve));
    const first = checkHarnessAvailability(request(), {
      now: () => 100,
      resolveExecutable: () => '/opt/bin/claude',
      runProbe: async (command, _timeout, stage) => {
        if (stage === 'version') return { exitCode: 0, stdout: 'claude 1.0' };
        if (stage === 'configured-invocation') await gate;
        if (stage === 'implementation-capability') satisfyCapability(command.cwd, command.stdin);
        return { exitCode: 0 };
      },
    });
    const second = checkHarnessAvailability(request(), {
      now: () => 200,
      resolveExecutable: () => '/opt/bin/claude',
      runProbe: async (command, _timeout, stage) => {
        if (stage === 'version') return { exitCode: 0, stdout: 'claude 2.0' };
        if (stage === 'implementation-capability') satisfyCapability(command.cwd, command.stdin);
        return { exitCode: 0 };
      },
    });
    await second;
    release?.();
    await first;
    const parsed = JSON.parse(
      fs.readFileSync(path.join(root, AVAILABILITY_CACHE_RELATIVE_PATH), 'utf8')
    );
    expect(parsed.version).toBe(2);
    expect(parsed.entries).toHaveLength(2);
    expect(fs.readdirSync(path.join(root, 'runtime'))).toEqual(['harness-availability.json']);
  });
});
