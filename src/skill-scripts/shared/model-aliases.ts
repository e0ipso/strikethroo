/**
 * Model alias resolution for routed task execution.
 *
 * A routing target may name a model family (`gpt-sol`, `grok`) instead of an
 * exact id. The harness readiness probe already asks the harness's model to
 * run a command; it also asks it to run the harness's own model-list command
 * and map each configured name for that harness to one listed id. The model's
 * answer is untrusted: this module accepts a mapping only when the id appears
 * in the list the model reported and has a safe shape. An exact id that
 * appears in the list always maps to itself, whatever the model said.
 *
 * When the model cannot list its models, it maps the names from its own
 * knowledge instead. Such a mapping cannot be checked against a list, so it is
 * accepted on shape alone and a wrong id fails at launch. A name it leaves out
 * keeps its configured value. When a list exists and a name cannot be mapped
 * to it, the target is unavailable and routing moves to the next target.
 */

import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import type { Harness } from '../../types';
import type { RoutingConfig } from './execution-routing';

/** One configured model name for a harness, with the effort it runs at. */
export interface ModelRequest {
  model: string;
  reasoningEffort?: string;
}

/**
 * Where a {@link ModelMap} came from: `list` when every id was checked against
 * the model list the harness printed, `knowledge` when the model mapped names
 * without a list, `none` when the probe wrote no usable answer.
 */
export type ModelMapSource = 'list' | 'knowledge' | 'none';

/**
 * The validated mapping one probe produced. `resolved` maps
 * {@link modelRequestKey} values to model ids.
 */
export interface ModelMap {
  source: ModelMapSource;
  resolved: Record<string, string>;
}

const MODEL_MAP_SOURCES: ReadonlySet<unknown> = new Set<ModelMapSource>([
  'list',
  'knowledge',
  'none',
]);

export type ModelResolution =
  | { kind: 'resolved'; model: string; verified: boolean }
  | { kind: 'pass-through'; model: string }
  | { kind: 'unresolved'; detail: string };

/**
 * Harnesses whose CLI and native subagent tool resolve family aliases
 * themselves (`opus`, `sonnet`). Their configured names pass through
 * unchanged, because the native tool accepts only those aliases.
 */
export const NATIVE_ALIAS_HARNESSES: ReadonlySet<Harness> = new Set<Harness>(['claude']);

/**
 * Known model-list commands, named in the prompt so the probe model does not
 * have to discover them. Each was checked against the installed CLI. A
 * harness without an entry is asked to find its own command.
 */
export const MODEL_LIST_COMMANDS: Readonly<Partial<Record<Harness, string>>> = {
  codex: 'codex debug models',
  cursor: 'cursor-agent --list-models',
};

/** File the probe model writes its model list and mapping to. */
export const MODEL_MAP_FILE = 'strikethroo-models.json';

/** Version of the mapping prompt and parser; part of the availability cache key. */
export const MODEL_MAP_VERSION = 4;

const MAX_MODEL_MAP_BYTES = 256 * 1024;
const MAX_LISTED_MODELS = 2000;

/**
 * Accepted model id shape. Covers ids such as `gpt-6.1-sol`, `grok-4.7-xhigh`,
 * `provider/model`, and bracketed parameters like `name[effort=high]`. Ids are
 * passed as argv elements, never through a shell, but a strict shape also
 * keeps model output out of later prompts and logs.
 */
const MODEL_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/@+=,[\]-]{0,199}$/;

/** Stable key of one request in a {@link ModelMap}. */
export const modelRequestKey = (request: ModelRequest): string =>
  JSON.stringify([request.model, request.reasoningEffort ?? null]);

/** The distinct requests of all `groups`, sorted by key. */
export const mergeModelRequests = (...groups: readonly ModelRequest[][]): ModelRequest[] => {
  const requests = new Map<string, ModelRequest>();
  for (const request of groups.flat()) requests.set(modelRequestKey(request), request);
  // Code-unit order, not locale order: the order is part of the cache key.
  return [...requests.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, request]) => request);
};

/**
 * Collect the distinct model requests that routing can send to `harness`,
 * sorted by key. Empty for a harness that resolves aliases natively.
 */
export const collectModelRequests = (config: RoutingConfig, harness: Harness): ModelRequest[] => {
  if (NATIVE_ALIAS_HARNESSES.has(harness)) return [];
  return mergeModelRequests(
    config.profiles.flatMap(profile =>
      profile.targets
        .filter(target => target.harness === harness)
        .map(target =>
          target.reasoning_effort === undefined
            ? { model: target.model }
            : { model: target.model, reasoningEffort: target.reasoning_effort }
        )
    )
  );
};

/** Hash of a request set, so a configuration change invalidates cached mappings. */
export const modelRequestsHash = (requests: readonly ModelRequest[]): string =>
  createHash('sha256')
    .update(JSON.stringify({ version: MODEL_MAP_VERSION, requests: requests.map(modelRequestKey) }))
    .digest('hex');

