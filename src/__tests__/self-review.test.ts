/**
 * Unit tests for the self-review launch logic (`src/serve/self-review.ts`).
 *
 * These cover the security-critical behavior the serve endpoint delegates to:
 * PATH-based availability detection, plan-path containment validation (the only
 * guard between client input and a spawned process), and the launch decision
 * tree. The actual binary is never required — availability and the spawn are
 * injected — so the suite is deterministic regardless of the host environment.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { EventEmitter } from 'events';
import { setImmediate } from 'timers';
import {
  isSelfReviewAvailable,
  resolveReviewPath,
  launchSelfReview,
  createLaunchRegistry,
  MAX_CONCURRENT_SELF_REVIEWS,
  SELF_REVIEW_BINARY,
} from '../serve/self-review';

/** Builds a throwaway workspace: <tmp>/.ai/strikethroo with plans/ + archive/. */
const makeWorkspace = () => {
  const project = fs.mkdtempSync(path.join(os.tmpdir(), 'sr-test-'));
  const root = path.join(project, '.ai', 'strikethroo');
  const planDir = path.join(root, 'plans', '01--demo');
  const archiveDir = path.join(root, 'archive', '02--old');
  fs.mkdirSync(planDir, { recursive: true });
  fs.mkdirSync(archiveDir, { recursive: true });
  fs.mkdirSync(path.join(root, 'config'), { recursive: true });
  const planFile = path.join(planDir, 'plan-01--demo.md');
  const archiveFile = path.join(archiveDir, 'plan-02--old.md');
  const configFile = path.join(root, 'config', 'STRIKETHROO.md');
  fs.writeFileSync(planFile, '# plan\n');
  fs.writeFileSync(archiveFile, '# old plan\n');
  fs.writeFileSync(configFile, '# context\n');
  return { project, root, planFile, archiveFile, configFile };
};

describe('isSelfReviewAvailable', () => {
  it('returns false when PATH is empty', () => {
    expect(isSelfReviewAvailable({ PATH: '' })).toBe(false);
    expect(isSelfReviewAvailable({})).toBe(false);
  });

  it('returns true when a matching binary is found on PATH', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sr-bin-'));
    const name = process.platform === 'win32' ? `${SELF_REVIEW_BINARY}.CMD` : SELF_REVIEW_BINARY;
    fs.writeFileSync(path.join(dir, name), '#!/bin/sh\n', { mode: 0o755 });
    expect(isSelfReviewAvailable({ PATH: dir, PATHEXT: '.CMD' })).toBe(true);
  });

  it('returns false when PATH dirs contain no matching binary', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sr-empty-'));
    expect(isSelfReviewAvailable({ PATH: dir, PATHEXT: '.CMD' })).toBe(false);
  });
});

describe('resolveReviewPath', () => {
  it('accepts a workspace-relative plan path under plans/', () => {
    const ws = makeWorkspace();
    const rel = path.relative(ws.project, ws.planFile);
    const result = resolveReviewPath(ws.root, rel);
    expect('absPath' in result && result.absPath).toBe(ws.planFile);
  });

  it('accepts a path under archive/', () => {
    const ws = makeWorkspace();
    const rel = path.relative(ws.project, ws.archiveFile);
    const result = resolveReviewPath(ws.root, rel);
    expect('absPath' in result && result.absPath).toBe(ws.archiveFile);
  });

  it('rejects a path inside the workspace but outside plans/ and archive/', () => {
    const ws = makeWorkspace();
    const rel = path.relative(ws.project, ws.configFile);
    const result = resolveReviewPath(ws.root, rel);
    expect('error' in result && result.status).toBe(400);
  });

  it('rejects a traversal escape outside the workspace', () => {
    const ws = makeWorkspace();
    const result = resolveReviewPath(ws.root, '../../../../etc/passwd');
    expect('error' in result && result.status).toBe(400);
  });

  it('rejects a non-existent file under plans/', () => {
    const ws = makeWorkspace();
    const result = resolveReviewPath(ws.root, '.ai/strikethroo/plans/99--none/plan-99--none.md');
    expect('error' in result && result.status).toBe(404);
  });

  it('rejects empty input', () => {
    const ws = makeWorkspace();
    const result = resolveReviewPath(ws.root, '   ');
    expect('error' in result && result.status).toBe(400);
  });

  it('rejects a symlinked plan file or plan directory that points outside the workspace', () => {
    const ws = makeWorkspace();
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'sr-outside-'));
    const outsideFile = path.join(outside, 'leak.md');
    fs.writeFileSync(outsideFile, '# leak\n');
    fs.symlinkSync(outsideFile, path.join(ws.root, 'plans', '01--demo', 'linked.md'));
    fs.symlinkSync(outside, path.join(ws.root, 'plans', '03--linked'), 'dir');

    const viaFile = resolveReviewPath(ws.root, '.ai/strikethroo/plans/01--demo/linked.md');
    const viaDir = resolveReviewPath(ws.root, '.ai/strikethroo/plans/03--linked/leak.md');
    for (const result of [viaFile, viaDir]) {
      expect('error' in result).toBe(true);
      if ('error' in result) expect(result.status).toBeGreaterThanOrEqual(400);
      if ('error' in result) expect(result.status).toBeLessThan(500);
    }
    fs.rmSync(outside, { recursive: true, force: true });
  });
});

