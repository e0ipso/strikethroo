/**
 * Unit tests for the config.yaml form-model boundary (`configYaml.ts`): the
 * custom parse/serialize logic behind the Customize Config form. Focus: the
 * round-trip preserves foreign top-level sections, unsupported shapes refuse
 * a form save, and validation mirrors the routing helper's contract.
 */

import { describe, it, expect } from 'vitest';
import { load } from 'js-yaml';
import {
  parseWorkspaceConfig,
  serializeWorkspaceConfig,
  validateRoutingForm,
  type RoutingForm,
} from '../configYaml';

const SHIPPED = 'execution_routing:\n  profiles: {}\n';

const FULL = `
other_feature:
  nested:
    flag: true
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

describe('parseWorkspaceConfig', () => {
  it('parses the shipped template to an empty form', () => {
    const parsed = parseWorkspaceConfig(SHIPPED);
    expect(parsed.kind).toBe('parsed');
    if (parsed.kind !== 'parsed') return;
    expect(parsed.routing).toEqual({ profiles: [], resolverScript: '' });
  });

  it('parses an empty or comment-only file to an empty form', () => {
    for (const content of ['', '# nothing yet\n']) {
      const parsed = parseWorkspaceConfig(content);
      expect(parsed.kind).toBe('parsed');
      if (parsed.kind !== 'parsed') return;
      expect(parsed.routing.profiles).toEqual([]);
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
});

describe('serializeWorkspaceConfig round-trip', () => {
  it('preserves foreign top-level sections and re-parses to the same form', () => {
    const parsed = parseWorkspaceConfig(FULL);
    expect(parsed.kind).toBe('parsed');
    if (parsed.kind !== 'parsed') return;

    const output = serializeWorkspaceConfig(parsed.document, parsed.routing);
    const reloaded = load(output) as Record<string, unknown>;
    expect(reloaded.other_feature).toEqual({ nested: { flag: true } });

    const reparsed = parseWorkspaceConfig(output);
    expect(reparsed.kind).toBe('parsed');
    if (reparsed.kind !== 'parsed') return;
    expect(reparsed.routing).toEqual(parsed.routing);
  });

  it('preserves the complete representable routing structure without schema expansion', () => {
    const parsed = parseWorkspaceConfig(FULL);
    expect(parsed.kind).toBe('parsed');
    if (parsed.kind !== 'parsed') return;

    const output = load(serializeWorkspaceConfig(parsed.document, parsed.routing));
    expect(output).toEqual(load(FULL));
    expect(JSON.stringify(output)).not.toMatch(/availability|probe|ttl|provider/i);
  });

  it('emits exact targets: harness/effort only when set, values trimmed', () => {
    const routing: RoutingForm = {
      profiles: [
        {
          name: ' routine ',
          description: ' Small work. ',
          targets: [{ model: ' haiku-x ', harness: '', reasoningEffort: '' }],
        },
      ],
      resolverScript: '',
    };
    const output = serializeWorkspaceConfig({}, routing);
    const reloaded = load(output) as {
      execution_routing: { profiles: Record<string, { models: unknown[] }>; resolver?: unknown };
    };
    expect(reloaded.execution_routing.profiles.routine?.models).toEqual([{ model: 'haiku-x' }]);
    expect(reloaded.execution_routing.resolver).toBeUndefined();
  });

  it('an emptied form serializes back to the disabled state', () => {
    const output = serializeWorkspaceConfig({}, { profiles: [], resolverScript: '' });
    const reloaded = load(output) as { execution_routing: { profiles: unknown } };
    expect(reloaded.execution_routing.profiles).toEqual({});
  });
});

describe('validateRoutingForm', () => {
  const valid: RoutingForm = {
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
