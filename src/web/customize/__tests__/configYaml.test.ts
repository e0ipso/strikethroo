/**
 * Unit tests for the config.yaml form-model boundary (`configYaml.ts`): the
 * custom parse/serialize logic behind the Customize Config form. Focus: the
 * round-trip preserves foreign top-level sections, unsupported shapes refuse
 * a form save, harness `cli_args` survive byte-for-byte, and validation
 * mirrors the routing and harness helpers' contracts.
 */

import { describe, it, expect } from 'vitest';
import { load } from 'js-yaml';
import {
  EMPTY_HARNESSES,
  parseWorkspaceConfig,
  serializeWorkspaceConfig,
  validateHarnessForm,
  validateRoutingForm,
  type HarnessArgsForm,
  type RoutingForm,
} from '../configYaml';
import { SUPPORTED_HARNESSES, type Harness } from '../../../types';

const SHIPPED = 'execution_routing:\n  profiles: {}\n';

const FULL = `
other_feature:
  nested:
    flag: true
harnesses:
  claude:
    cli_args:
      - --dangerously-skip-permissions
  codex:
    cli_args:
      - --sandbox
      - workspace-write
execution_routing:
  profiles:
    routine:
      description: Localized low-risk work.
      models:
        - model: haiku-x
    demanding:
      description: Cross-cutting risky work.
      models:
        - model: opus-x
          reasoning_effort: high
        - harness: codex
          model: codex-x
  resolver:
    script: ./pick.cjs
`;

/** Builds a full harness form, defaulting every unlisted harness to no arguments. */
const harnessForm = (args: Partial<Record<Harness, string[]>> = {}): HarnessArgsForm =>
  Object.fromEntries(
    SUPPORTED_HARNESSES.map(harness => [harness, { cliArgs: [...(args[harness] ?? [])] }])
  ) as HarnessArgsForm;

describe('parseWorkspaceConfig', () => {
  it('parses the shipped template to an empty form', () => {
    const parsed = parseWorkspaceConfig(SHIPPED);
    expect(parsed.kind).toBe('parsed');
    if (parsed.kind !== 'parsed') return;
    expect(parsed.routing).toEqual({
      enabled: true,
      allowExternalHarnessExecution: false,
      profiles: [],
      resolverScript: '',
    });
  });

  it('parses an empty or comment-only file to an empty form', () => {
    for (const content of ['', '# nothing yet\n']) {
      const parsed = parseWorkspaceConfig(content);
      expect(parsed.kind).toBe('parsed');
      if (parsed.kind !== 'parsed') return;
      expect(parsed.routing.profiles).toEqual([]);
      expect(parsed.harnesses).toEqual(EMPTY_HARNESSES);
    }
  });

  it('lifts a full configuration into the form model in order', () => {
    const parsed = parseWorkspaceConfig(FULL);
    expect(parsed.kind).toBe('parsed');
    if (parsed.kind !== 'parsed') return;
    expect(parsed.routing.profiles.map(p => p.name)).toEqual(['routine', 'demanding']);
    expect(parsed.routing.profiles[1]?.targets).toEqual([
      { model: 'opus-x', harness: '', reasoningEffort: 'high' },
      { model: 'codex-x', harness: 'codex', reasoningEffort: '' },
    ]);
    expect(parsed.routing.resolverScript).toBe('./pick.cjs');
    expect(parsed.document.other_feature).toEqual({ nested: { flag: true } });
  });

  it.each([
    ['invalid YAML', 'execution_routing: {'],
    ['a non-mapping document', '- a list\n'],
    ['a non-mapping routing section', 'execution_routing: 7\n'],
    ['an unknown key in the section', 'execution_routing:\n  profiles: {}\n  extra: 1\n'],
    [
      'a target with unknown keys',
      'execution_routing:\n  profiles:\n    a:\n      description: d\n      models:\n        - model: m\n          temperature: 1\n',
    ],
    [
      'availability, probe, TTL, or provider settings',
      'execution_routing:\n  profiles: {}\n  availability:\n    probe: true\n    ttl: 30\n    provider: codex\n',
    ],
    ['a malformed resolver', 'execution_routing:\n  profiles: {}\n  resolver: nope\n'],
  ])('refuses a form save for %s', (_label, content) => {
    expect(parseWorkspaceConfig(content).kind).toBe('unsupported');
  });

  it.each([true, false])('round-trips external execution %s without losing the matrix', value => {
    const parsed = parseWorkspaceConfig(
      FULL.replace(
        'execution_routing:',
        `execution_routing:\n  allow_external_harness_execution: ${value}`
      )
    );
    expect(parsed.kind).toBe('parsed');
    if (parsed.kind !== 'parsed') return;
    expect(parsed.routing.allowExternalHarnessExecution).toBe(value);
    const output = serializeWorkspaceConfig(parsed.document, parsed.harnesses, parsed.routing);
    expect(
      (load(output) as { execution_routing: Record<string, unknown> }).execution_routing
        .allow_external_harness_execution
    ).toBe(value);
    expect(parseWorkspaceConfig(output)).toMatchObject({
      kind: 'parsed',
      routing: parsed.routing,
      harnesses: parsed.harnesses,
      document: { other_feature: { nested: { flag: true } } },
    });
  });

  it.each(['"false"', 'null', '1', '[]'])('refuses external execution value %s', value => {
    expect(
      parseWorkspaceConfig(
        `execution_routing:\n  allow_external_harness_execution: ${value}\n  profiles: {}\n`
      )
    ).toMatchObject({
      kind: 'unsupported',
      message: expect.stringContaining('allow_external_harness_execution'),
    });
  });

  it('reads enabled: false while keeping the profiles it disables', () => {
    const parsed = parseWorkspaceConfig(
      'execution_routing:\n  enabled: false\n  profiles:\n    routine:\n      description: d\n      models:\n        - model: m\n'
    );
    expect(parsed.kind).toBe('parsed');
    if (parsed.kind !== 'parsed') return;
    expect(parsed.routing.enabled).toBe(false);
    expect(parsed.routing.profiles.map(p => p.name)).toEqual(['routine']);
  });

  it('refuses a form save for a non-boolean enabled, naming the key', () => {
    const parsed = parseWorkspaceConfig('execution_routing:\n  enabled: "yes"\n  profiles: {}\n');
    expect(parsed.kind).toBe('unsupported');
    if (parsed.kind !== 'unsupported') return;
    expect(parsed.message).toContain('execution_routing.enabled');
  });
});

