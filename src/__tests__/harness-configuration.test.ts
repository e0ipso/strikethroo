import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  hashHarnessCliArgs,
  loadHarnessConfiguration,
} from '../skill-scripts/shared/harness-configuration';
import {
  loadRoutingConfig,
  WORKSPACE_CONFIG_RELPATH,
} from '../skill-scripts/shared/execution-routing';
import { parseWorkspaceConfig } from '../web/customize/configYaml';
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

  // One config.yaml, three readers: the harness loader, the routing loader,
  // and the Customize form's parser. A content-free file must mean "nothing
  // configured" in all three; a malformed one must stay a named error in all
  // three. Each reader keeps its own vocabulary for "nothing configured",
  // so the verdicts are classified before being compared.
  it('agrees with the routing loader and the Customize parser on a content-free config.yaml', () => {
    const configPath = path.join(root, WORKSPACE_CONFIG_RELPATH);

    const classify = (message: string): string => {
      const unnamed = message.includes('config.yaml') ? '' : ':file-not-named';
      if (message.includes('must be a YAML mapping')) return `error:not-a-mapping${unnamed}`;
      if (message.includes('is not valid YAML')) return `error:invalid-yaml${unnamed}`;
      return `error:unclassified(${message})`;
    };

    const verdicts = (contents: string | null): Record<string, string> => {
      fs.mkdirSync(path.dirname(configPath), { recursive: true });
      if (contents === null) fs.rmSync(configPath, { force: true });
      else fs.writeFileSync(configPath, contents);

      const harnessVerdict = (): string => {
        const result = loadHarnessConfiguration(root);
        if (result.kind === 'invalid') return classify(result.errors.join(' '));
        const bare = SUPPORTED_HARNESSES.every(h => result.config[h].cliArgs.length === 0);
        return bare ? 'defaults' : 'configured';
      };

      const routingVerdict = (): string => {
        const result = loadRoutingConfig(root, SUPPORTED_HARNESSES);
        if (result.kind === 'invalid') return classify(result.errors.join(' '));
        return result.kind;
      };

      // parseWorkspaceConfig takes content, not a path, so an absent file
      // reaches it the way the Config tab shows one: as the empty document.
      const webVerdict = (): string => {
        const result = parseWorkspaceConfig(contents ?? '');
        if (result.kind === 'unsupported') return classify(result.message);
        const bare =
          result.routing.profiles.length === 0 &&
          SUPPORTED_HARNESSES.every(h => result.harnesses[h].cliArgs.length === 0);
        return bare ? 'defaults' : 'configured';
      };

      return { harness: harnessVerdict(), routing: routingVerdict(), web: webVerdict() };
    };

    const documents: ReadonlyArray<readonly [string, string | null]> = [
      ['absent', null],
      ['zero-byte', ''],
      ['comment-only', '# nothing configured yet\n\n   \n'],
      ['malformed', 'harnesses: [\n'],
      ['non-mapping', '- a\n'],
    ];

    const actual = Object.fromEntries(
      documents.map(([label, contents]) => [label, verdicts(contents)])
    );

    expect(actual).toEqual({
      absent: { harness: 'defaults', routing: 'no-config', web: 'defaults' },
      'zero-byte': { harness: 'defaults', routing: 'disabled', web: 'defaults' },
      'comment-only': { harness: 'defaults', routing: 'disabled', web: 'defaults' },
      malformed: {
        harness: 'error:invalid-yaml',
        routing: 'error:invalid-yaml',
        web: 'error:invalid-yaml',
      },
      'non-mapping': {
        harness: 'error:not-a-mapping',
        routing: 'error:not-a-mapping',
        web: 'error:not-a-mapping',
      },
    });
  });
});
