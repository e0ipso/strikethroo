import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  AVAILABLE_TTL_MS,
  AVAILABILITY_CACHE_RELATIVE_PATH,
  AVAILABILITY_REGISTRY_VERSION,
  checkHarnessAvailability,
  HARNESS_AVAILABILITY_REGISTRY,
  PROBE_TIMEOUT_MS,
  UNAVAILABLE_TTL_MS,
} from '../skill-scripts/shared/harness-availability';
import { EXTERNAL_HARNESS_ADAPTERS } from '../skill-scripts/shared/external-dispatch';
import { SUPPORTED_HARNESSES } from '../types';

describe('harness availability', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'strikethroo-availability-'));
  });

  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  it('has one versioned probe matching every external adapter', () => {
    expect(Object.keys(HARNESS_AVAILABILITY_REGISTRY).sort()).toEqual(
      [...SUPPORTED_HARNESSES].sort()
    );
    for (const harness of SUPPORTED_HARNESSES) {
      const probe = HARNESS_AVAILABILITY_REGISTRY[harness];
      expect(probe.version).toBe(AVAILABILITY_REGISTRY_VERSION);
      expect(probe.executable).toBe(EXTERNAL_HARNESS_ADAPTERS[harness].executable);
      expect(probe.model.length).toBeGreaterThan(0);
      expect(probe.buildCommand(root)).toMatchObject({ executable: probe.executable, cwd: root });
    }
  });

  it('bypasses absent and current harness targets', async () => {
    let probes = 0;
    const runProbe = async () => {
      probes += 1;
      return { exitCode: 0 };
    };
    const base = { strikethrooRoot: root, workspace: root, currentHarness: 'codex' as const };
    expect((await checkHarnessAvailability(base, { runProbe })).source).toBe('bypass');
    expect(
      (await checkHarnessAvailability({ ...base, harness: 'codex' }, { runProbe })).source
    ).toBe('bypass');
    expect(probes).toBe(0);
  });

  it('uses positive and negative cache TTLs and refreshes stale entries', async () => {
    let now = 1_000;
    let probes = 0;
    let exitCode = 0;
    const request = {
      strikethrooRoot: root,
      workspace: root,
      currentHarness: 'codex' as const,
      harness: 'claude' as const,
    };
    const dependencies = {
      now: () => now,
      runProbe: async (_command: unknown, timeout: number) => {
        expect(timeout).toBe(PROBE_TIMEOUT_MS);
        probes += 1;
        return { exitCode };
      },
    };

    const available = await checkHarnessAvailability(request, dependencies);
    expect(available.expiresAt).toBe(now + AVAILABLE_TTL_MS);
    expect((await checkHarnessAvailability(request, dependencies)).source).toBe('cache');
    now = available.expiresAt;
    exitCode = 2;
    const unavailable = await checkHarnessAvailability(request, dependencies);
    expect(unavailable).toMatchObject({ available: false, source: 'probe' });
    expect(unavailable.expiresAt).toBe(now + UNAVAILABLE_TTL_MS);
    expect((await checkHarnessAvailability(request, dependencies)).source).toBe('cache');
    expect(probes).toBe(2);
  });

  it('treats malformed and unknown cache state as a miss and sanitizes diagnostics', async () => {
    const cache = path.join(root, AVAILABILITY_CACHE_RELATIVE_PATH);
    fs.mkdirSync(path.dirname(cache), { recursive: true });
    fs.writeFileSync(cache, '{ interrupted');
    const result = await checkHarnessAvailability(
      { strikethrooRoot: root, workspace: root, currentHarness: 'codex', harness: 'gemini' },
      {
        now: () => 50,
        runProbe: async () => ({ exitCode: 9, detail: 'denied\nSECRET'.repeat(100) }),
      }
    );
    expect(result.reason).not.toContain('\n');
    expect(result.reason.length).toBeLessThanOrEqual(200);
    const parsed = JSON.parse(fs.readFileSync(cache, 'utf8'));
    expect(parsed.harnesses.gemini.available).toBe(false);
    expect(Object.keys(parsed.harnesses)).toEqual(['gemini']);
  });

  it('runs a real non-interactive stub executable and caches its failure', async () => {
    const executable = path.join(root, 'claude');
    fs.writeFileSync(executable, '#!/bin/sh\necho "authentication denied" >&2\nexit 7\n', {
      mode: 0o755,
    });
    const previousPath = process.env.PATH;
    process.env.PATH = `${root}${path.delimiter}${previousPath ?? ''}`;
    try {
      const request = {
        strikethrooRoot: root,
        workspace: root,
        currentHarness: 'codex' as const,
        harness: 'claude' as const,
      };
      const first = await checkHarnessAvailability(request);
      expect(first).toMatchObject({
        available: false,
        source: 'probe',
        reason: 'authentication denied',
      });
      expect((await checkHarnessAvailability(request)).source).toBe('cache');
    } finally {
      process.env.PATH = previousPath;
    }
  });

  it('atomically leaves valid JSON after concurrent results', async () => {
    let release: (() => void) | undefined;
    const gate = new Promise<void>(resolve => (release = resolve));
    const request = {
      strikethrooRoot: root,
      workspace: root,
      currentHarness: 'codex' as const,
      harness: 'opencode' as const,
    };
    const first = checkHarnessAvailability(request, {
      now: () => 100,
      runProbe: async () => {
        await gate;
        return { exitCode: 1 };
      },
    });
    const second = checkHarnessAvailability(request, {
      now: () => 200,
      runProbe: async () => ({ exitCode: 0 }),
    });
    await second;
    release?.();
    await first;
    const parsed = JSON.parse(
      fs.readFileSync(path.join(root, AVAILABILITY_CACHE_RELATIVE_PATH), 'utf8')
    );
    expect(parsed.harnesses.opencode).toMatchObject({ available: true, observedAt: 200 });
    expect(fs.readdirSync(path.join(root, 'runtime'))).toEqual(['harness-availability.json']);
  });
});