describe('parseWorkspaceConfig harnesses', () => {
  it('lifts every harness in SUPPORTED_HARNESSES order, absent ones empty', () => {
    const parsed = parseWorkspaceConfig(FULL);
    expect(parsed.kind).toBe('parsed');
    if (parsed.kind !== 'parsed') return;
    expect(Object.keys(parsed.harnesses)).toEqual([...SUPPORTED_HARNESSES]);
    expect(parsed.harnesses).toEqual(
      harnessForm({
        claude: ['--dangerously-skip-permissions'],
        codex: ['--sandbox', 'workspace-write'],
      })
    );
  });

  it.each([
    ['a missing section', SHIPPED],
    ['a null section', 'harnesses:\n'],
    ['an entry without cli_args', 'harnesses:\n  claude: {}\n'],
  ])('yields empty argument lists for %s', (_label, content) => {
    const parsed = parseWorkspaceConfig(content);
    expect(parsed.kind).toBe('parsed');
    if (parsed.kind !== 'parsed') return;
    expect(parsed.harnesses).toEqual(EMPTY_HARNESSES);
  });

  it.each([
    ['a non-mapping section', 'harnesses: 7\n', 'The harnesses section is not a mapping.'],
    ['an unknown harness key', 'harnesses:\n  bogus: {}\n', 'harnesses.bogus'],
    ['a non-mapping entry', 'harnesses:\n  claude: 7\n', 'harnesses.claude'],
    ['an unsupported entry key', 'harnesses:\n  claude:\n    extra: 1\n', 'harnesses.claude.extra'],
    [
      'a non-array cli_args',
      'harnesses:\n  claude:\n    cli_args: --force\n',
      'harnesses.claude.cli_args',
    ],
    [
      'a non-string argument',
      'harnesses:\n  claude:\n    cli_args:\n      - 7\n',
      'harnesses.claude.cli_args[0]',
    ],
  ])('refuses a form save for %s, naming the path', (_label, content, path) => {
    const parsed = parseWorkspaceConfig(content);
    expect(parsed.kind).toBe('unsupported');
    if (parsed.kind !== 'unsupported') return;
    expect(parsed.message).toContain(path);
  });

  it('keeps argument strings verbatim, including empty and NUL-bearing ones', () => {
    const parsed = parseWorkspaceConfig(
      'harnesses:\n  claude:\n    cli_args: [" spaced ", "", "a\\0b"]\n'
    );
    expect(parsed.kind).toBe('parsed');
    if (parsed.kind !== 'parsed') return;
    expect(parsed.harnesses.claude.cliArgs).toEqual([' spaced ', '', 'a\0b']);
  });
});

