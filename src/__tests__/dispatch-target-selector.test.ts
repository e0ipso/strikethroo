import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  executionTargetId,
  selectDispatchTarget,
  type CustomSelectorInput,
} from '../skill-scripts/shared/dispatch-target-selector';
import type { RoutingConfig, RoutingTarget } from '../skill-scripts/shared/execution-routing';

const native: RoutingTarget = { model: 'same', reasoning_effort: 'high' };
const external: RoutingTarget = { model: 'same', harness: 'codex', reasoning_effort: 'high' };
const config = (resolverScript?: string): RoutingConfig => ({
  profiles: [{ name: 'demanding', description: 'Hard work', targets: [native, external] }],
  ...(resolverScript === undefined ? {} : { resolverScript }),
});

describe('dispatch target selector', () => {
  it('uses stable unambiguous target identities and deterministic configured order', () => {
    expect(executionTargetId(native)).not.toBe(executionTargetId(external));
    expect(
      selectDispatchTarget(config(), 'demanding', new Set(), { projectRoot: '/repo', taskId: 2 })
    ).toEqual({
      kind: 'selected',
      id: executionTargetId(native),
      target: native,
      source: 'built-in',
    });
  });

  it('reinvokes selection with the complete avoid set and selects only a supplied candidate', () => {
    let received: CustomSelectorInput | undefined;
    const result = selectDispatchTarget(
      config('tools/pick.cjs'),
      'demanding',
      new Set([executionTargetId(native)]),
      {
        projectRoot: '/repo',
        taskId: 17,
        runSelector: (_script, input) => {
          received = JSON.parse(input) as CustomSelectorInput;
          return { ok: true, stdout: JSON.stringify({ target: executionTargetId(external) }) };
        },
      }
    );
    expect(received).toEqual({
      version: 1,
      task: { id: 17, profile: 'demanding' },
      candidates: [
        { id: executionTargetId(native), target: native },
        { id: executionTargetId(external), target: external },
      ],
      avoid: [executionTargetId(native)],
    });
    expect(result).toMatchObject({ kind: 'selected', target: external, source: 'custom' });
  });

  it.each([
    ['process failure', { ok: false }],
    ['malformed output', { ok: true, stdout: 'not json' }],
    ['unknown target', { ok: true, stdout: '{"target":"unknown"}' }],
    ['avoided target', { ok: true, stdout: JSON.stringify({ target: executionTargetId(native) }) }],
  ])('returns visible native fallback for custom selector %s', (_label, processResult) => {
    const result = selectDispatchTarget(
      config('pick.cjs'),
      'demanding',
      new Set([executionTargetId(native)]),
      { projectRoot: '/repo', taskId: 2, runSelector: () => processResult }
    );
    expect(result).toMatchObject({ kind: 'native-default', reason: 'selector-failure' });
  });

  it('does not invoke the built-in selector after a missing custom script', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'target-selector-'));
    const result = selectDispatchTarget(config('missing.cjs'), 'demanding', new Set(), {
      projectRoot: root,
      taskId: 2,
      timeoutMs: 50,
    });
    expect(result).toEqual({
      kind: 'native-default',
      reason: 'selector-failure',
      detail: 'Custom target selector did not complete successfully.',
    });
  });

  it('executes a repository-relative selector and bounds it with a timeout', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'target-selector-'));
    fs.writeFileSync(
      path.join(root, 'pick.cjs'),
      `let input='';process.stdin.on('data',c=>input+=c);process.stdin.on('end',()=>{` +
        `const value=JSON.parse(input);process.stdout.write(JSON.stringify({target:value.candidates[1].id}));});`
    );
    expect(
      selectDispatchTarget(config('pick.cjs'), 'demanding', new Set(), {
        projectRoot: root,
        taskId: 2,
        timeoutMs: 1_000,
      })
    ).toMatchObject({ kind: 'selected', target: external, source: 'custom' });

    fs.writeFileSync(path.join(root, 'slow.cjs'), 'setTimeout(()=>{}, 10000);');
    expect(
      selectDispatchTarget(config('slow.cjs'), 'demanding', new Set(), {
        projectRoot: root,
        taskId: 2,
        timeoutMs: 10,
      })
    ).toMatchObject({ kind: 'native-default', reason: 'selector-failure' });
  });

  it('returns native defaults with no override when configured targets are exhausted', () => {
    const result = selectDispatchTarget(
      config(),
      'demanding',
      new Set([executionTargetId(native), executionTargetId(external)]),
      { projectRoot: '/repo', taskId: 2 }
    );
    expect(result).toEqual({
      kind: 'native-default',
      reason: 'targets-exhausted',
      detail: 'All 2 configured target(s) for profile "demanding" were avoided.',
    });
  });
});
