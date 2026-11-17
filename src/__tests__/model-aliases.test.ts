import { describe, expect, it } from 'vitest';

import {
  collectModelRequests,
  modelMappingPrompt,
  modelRequestKey,
  modelRequestsHash,
  parseModelMapping,
  resolveModel,
  MODEL_MAP_FILE,
  type ModelRequest,
} from '../skill-scripts/shared/model-aliases';
import type { RoutingConfig } from '../skill-scripts/shared/execution-routing';

const config: RoutingConfig = {
  allowExternalHarnessExecution: true,
  profiles: [
    {
      name: 'a',
      description: 'A',
      targets: [
        { model: 'gpt-sol', harness: 'codex', reasoning_effort: 'high' },
        { model: 'opus', harness: 'claude', reasoning_effort: 'medium' },
        { model: 'grok', harness: 'cursor', reasoning_effort: 'xhigh' },
      ],
    },
    {
      name: 'b',
      description: 'B',
      targets: [
        { model: 'gpt-sol', harness: 'codex', reasoning_effort: 'high' },
        { model: 'gpt-terra', harness: 'codex' },
        { model: 'unbound' },
      ],
    },
  ],
};

const requests: ModelRequest[] = [
  { model: 'gpt-sol', reasoningEffort: 'high' },
  { model: 'gpt-terra' },
  { model: 'gpt-6-luna' },
];

const answer = (value: unknown): string => JSON.stringify(value);

describe('model aliases', () => {
  it('collects distinct requests per harness and none for claude', () => {
    expect(collectModelRequests(config, 'codex')).toEqual([
      { model: 'gpt-sol', reasoningEffort: 'high' },
      { model: 'gpt-terra' },
    ]);
    expect(collectModelRequests(config, 'cursor')).toEqual([
      { model: 'grok', reasoningEffort: 'xhigh' },
    ]);
    expect(collectModelRequests(config, 'claude')).toEqual([]);
  });

  it('changes the requests hash when the request set changes', () => {
    expect(modelRequestsHash(requests)).toBe(modelRequestsHash([...requests]));
    expect(modelRequestsHash(requests)).not.toBe(modelRequestsHash(requests.slice(1)));
  });

  it('asks for the list command, the file, and every numbered request', () => {
    const prompt = modelMappingPrompt('codex', requests);
    expect(prompt).toContain(MODEL_MAP_FILE);
    expect(prompt).toContain('Then run `codex debug models` to list the models');
    expect(modelMappingPrompt('gemini', requests)).toContain(
      'run the command your harness provides to list the models'
    );
    expect(prompt).toContain('1: "gpt-sol", reasoning effort "high"');
    expect(prompt).toContain('2: "gpt-terra"');
    expect(prompt).toContain('3: "gpt-6-luna"');
  });

  it('accepts only listed ids, and an exact listed id maps to itself', () => {
    const map = parseModelMapping(
      answer({
        listCommand: 'codex debug models',
        models: ['gpt-6.1-sol', 'gpt-6-sol', 'gpt-6.1-terra', 'gpt-6-luna', 'bad id; rm -rf'],
        aliases: { '1': 'gpt-6.1-sol', '2': 'gpt-7-terra', '3': 'gpt-6-sol' },
      }),
      requests
    );
    expect(map.source).toBe('list');
    expect(map.resolved).toEqual({
      [modelRequestKey(requests[0]!)]: 'gpt-6.1-sol',
      [modelRequestKey(requests[2]!)]: 'gpt-6-luna',
    });
  });

  it.each([
    ['invalid JSON', '{'],
    ['a non-object answer', '[]'],
  ])('reports no answer for %s', (_label, content) => {
    expect(parseModelMapping(content, requests)).toEqual({ source: 'none', resolved: {} });
  });

  it.each([
    ['no models array', { aliases: { '1': 'gpt-6.1-sol' } }],
    ['an empty list', { listCommand: '', models: [], aliases: { '1': 'gpt-6.1-sol' } }],
    ['only invalid ids', { models: ['two words', ''], aliases: { '1': 'gpt-6.1-sol' } }],
  ])('accepts mappings from knowledge on shape alone for %s', (_label, value) => {
    const map = parseModelMapping(
      answer({ ...value, aliases: { ...value.aliases, '2': 'bad id; rm -rf' } }),
      requests
    );
    expect(map).toEqual({
      source: 'knowledge',
      resolved: { [modelRequestKey(requests[0]!)]: 'gpt-6.1-sol' },
    });
  });

  it('asks for a knowledge mapping when the list command fails', () => {
    expect(modelMappingPrompt('codex', requests)).toContain(
      'map each request from what you know about the model ids your harness accepts'
    );
  });

  it('resolves, passes through, or refuses a request', () => {
    const map = {
      source: 'list' as const,
      resolved: { [modelRequestKey(requests[0]!)]: 'gpt-6.1-sol' },
    };
    expect(resolveModel('codex', map, requests[0]!)).toEqual({
      kind: 'resolved',
      model: 'gpt-6.1-sol',
      verified: true,
    });
    expect(resolveModel('codex', { ...map, source: 'knowledge' }, requests[0]!)).toEqual({
      kind: 'resolved',
      model: 'gpt-6.1-sol',
      verified: false,
    });
    expect(resolveModel('codex', { ...map, source: 'knowledge' }, requests[1]!)).toEqual({
      kind: 'pass-through',
      model: 'gpt-terra',
    });
    expect(resolveModel('codex', map, requests[1]!)).toMatchObject({
      kind: 'unresolved',
      detail: expect.stringContaining('"gpt-terra"'),
    });
    expect(resolveModel('codex', { source: 'none', resolved: {} }, requests[1]!)).toEqual({
      kind: 'pass-through',
      model: 'gpt-terra',
    });
    expect(resolveModel('codex', undefined, requests[1]!)).toEqual({
      kind: 'pass-through',
      model: 'gpt-terra',
    });
    expect(resolveModel('claude', map, { model: 'opus' })).toEqual({
      kind: 'pass-through',
      model: 'opus',
    });
  });
});