describe('serializeWorkspaceConfig round-trip', () => {
  it('preserves foreign top-level sections and re-parses to the same form', () => {
    const parsed = parseWorkspaceConfig(FULL);
    expect(parsed.kind).toBe('parsed');
    if (parsed.kind !== 'parsed') return;

    const output = serializeWorkspaceConfig(parsed.document, parsed.harnesses, parsed.routing);
    const reloaded = load(output) as Record<string, unknown>;
    expect(reloaded.other_feature).toEqual({ nested: { flag: true } });
    expect(reloaded.harnesses).toEqual({
      claude: { cli_args: ['--dangerously-skip-permissions'] },
      codex: { cli_args: ['--sandbox', 'workspace-write'] },
      cursor: { cli_args: [] },
      gemini: { cli_args: [] },
      copilot: { cli_args: [] },
      opencode: { cli_args: [] },
    });

    const reparsed = parseWorkspaceConfig(output);
    expect(reparsed.kind).toBe('parsed');
    if (reparsed.kind !== 'parsed') return;
    expect(reparsed.routing).toEqual(parsed.routing);
    expect(reparsed.harnesses).toEqual(parsed.harnesses);
  });

  it('preserves the complete representable routing structure without schema expansion', () => {
    const parsed = parseWorkspaceConfig(FULL);
    expect(parsed.kind).toBe('parsed');
    if (parsed.kind !== 'parsed') return;

    const output = load(
      serializeWorkspaceConfig(parsed.document, parsed.harnesses, parsed.routing)
    ) as Record<string, unknown>;
    const source = load(FULL) as Record<string, unknown>;
    // Absent switches are written back with their defaults.
    expect(output.execution_routing).toEqual({
      enabled: true,
      allow_external_harness_execution: false,
      ...(source.execution_routing as Record<string, unknown>),
    });
    expect(output.other_feature).toEqual(source.other_feature);
    expect(JSON.stringify(output)).not.toMatch(/availability|probe|ttl|provider/i);
  });

  it('emits exact targets: harness/effort only when set, values trimmed', () => {
    const routing: RoutingForm = {
      enabled: true,
      allowExternalHarnessExecution: false,
      profiles: [
        {
          name: ' routine ',
          description: ' Small work. ',
          targets: [{ model: ' haiku-x ', harness: '', reasoningEffort: '' }],
        },
      ],
      resolverScript: '',
    };
    const output = serializeWorkspaceConfig({}, EMPTY_HARNESSES, routing);
    const reloaded = load(output) as {
      execution_routing: { profiles: Record<string, { models: unknown[] }>; resolver?: unknown };
    };
    expect(reloaded.execution_routing.profiles.routine?.models).toEqual([{ model: 'haiku-x' }]);
    expect(reloaded.execution_routing.resolver).toBeUndefined();
  });

  it('an emptied form serializes back to the disabled state', () => {
    const output = serializeWorkspaceConfig({}, EMPTY_HARNESSES, {
      enabled: true,
      allowExternalHarnessExecution: false,
      profiles: [],
      resolverScript: '',
    });
    const reloaded = load(output) as { execution_routing: { profiles: unknown } };
    expect(reloaded.execution_routing.profiles).toEqual({});
  });

  it('writes all six harnesses in order, before execution_routing, after foreign sections', () => {
    const output = serializeWorkspaceConfig({ other_feature: 1 }, EMPTY_HARNESSES, {
      enabled: true,
      allowExternalHarnessExecution: false,
      profiles: [],
      resolverScript: '',
    });
    const reloaded = load(output) as Record<string, { cli_args: string[] }>;
    const keys = Object.keys(reloaded);
    expect(keys).toEqual(['other_feature', 'harnesses', 'execution_routing']);
    expect(Object.keys(reloaded.harnesses!)).toEqual([...SUPPORTED_HARNESSES]);
    expect(Object.values(reloaded.harnesses!)).toEqual(
      SUPPORTED_HARNESSES.map(() => ({ cli_args: [] }))
    );
  });

  it('moves an existing harnesses section ahead of execution_routing', () => {
    const parsed = parseWorkspaceConfig(
      'execution_routing:\n  profiles: {}\nharnesses:\n  cursor:\n    cli_args: ["--force"]\n'
    );
    expect(parsed.kind).toBe('parsed');
    if (parsed.kind !== 'parsed') return;
    const output = serializeWorkspaceConfig(parsed.document, parsed.harnesses, parsed.routing);
    expect(Object.keys(load(output) as object)).toEqual(['harnesses', 'execution_routing']);
  });

  it('writes enabled first and round-trips a disabled section with its profiles', () => {
    const routing: RoutingForm = {
      enabled: false,
      allowExternalHarnessExecution: false,
      profiles: [
        {
          name: 'routine',
          description: 'Small work.',
          targets: [{ model: 'haiku-x', harness: '', reasoningEffort: '' }],
        },
      ],
      resolverScript: '',
    };
    const output = serializeWorkspaceConfig({}, EMPTY_HARNESSES, routing);
    const reloaded = load(output) as {
      execution_routing: { enabled: unknown; profiles: Record<string, unknown> };
    };
    expect(Object.keys(reloaded.execution_routing)[0]).toBe('enabled');
    expect(reloaded.execution_routing.enabled).toBe(false);
    expect(Object.keys(reloaded.execution_routing.profiles)).toEqual(['routine']);

    const reparsed = parseWorkspaceConfig(output);
    expect(reparsed.kind).toBe('parsed');
    if (reparsed.kind !== 'parsed') return;
    expect(reparsed.routing).toEqual(routing);
  });

  it('never trims a cli_args value', () => {
    const output = serializeWorkspaceConfig({}, harnessForm({ gemini: [' spaced ', '--x '] }), {
      enabled: true,
      allowExternalHarnessExecution: false,
      profiles: [],
      resolverScript: '',
    });
    const reloaded = load(output) as { harnesses: Record<Harness, { cli_args: string[] }> };
    expect(reloaded.harnesses.gemini.cli_args).toEqual([' spaced ', '--x ']);
  });
});