/** A stand-in for the detached child: emits `spawn`/`error`/`exit` on command. */
class FakeChild extends EventEmitter {
  unrefCalls = 0;
  unref(): void {
    this.unrefCalls += 1;
  }
}

/**
 * A `spawn` seam that records every launch and hands back fake children. By
 * default each child reports `spawn` on the next tick; `manual` children wait
 * for the test to emit, and `fail` children report an ENOENT-style `error`.
 */
const fakeSpawner = (mode: 'auto' | 'manual' | 'fail' = 'auto') => {
  const calls: Array<{ cmd: string; args: string[] }> = [];
  const children: FakeChild[] = [];
  const spawn = (cmd: string, args: string[]): FakeChild => {
    calls.push({ cmd, args });
    const child = new FakeChild();
    children.push(child);
    if (mode === 'auto') process.nextTick(() => child.emit('spawn'));
    if (mode === 'fail') {
      process.nextTick(() =>
        child.emit(
          'error',
          Object.assign(new Error('spawn self-review ENOENT'), { code: 'ENOENT' })
        )
      );
    }
    return child;
  };
  return { spawn, calls, children };
};

/** Adds one more plan file to the workspace and returns its project-relative path. */
const addPlan = (ws: ReturnType<typeof makeWorkspace>, n: number): string => {
  const dir = path.join(ws.root, 'plans', `${n}--extra`);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `plan-${n}--extra.md`);
  fs.writeFileSync(file, `# plan ${n}\n`);
  return path.relative(ws.project, file);
};

const tick = (): Promise<void> => new Promise(resolve => setImmediate(resolve));