/** Probe prompt lines that ask for the model list and the mapping. */
export const modelMappingPrompt = (harness: Harness, requests: readonly ModelRequest[]): string =>
  [
    '',
    MODEL_LIST_COMMANDS[harness] === undefined
      ? 'Then run the command your harness provides to list the models you can use, such as ' +
        'its model-list subcommand or flag. Do not guess the list.'
      : `Then run \`${MODEL_LIST_COMMANDS[harness]}\` to list the models you can use. If that ` +
        'command fails, find the model-list command your harness provides. Do not guess the list.',
    `Create ${MODEL_MAP_FILE} in the current workspace with JSON of this exact shape:`,
    '{"listCommand": "<the command you ran>", "models": ["<every model id it printed>"], ' +
      '"aliases": {"<request number>": "<one id from models>"}}',
    'Map each request below to exactly one id from "models". A request names an exact id or a ' +
      'model family. For a family, choose the newest version in that family. When the ids ' +
      'encode a reasoning effort, choose the id with the requested effort, or with the effort ' +
      'the name ends with, such as "-xhigh". Leave out a request you cannot map.',
    'If you cannot list the models, set "listCommand" to "" and "models" to [], and map each ' +
      'request from what you know about the model ids your harness accepts. Map an exact id to ' +
      'itself. Leave out a request you are not sure of.',
    'Requests:',
    ...requests.map(
      (request, index) =>
        `${index + 1}: ${JSON.stringify(request.model)}` +
        (request.reasoningEffort === undefined
          ? ''
          : `, reasoning effort ${JSON.stringify(request.reasoningEffort)}`)
    ),
    '',
  ].join('\n');

/** Whether `value` has the accepted model id shape. */
export const isModelId = (value: unknown): value is string =>
  typeof value === 'string' && MODEL_ID_PATTERN.test(value);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const NO_ANSWER: ModelMap = { source: 'none', resolved: {} };

/**
 * Validate the probe model's answer against the requests it was given.
 *
 * Invalid list entries are dropped. With a list, a mapping counts only when it
 * names a listed id, and an exact id that is listed maps to itself. Without
 * one, a mapping counts when it has a valid id shape.
 */
export const parseModelMapping = (content: string, requests: readonly ModelRequest[]): ModelMap => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return NO_ANSWER;
  }
  if (!isRecord(parsed)) return NO_ANSWER;
  const models = Array.isArray(parsed.models) ? parsed.models : [];
  const listed = new Set(models.slice(0, MAX_LISTED_MODELS).filter(isModelId));
  const aliases = isRecord(parsed.aliases) ? parsed.aliases : {};
  const fromList = listed.size > 0;

  const resolved: Record<string, string> = {};
  requests.forEach((request, index) => {
    const candidate = listed.has(request.model) ? request.model : aliases[String(index + 1)];
    if (isModelId(candidate) && (!fromList || listed.has(candidate))) {
      resolved[modelRequestKey(request)] = candidate;
    }
  });
  return { source: fromList ? 'list' : 'knowledge', resolved };
};

/**
 * Read and validate the mapping file from a probe workspace. A missing,
 * linked, oversized, or unreadable file means no usable list.
 */
export const readModelMapping = (
  workspace: string,
  requests: readonly ModelRequest[]
): ModelMap => {
  const target = path.join(workspace, MODEL_MAP_FILE);
  try {
    const stats = fs.lstatSync(target);
    if (!stats.isFile() || stats.size > MAX_MODEL_MAP_BYTES) return NO_ANSWER;
    return parseModelMapping(fs.readFileSync(target, 'utf8'), requests);
  } catch {
    return NO_ANSWER;
  }
};

/** Whether a cached value has the {@link ModelMap} shape. */
export const isModelMap = (value: unknown): value is ModelMap =>
  isRecord(value) &&
  MODEL_MAP_SOURCES.has(value.source) &&
  isRecord(value.resolved) &&
  Object.values(value.resolved).every(isModelId);

/**
 * Resolve the model a target runs with.
 *
 * A mapped name resolves; `verified` is true only when its id came from the
 * harness's model list. An unmapped name is unresolved when a list exists,
 * and otherwise passes through unchanged.
 */
export const resolveModel = (
  harness: Harness,
  map: ModelMap | undefined,
  request: ModelRequest
): ModelResolution => {
  if (NATIVE_ALIAS_HARNESSES.has(harness) || map === undefined) {
    return { kind: 'pass-through', model: request.model };
  }
  const model = map.resolved[modelRequestKey(request)];
  if (model !== undefined) return { kind: 'resolved', model, verified: map.source === 'list' };
  if (map.source !== 'list') return { kind: 'pass-through', model: request.model };
  return {
    kind: 'unresolved',
    detail: `model "${request.model}" is not in the ${harness} model list and could not be mapped`,
  };
};
