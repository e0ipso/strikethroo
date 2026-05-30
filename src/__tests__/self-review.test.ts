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
import {
  isSelfReviewAvailable,
  resolveReviewPath,
  launchSelfReview,
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
});

describe('launchSelfReview', () => {
  it('returns 409 when the binary is not available, without spawning', () => {
    const ws = makeWorkspace();
    const rel = path.relative(ws.project, ws.planFile);
    let spawned = false;
    const result = launchSelfReview(ws.root, rel, {
      available: () => false,
      spawnDetached: () => {
        spawned = true;
      },
    });
    expect(result.status).toBe(409);
    expect(result.body.ok).toBe(false);
    expect(spawned).toBe(false);
  });

  it('spawns the binary with the resolved absolute path when available', () => {
    const ws = makeWorkspace();
    const rel = path.relative(ws.project, ws.planFile);
    const calls: Array<{ cmd: string; args: string[] }> = [];
    const result = launchSelfReview(ws.root, rel, {
      available: () => true,
      spawnDetached: (cmd, args) => calls.push({ cmd, args }),
    });
    expect(result.status).toBe(200);
    expect(result.body).toEqual({ ok: true });
    expect(calls).toEqual([{ cmd: SELF_REVIEW_BINARY, args: [ws.planFile] }]);
  });

  it('does not spawn when available but the path is invalid', () => {
    const ws = makeWorkspace();
    let spawned = false;
    const result = launchSelfReview(ws.root, '../../etc/passwd', {
      available: () => true,
      spawnDetached: () => {
        spawned = true;
      },
    });
    expect(result.status).toBe(400);
    expect(spawned).toBe(false);
  });
});
