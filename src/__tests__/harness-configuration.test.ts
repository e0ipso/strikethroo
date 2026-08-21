import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  HARNESS_CONFIGURATION_NORMALIZATION_VERSION,
  hashHarnessCliArgs,
  loadHarnessConfiguration,
} from '../skill-scripts/shared/harness-configuration';
import { WORKSPACE_CONFIG_RELPATH } from '../skill-scripts/shared/execution-routing';
import { SUPPORTED_HARNESSES } from '../types';

describe('loadHarnessConfiguration', () => {
  let tempDir: string;

  const writeConfig = (contents: string): void => {
    const configPath = path.join(tempDir, WORKSPACE_CONFIG_RELPATH);
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, contents);
  };

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-config-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it.each([
    ['an absent config file', undefined],
    ['an absent harnesses section', 'execution_routing:\n  profiles: {}\n'],
    ['a bare harnesses section', 'harnesses:\n'],
  ])('normalizes %s to immutable empty arrays', (_label, contents) => {
    if (contents !== undefined) writeConfig(contents);

    const result = loadHarnessConfiguration(tempDir);

    expect(result.kind).toBe('config');
    if (result.kind !== 'config') return;
    expect(Object.keys(result.config)).toEqual(SUPPORTED_HARNESSES);
    for (const harness of SUPPORTED_HARNESSES) {
      expect(result.config[harness].cliArgs).toEqual([]);
      expect(Object.isFrozen(result.config[harness].cliArgs)).toBe(true);
      expect(Object.isFrozen(result.config[harness])).toBe(true);
    }
    expect(Object.isFrozen(result.config)).toBe(true);
  });

  it('preserves exact decoded strings and order without filtering permission flags', () => {
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
  cursor: {}
execution_routing:
  profiles: {}
`);

    const result = loadHarnessConfiguration(tempDir);

    expect(result.kind).toBe('config');
    if (result.kind !== 'config') return;
    expect(result.config.claude.cliArgs).toEqual([
      '--dangerously-skip-permissions',
      '  exact whitespace  ',
      '$HOME/*.ts; echo untouched',
    ]);
    expect(result.config.codex.cliArgs).toEqual(['--sandbox', 'workspace-write']);
    expect(result.config.cursor.cliArgs).toEqual([]);
    expect(result.config.gemini.cliArgs).toEqual([]);
  });

  it('accepts whitespace-only strings because they are non-empty exact argv elements', () => {
    writeConfig('harnesses:\n  claude:\n    cli_args:\n      - " "\n');

    const result = loadHarnessConfiguration(tempDir);

    expect(result.kind).toBe('config');
    if (result.kind !== 'config') return;
    expect(result.config.claude.cliArgs).toEqual([' ']);
  });

  it.each([
    ['invalid YAML', 'harnesses: {', 'config.yaml'],
    ['a non-mapping document', '- harnesses', 'config.yaml'],
    ['a non-mapping harnesses section', 'harnesses: 3\n', 'config.yaml harnesses'],
    ['an unknown harness', 'harnesses:\n  unknown:\n    cli_args: []\n', 'harnesses.unknown'],
    ['a non-mapping harness entry', 'harnesses:\n  claude: []\n', 'harnesses.claude'],
    [
      'an unknown harness key',
      'harnesses:\n  claude:\n    permission_mode: acceptEdits\n',
      'harnesses.claude.permission_mode',
    ],
    [
      'a scalar cli_args value',
      'harnesses:\n  claude:\n    cli_args: "--permission-mode acceptEdits"\n',
      'harnesses.claude.cli_args',
    ],
    [
      'a non-string member',
      'harnesses:\n  claude:\n    cli_args:\n      - 7\n',
      'harnesses.claude.cli_args[0]',
    ],
    [
      'an empty member',
      'harnesses:\n  claude:\n    cli_args:\n      - ""\n',
      'harnesses.claude.cli_args[0]',
    ],
    [
      'a NUL member',
      'harnesses:\n  claude:\n    cli_args:\n      - "\\0"\n',
      'harnesses.claude.cli_args[0]',
    ],
  ])('rejects %s with a path-specific error', (_label, contents, expectedPath) => {
    writeConfig(contents);

    const result = loadHarnessConfiguration(tempDir);

    expect(result.kind).toBe('invalid');
    if (result.kind !== 'invalid') return;
    expect(result.errors.join('\n')).toContain(expectedPath);
  });
});

describe('hashHarnessCliArgs', () => {
  const version = HARNESS_CONFIGURATION_NORMALIZATION_VERSION;

  it('is deterministic and changes with argument order', () => {
    const first = hashHarnessCliArgs('claude', ['--permission-mode', 'acceptEdits'], version);
    expect(hashHarnessCliArgs('claude', ['--permission-mode', 'acceptEdits'], version)).toBe(first);
    expect(hashHarnessCliArgs('claude', ['acceptEdits', '--permission-mode'], version)).not.toBe(
      first
    );
  });

  it('is harness-specific and normalization-version-specific', () => {
    const args = ['--sandbox', 'workspace-write'];
    const first = hashHarnessCliArgs('claude', args, version);
    expect(hashHarnessCliArgs('codex', args, version)).not.toBe(first);
    expect(hashHarnessCliArgs('claude', args, version + 1)).not.toBe(first);
  });

  it('stores each normalized list hash on the loaded harness entry', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-config-hash-'));
    try {
      const result = loadHarnessConfiguration(tempDir);
      expect(result.kind).toBe('config');
      if (result.kind !== 'config') return;
      expect(result.config.opencode.cliArgsHash).toBe(
        hashHarnessCliArgs('opencode', [], HARNESS_CONFIGURATION_NORMALIZATION_VERSION)
      );
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
