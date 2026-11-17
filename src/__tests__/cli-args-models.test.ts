import { describe, expect, it } from 'vitest';

import {
  cliArgsModelRequests,
  resolveCliArgs,
  withoutModelOptions,
} from '../skill-scripts/shared/cli-args-models';
import { modelRequestKey, type ModelMap } from '../skill-scripts/shared/model-aliases';

const listed = (resolved: Record<string, string>): ModelMap => ({
  source: 'list',
  resolved: Object.fromEntries(
    Object.entries(resolved).map(([model, id]) => [modelRequestKey({ model }), id])
  ),
});

describe('model names in cli_args', () => {
  const codexArgs = [
    '--sandbox',
    'workspace-write',
    '--config',
    'model="gpt-sol"',
    '--config',
    'model_reasoning_effort="xhigh"',
  ];

  it('finds each documented model option and ignores other arguments', () => {
    expect(cliArgsModelRequests('codex', codexArgs)).toEqual([{ model: 'gpt-sol' }]);
    expect(cliArgsModelRequests('codex', ['-m', 'gpt-terra', '-c', "model='gpt-luna'"])).toEqual([
      { model: 'gpt-terra' },
      { model: 'gpt-luna' },
    ]);
    expect(cliArgsModelRequests('codex', ['--model=gpt-sol', '--config=model=gpt-6-sol'])).toEqual([
      { model: 'gpt-sol' },
      { model: 'gpt-6-sol' },
    ]);
    expect(cliArgsModelRequests('cursor', ['--force', '--model', 'grok-xhigh'])).toEqual([
      { model: 'grok-xhigh' },
    ]);
    // Cursor documents no -m flag, and the value must have a model id shape.
    expect(cliArgsModelRequests('cursor', ['-m', 'grok', '--model', 'two words'])).toEqual([]);
    // Claude resolves its own aliases.
    expect(cliArgsModelRequests('claude', ['--model', 'opus'])).toEqual([]);
  });

  it('removes the model options for the readiness retry', () => {
    expect(withoutModelOptions('codex', codexArgs)).toEqual([
      '--sandbox',
      'workspace-write',
      '--config',
      'model_reasoning_effort="xhigh"',
    ]);
    expect(withoutModelOptions('cursor', ['--force', '--model=grok-xhigh'])).toEqual(['--force']);
    expect(withoutModelOptions('claude', ['--model', 'opus'])).toEqual(['--model', 'opus']);
  });

  it('rewrites mapped names and keeps the option syntax', () => {
    expect(resolveCliArgs('codex', codexArgs, listed({ 'gpt-sol': 'gpt-6.1-sol' }))).toEqual({
      kind: 'resolved',
      cliArgs: [
        '--sandbox',
        'workspace-write',
        '--config',
        'model="gpt-6.1-sol"',
        '--config',
        'model_reasoning_effort="xhigh"',
      ],
      verified: true,
    });
    expect(
      resolveCliArgs('cursor', ['--model=grok-xhigh', '--force'], {
        ...listed({ 'grok-xhigh': 'grok-4.7-xhigh' }),
        source: 'knowledge',
      })
    ).toEqual({
      kind: 'resolved',
      cliArgs: ['--model=grok-4.7-xhigh', '--force'],
      verified: false,
    });
  });

  it('passes names through without a list and refuses an unmapped name with one', () => {
    expect(resolveCliArgs('codex', codexArgs, undefined)).toEqual({
      kind: 'resolved',
      cliArgs: codexArgs,
      verified: true,
    });
    expect(resolveCliArgs('codex', codexArgs, listed({}))).toMatchObject({
      kind: 'unresolved',
      detail: expect.stringContaining('harnesses.codex.cli_args'),
    });
  });
});