describe('validateHarnessForm', () => {
  it('accepts empty and well-formed argument lists', () => {
    expect(validateHarnessForm(EMPTY_HARNESSES)).toEqual([]);
    expect(validateHarnessForm(harnessForm({ codex: ['--sandbox', 'workspace-write'] }))).toEqual(
      []
    );
  });

  it('flags every empty argument by harness and one-based position', () => {
    expect(validateHarnessForm(harnessForm({ claude: ['--ok', ''] }))).toEqual([
      'claude, argument 2: an argument cannot be empty.',
    ]);
  });

  it('flags every NUL-bearing argument by harness and one-based position', () => {
    expect(validateHarnessForm(harnessForm({ opencode: ['a\0b'] }))).toEqual([
      'opencode, argument 1: an argument cannot contain a NUL character.',
    ]);
  });

  it('reports one error per offending argument across harnesses', () => {
    expect(validateHarnessForm(harnessForm({ claude: ['', ''], gemini: ['\0'] }))).toHaveLength(3);
  });
});

describe('validateRoutingForm', () => {
  const valid: RoutingForm = {
    enabled: true,
    allowExternalHarnessExecution: false,
    profiles: [
      {
        name: 'routine',
        description: 'Small work.',
        targets: [{ model: 'haiku-x', harness: '', reasoningEffort: '' }],
      },
    ],
    resolverScript: '',
  };

  it('accepts a well-formed profile', () => {
    expect(validateRoutingForm(valid)).toEqual([]);
  });

  it('skips every profile check while routing is disabled', () => {
    const half: RoutingForm = {
      enabled: false,
      allowExternalHarnessExecution: false,
      profiles: [{ name: '', description: '', targets: [] }],
      resolverScript: '',
    };
    expect(validateRoutingForm(half)).toEqual([]);
    expect(validateRoutingForm({ ...half, enabled: true }).length).toBeGreaterThan(0);
  });

  it.each([
    ['an unnamed profile', { ...valid, profiles: [{ ...valid.profiles[0]!, name: ' ' }] }],
    [
      'a duplicate profile name',
      { ...valid, profiles: [valid.profiles[0]!, { ...valid.profiles[0]! }] },
    ],
    ['a missing description', { ...valid, profiles: [{ ...valid.profiles[0]!, description: '' }] }],
    ['no targets', { ...valid, profiles: [{ ...valid.profiles[0]!, targets: [] }] }],
    [
      'an empty model',
      {
        ...valid,
        profiles: [
          {
            ...valid.profiles[0]!,
            targets: [{ model: ' ', harness: '', reasoningEffort: '' }],
          },
        ],
      },
    ],
  ])('flags %s', (_label, form) => {
    expect(validateRoutingForm(form as RoutingForm).length).toBeGreaterThan(0);
  });
});
