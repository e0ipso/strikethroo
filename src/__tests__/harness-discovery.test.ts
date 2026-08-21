/**
 * Unit tests for harness discovery (`shared/harness-discovery.ts`): the
 * reviewer-candidate derivation the code review gate depends on.
 *
 * Two properties are load-bearing and are exactly what this suite proves:
 * the current harness is never a candidate for reviewing its own work, even
 * though its availability check reports it available (a "bypass", not a
 * probe); and the underlying availability cache means a second discovery
 * call rechecks only the cheap local version stage. A probe is never real here — `runProbe` is always
 * injected — so this suite never depends on any harness CLI being installed.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { discoverHarnesses } from '../skill-scripts/shared/harness-discovery';
import {
  AVAILABLE_TTL_MS,
  type HarnessReadinessStage,
} from '../skill-scripts/shared/harness-availability';
import { SUPPORTED_HARNESSES } from '../types';

describe('harness discovery', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'strikethroo-discovery-'));
  });

  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  // A function, not a plain object: `root` is only assigned inside `beforeEach`,
  // so this must read it fresh per test rather than capture it once at collection time.
  const request = () => ({
    strikethrooRoot: root,
    workspace: root,
    currentHarness: 'claude' as const,
  });

  const successfulProbe = async (
    command: { cwd: string; stdin: string },
    _timeout: number,
    stage: HarnessReadinessStage
  ) => {
    if (stage === 'version') return { exitCode: 0, stdout: 'fake-cli 1.0' };
    if (stage === 'implementation-capability') {
      const match = /STRIKETHROO_EVIDENCE=(\{[^\n]+\})/.exec(command.stdin);
      if (!match) throw new Error('Missing capability evidence specification.');
      const evidence = JSON.parse(match[1]) as {
        phase: 'create' | 'modify';
        create: { file: string; content: string };
        modify: { file: string; initialContent: string; finalContent: string };
        command: { file: string; content: string };
      };
      if (evidence.phase === 'create') {
        fs.writeFileSync(path.join(command.cwd, evidence.create.file), evidence.create.content);
        fs.writeFileSync(
          path.join(command.cwd, evidence.modify.file),
          evidence.modify.initialContent
        );
      } else {
        fs.writeFileSync(
          path.join(command.cwd, evidence.modify.file),
          evidence.modify.finalContent
        );
        fs.writeFileSync(path.join(command.cwd, evidence.command.file), evidence.command.content);
      }
    }
    return { exitCode: 0 };
  };

  const successfulDependencies = () => ({
    resolveExecutable: (executable: string) => path.join('/fake/bin', executable),
    runProbe: vi.fn(successfulProbe),
  });

  it('never includes the current harness in reviewerCandidates, even though its own check reports it available', async () => {
    const dependencies = successfulDependencies();
    const result = await discoverHarnesses(request(), {
      ...dependencies,
      now: () => 1_000_000,
    });

    expect(result.reviewerCandidates).not.toContain('claude');
    const own = result.outcomes.find(outcome => outcome.harness === 'claude');
    expect(own).toMatchObject({ available: true, source: 'bypass' });
    // The current harness's outcome is a bypass: it is never among the probe's
    // invocations, even though every probe call in this test succeeds.
    expect(dependencies.runProbe).toHaveBeenCalledTimes((SUPPORTED_HARNESSES.length - 1) * 5);
    expect(
      dependencies.runProbe.mock.calls.every(([command]) => !command.executable.endsWith('claude'))
    ).toBe(true);
    // Sanity: every other harness's (stubbed-successful) probe does make it in.
    expect(result.reviewerCandidates.sort()).toEqual(
      SUPPORTED_HARNESSES.filter(h => h !== 'claude').sort()
    );
  });

  it('serves expensive stages from cache after rechecking executable versions', async () => {
    const dependencies = successfulDependencies();
    const now = () => 5_000;

    const first = await discoverHarnesses(request(), { ...dependencies, now });
    const probesAfterFirstCall = dependencies.runProbe.mock.calls.length;
    expect(probesAfterFirstCall).toBe((SUPPORTED_HARNESSES.length - 1) * 5);

    const second = await discoverHarnesses(request(), { ...dependencies, now });
    expect(dependencies.runProbe).toHaveBeenCalledTimes(
      probesAfterFirstCall + SUPPORTED_HARNESSES.length - 1
    );
    const secondCallStages = dependencies.runProbe.mock.calls
      .slice(probesAfterFirstCall)
      .map(([, , stage]) => stage);
    expect(new Set(secondCallStages)).toEqual(new Set(['version']));
    for (const outcome of second.outcomes) {
      if (outcome.harness === 'claude') continue;
      expect(outcome.source).toBe('cache');
    }
    expect(second.reviewerCandidates).toEqual(first.reviewerCandidates);
  });

  it('re-probes once the availability TTL has elapsed', async () => {
    let now = 0;
    const dependencies = successfulDependencies();

    await discoverHarnesses(request(), { ...dependencies, now: () => now });
    const afterFirst = dependencies.runProbe.mock.calls.length;
    now += AVAILABLE_TTL_MS + 1;
    await discoverHarnesses(request(), { ...dependencies, now: () => now });

    expect(dependencies.runProbe.mock.calls.length).toBeGreaterThan(afterFirst);
  });

  it('returns an empty candidate set, and never throws, when every probe fails', async () => {
    const probe = vi.fn(async () => ({ exitCode: 1 }));
    const result = await discoverHarnesses(request(), {
      resolveExecutable: executable => path.join('/fake/bin', executable),
      runProbe: probe,
      now: () => 1,
    });

    expect(result.reviewerCandidates).toEqual([]);
    expect(result.outcomes).toHaveLength(SUPPORTED_HARNESSES.length);
    expect(
      result.outcomes.every(outcome => outcome.available === false || outcome.source === 'bypass')
    ).toBe(true);
  });

  it('never throws when the probe itself rejects', async () => {
    const probe = vi.fn(async () => {
      throw new Error('probe process crashed');
    });
    const result = await discoverHarnesses(request(), {
      resolveExecutable: executable => path.join('/fake/bin', executable),
      runProbe: probe,
      now: () => 1,
    });

    expect(result.reviewerCandidates).toEqual([]);
    expect(result.outcomes).toHaveLength(SUPPORTED_HARNESSES.length);
  });
});