describe('launchSelfReview', () => {
  it('returns 409 when the binary is not available, without spawning', async () => {
    const ws = makeWorkspace();
    const rel = path.relative(ws.project, ws.planFile);
    const spawner = fakeSpawner();
    const result = await launchSelfReview(ws.root, rel, {
      available: () => false,
      spawn: spawner.spawn,
      registry: createLaunchRegistry(),
    });
    expect(result.status).toBe(409);
    expect(result.body.ok).toBe(false);
    expect(spawner.calls).toEqual([]);
  });

  it('spawns the resolved absolute path, detaches the child, and succeeds only once spawn fires', async () => {
    const ws = makeWorkspace();
    const rel = path.relative(ws.project, ws.planFile);
    const spawner = fakeSpawner('manual');
    let settled = false;
    const pending = launchSelfReview(ws.root, rel, {
      available: () => true,
      spawn: spawner.spawn,
      registry: createLaunchRegistry(),
    }).then(result => {
      settled = true;
      return result;
    });

    await tick();
    expect(spawner.calls).toEqual([{ cmd: SELF_REVIEW_BINARY, args: [ws.planFile] }]);
    expect(settled).toBe(false);

    spawner.children[0]!.emit('spawn');
    const result = await pending;
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ ok: true });
    expect(spawner.children[0]!.unrefCalls).toBe(1);
  });

  it('does not spawn when available but the path is invalid', async () => {
    const ws = makeWorkspace();
    const spawner = fakeSpawner();
    const result = await launchSelfReview(ws.root, '../../etc/passwd', {
      available: () => true,
      spawn: spawner.spawn,
      registry: createLaunchRegistry(),
    });
    expect(result.status).toBe(400);
    expect(spawner.calls).toEqual([]);
  });

  it('deduplicates per plan, caps concurrent launches, and recovers capacity when a child exits', async () => {
    const ws = makeWorkspace();
    const registry = createLaunchRegistry();
    const spawner = fakeSpawner();
    const deps = { available: () => true, spawn: spawner.spawn, registry };
    const plans = Array.from({ length: MAX_CONCURRENT_SELF_REVIEWS + 1 }, (_, i) =>
      addPlan(ws, 10 + i)
    );

    // Two simultaneous requests for one plan: exactly one launch.
    const [first, duplicate] = await Promise.all([
      launchSelfReview(ws.root, plans[0]!, deps),
      launchSelfReview(ws.root, plans[0]!, deps),
    ]);
    expect(first.status).toBe(200);
    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toEqual({
      ok: false,
      error: 'A self-review is already running for this plan.',
    });
    expect(spawner.calls).toHaveLength(1);

    // A running launch still answers 409, not a second process.
    const again = await launchSelfReview(ws.root, plans[0]!, deps);
    expect(again.status).toBe(409);
    expect(spawner.calls).toHaveLength(1);

    // Fill the remaining slots; the one past the limit is refused as busy.
    for (let i = 1; i < MAX_CONCURRENT_SELF_REVIEWS; i++) {
      expect((await launchSelfReview(ws.root, plans[i]!, deps)).status).toBe(200);
    }
    const busy = await launchSelfReview(ws.root, plans[MAX_CONCURRENT_SELF_REVIEWS]!, deps);
    expect(busy.status).toBe(429);
    expect(busy.body.ok).toBe(false);
    expect(busy.headers?.['Retry-After']).toBeDefined();
    expect(spawner.calls).toHaveLength(MAX_CONCURRENT_SELF_REVIEWS);
    expect(registry.size).toBe(MAX_CONCURRENT_SELF_REVIEWS);

    // The first child exits (and later errors too): one slot frees, exactly once.
    spawner.children[0]!.emit('exit', 0, null);
    spawner.children[0]!.emit('error', new Error('late'));
    expect(registry.size).toBe(MAX_CONCURRENT_SELF_REVIEWS - 1);

    const recovered = await launchSelfReview(ws.root, plans[MAX_CONCURRENT_SELF_REVIEWS]!, deps);
    expect(recovered.status).toBe(200);
    expect(spawner.calls).toHaveLength(MAX_CONCURRENT_SELF_REVIEWS + 1);
    expect(registry.size).toBe(MAX_CONCURRENT_SELF_REVIEWS);
  });

  it('answers a launch failure with a fixed 500 and frees the slot', async () => {
    const ws = makeWorkspace();
    const rel = path.relative(ws.project, ws.planFile);
    const registry = createLaunchRegistry();

    const failing = fakeSpawner('fail');
    const errored = await launchSelfReview(ws.root, rel, {
      available: () => true,
      spawn: failing.spawn,
      registry,
    });
    expect(errored.status).toBe(500);
    expect(errored.body).toEqual({ ok: false, error: 'Failed to launch self-review.' });
    expect(registry.size).toBe(0);

    const thrown = await launchSelfReview(ws.root, rel, {
      available: () => true,
      spawn: () => {
        throw new Error('EACCES');
      },
      registry,
    });
    expect(thrown.status).toBe(500);
    expect(thrown.body).toEqual({ ok: false, error: 'Failed to launch self-review.' });
    expect(registry.size).toBe(0);

    // The same plan launches cleanly once the failure is behind it.
    const working = fakeSpawner();
    const ok = await launchSelfReview(ws.root, rel, {
      available: () => true,
      spawn: working.spawn,
      registry,
    });
    expect(ok.status).toBe(200);
    expect(registry.size).toBe(1);
  });
});
