import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  hashHarnessCliArgs,
  loadHarnessConfiguration,
} from '../skill-scripts/shared/harness-configuration';
import { WORKSPACE_CONFIG_RELPATH } from '../skill-scripts/shared/execution-routing';
import { SUPPORTED_HARNESSES } from '../types';

describe('harness configuration', () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-config-'));
  });

  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  const writeConfig = (contents: string): void => {
    const configPath = path.join(root, WORKSPACE_CONFIG_RELPATH);
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, contents);
  };

  it('defaults every supported harness to an empty argument list', () => {
    const result = loadHarnessConfiguration(root);

    expect(result.kind).toBe('config');
    if (result.kind !== 'config') return;
    expect(Object.keys(result.config)).toEqual(SUPPORTED_HARNESSES);
    for (const harness of SUPPORTED_HARNESSES) {
      expect(result.config[harness].cliArgs).toEqual([]);
    }
  });

  it('preserves exact strings, order, and permissive flags', () => {
    writeConfig(String.raw`
harnesses:
  claude:
    cli_args:
      - --dangerously-skip-permissions
      - "  exact whitespace  "
      - '$HOME/*.ts; echo untouched'
  codex:
    cli_args:
      - --sandbox
      - workspace-write
`);

    const result = loadHarnessConfiguration(root);

    expect(result.kind).toBe('config');
    if (result.kind !== 'config') return;
    expect(result.config.claude.cliArgs).toEqual([
      '--dangerously-skip-permissions',
      '  exact whitespace  ',
      '$HOME/*.ts; echo untouched',
    ]);
    expect(result.config.codex.cliArgs).toEqual(['--sandbox', 'workspace-write']);
  });

  it.each([
    ['an unknown harness', 'harnesses:\n  unknown:\n    cli_args: []\n', 'harnesses.unknown'],
    [
      'a scalar argument list',
      'harnesses:\n  claude:\n    cli_args: "--permission-mode acceptEdits"\n',
      'harnesses.claude.cli_args',
    ],
    [
      'a non-string argument',
      'harnesses:\n  claude:\n    cli_args:\n      - 7\n',
      'harnesses.claude.cli_args[0]',
    ],
    [
      'an empty argument',
      'harnesses:\n  claude:\n    cli_args:\n      - ""\n',
      'harnesses.claude.cli_args[0]',
    ],
  ])('rejects %s with a path-specific error', (_label, contents, expectedPath) => {
    writeConfig(contents);

    const result = loadHarnessConfiguration(root);

    expect(result.kind).toBe('invalid');
    if (result.kind !== 'invalid') return;
    expect(result.errors.join('\n')).toContain(expectedPath);
  });

  it('hashes argument order and harness identity', () => {
    const first = hashHarnessCliArgs('claude', ['--permission-mode', 'acceptEdits']);
    expect(hashHarnessCliArgs('claude', ['acceptEdits', '--permission-mode'])).not.toBe(first);
    expect(hashHarnessCliArgs('codex', ['--permission-mode', 'acceptEdits'])).not.toBe(first);
  });
});
