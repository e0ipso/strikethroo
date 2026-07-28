/**
 * Unit tests for harness discovery (`shared/harness-discovery.ts`): the
 * reviewer-candidate derivation the code review gate depends on.
 *
 * Two properties are load-bearing and are exactly what this suite proves:
 * the current harness is never a candidate for reviewing its own work, even
 * though its availability check reports it available (a "bypass", not a
 * probe); and the underlying availability cache means a second discovery
 * call does not re-probe. A probe is never real here — `runProbe` is always
 * injected — so this suite never depends on any harness CLI being installed.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { discoverHarnesses } from '../skill-scripts/shared/harness-discovery';
import { AVAILABLE_TTL_MS } from '../skill-scripts/shared/harness-availability';
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

  it('never includes the current harness in reviewerCandidates, even though its own check reports it available', async () => {
    const probe = vi.fn(async () => ({ exitCode: 0 }));
    const result = await discoverHarnesses(request(), { runProbe: probe, now: () => 1_000_000 });

    expect(result.reviewerCandidates).not.toContain('claude');
    const own = result.outcomes.find(outcome => outcome.harness === 'claude');
    expect(own).toMatchObject({ available: true, source: 'bypass' });
    // The current harness's outcome is a bypass: it is never among the probe's
    // invocations, even though every probe call in this test succeeds.
    expect(probe).toHaveBeenCalledTimes(SUPPORTED_HARNESSES.length - 1);
    expect(probe.mock.calls.every(([command]) => command.executable !== 'claude')).toBe(true);
    // Sanity: every other harness's (stubbed-successful) probe does make it in.
    expect(result.reviewerCandidates.sort()).toEqual(
      SUPPORTED_HARNESSES.filter(h => h !== 'claude').sort()
    );
  });

  it('serves a second call from cache with no additional probe invocation', async () => {
    let calls = 0;
    const probe = vi.fn(async () => {
      calls += 1;
      return { exitCode: 0 };
    });
    const now = () => 5_000;

    const first = await discoverHarnesses(request(), { runProbe: probe, now });
    const probesAfterFirstCall = calls;
    expect(probesAfterFirstCall).toBe(SUPPORTED_HARNESSES.length - 1);

    const second = await discoverHarnesses(request(), { runProbe: probe, now });
    expect(calls).toBe(probesAfterFirstCall);
    for (const outcome of second.outcomes) {
      if (outcome.harness === 'claude') continue;
      expect(outcome.source).toBe('cache');
    }
    expect(second.reviewerCandidates).toEqual(first.reviewerCandidates);
  });

  it('re-probes once the availability TTL has elapsed', async () => {
    let now = 0;
    let calls = 0;
    const probe = vi.fn(async () => {
      calls += 1;
      return { exitCode: 0 };
    });

    await discoverHarnesses(request(), { runProbe: probe, now: () => now });
    const afterFirst = calls;
    now += AVAILABLE_TTL_MS + 1;
    await discoverHarnesses(request(), { runProbe: probe, now: () => now });

    expect(calls).toBeGreaterThan(afterFirst);
  });

  it('returns an empty candidate set, and never throws, when every probe fails', async () => {
    const probe = vi.fn(async () => ({ exitCode: 1 }));
    const result = await discoverHarnesses(request(), { runProbe: probe, now: () => 1 });

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
    const result = await discoverHarnesses(request(), { runProbe: probe, now: () => 1 });

    expect(result.reviewerCandidates).toEqual([]);
    expect(result.outcomes).toHaveLength(SUPPORTED_HARNESSES.length);
  });
});
