/**
 * Model names inside `harnesses.<name>.cli_args`.
 *
 * A `cli_args` value can select a model, for example `--model grok-xhigh` or
 * Codex's `--config model="gpt-sol"`. Like a routing target, that name can be
 * a family. This module finds those options, so the readiness probe can map
 * their names, and rewrites them with the mapped ids before a launch.
 *
 * Only the documented model options of each CLI are recognized. Any other
 * argument passes through unchanged.
 */

import type { Harness } from '../../types';
import {
  isModelId,
  NATIVE_ALIAS_HARNESSES,
  resolveModel,
  type ModelMap,
  type ModelRequest,
} from './model-aliases';

interface ModelOptionSyntax {
  /** Flags whose next element, or `=` value for a long flag, is a model id. */
  readonly flags: readonly string[];
  /** Flags whose next element, or `=` value, can be a `model=<id>` setting. */
  readonly configFlags: readonly string[];
}

/** Model options per CLI, from each CLI's documented reference. */
const MODEL_OPTION_SYNTAX: Readonly<Record<Harness, ModelOptionSyntax>> = {
  claude: { flags: ['--model'], configFlags: [] },
  codex: { flags: ['--model', '-m'], configFlags: ['--config', '-c'] },
  cursor: { flags: ['--model'], configFlags: [] },
  gemini: { flags: ['--model', '-m'], configFlags: [] },
  copilot: { flags: ['--model'], configFlags: [] },
  opencode: { flags: ['--model', '-m'], configFlags: [] },
};

/** A Codex `model=<id>` setting. The id can be a TOML string or a bare value. */
const MODEL_SETTING_PATTERN = /^model\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"']+))$/;

/** One model option found in `cli_args`. */
interface ModelOption {
  /** Index of the first element of the option. */
  start: number;
  /** Number of elements the option uses: 1 for `--flag=value`, else 2. */
  span: number;
  model: string;
  /** The option elements with a different model id. */
  render: (model: string) => string[];
}

const parseSetting = (
  value: string
): { model: string; render: (model: string) => string } | undefined => {
  const match = MODEL_SETTING_PATTERN.exec(value);
  if (!match) return undefined;
  const quote = match[1] !== undefined ? '"' : match[2] !== undefined ? "'" : '';
  return {
    model: match[1] ?? match[2] ?? match[3]!,
    render: model => `model=${quote}${model}${quote}`,
  };
};

/** Parse the element at `index` as a model option, or return `undefined`. */
const optionAt = (
  syntax: ModelOptionSyntax,
  cliArgs: readonly string[],
  index: number
): ModelOption | undefined => {
  const element = cliArgs[index]!;
  const next = cliArgs[index + 1];
  if (syntax.flags.includes(element) && next !== undefined) {
    return { start: index, span: 2, model: next, render: model => [element, model] };
  }
  if (syntax.configFlags.includes(element) && next !== undefined) {
    const setting = parseSetting(next);
    if (setting) {
      return {
        start: index,
        span: 2,
        model: setting.model,
        render: model => [element, setting.render(model)],
      };
    }
  }
  const equals = element.indexOf('=');
  if (!element.startsWith('--') || equals === -1) return undefined;
  const flag = element.slice(0, equals);
  const value = element.slice(equals + 1);
  if (syntax.flags.includes(flag)) {
    return { start: index, span: 1, model: value, render: model => [`${flag}=${model}`] };
  }
  const setting = syntax.configFlags.includes(flag) ? parseSetting(value) : undefined;
  return setting
    ? {
        start: index,
        span: 1,
        model: setting.model,
        render: model => [`${flag}=${setting.render(model)}`],
      }
    : undefined;
};

/** Every model option in `cliArgs` whose value has a valid model id shape. */
const findModelOptions = (harness: Harness, cliArgs: readonly string[]): ModelOption[] => {
  const syntax = MODEL_OPTION_SYNTAX[harness];
  const options: ModelOption[] = [];
  for (let index = 0; index < cliArgs.length; index += 1) {
    const option = optionAt(syntax, cliArgs, index);
    if (!option) continue;
    if (isModelId(option.model)) options.push(option);
    index += option.span - 1;
  }
  return options;
};

/** Replace each option with the elements `replace` returns for it. */
const rewrite = (
  cliArgs: readonly string[],
  options: readonly ModelOption[],
  replace: (option: ModelOption) => string[]
): string[] => {
  const result: string[] = [];
  let index = 0;
  for (const option of options) {
    result.push(...cliArgs.slice(index, option.start), ...replace(option));
    index = option.start + option.span;
  }
  result.push(...cliArgs.slice(index));
  return result;
};

/**
 * The model names `cliArgs` selects, as requests without an effort. Empty for
 * a harness that resolves aliases natively.
 */
export const cliArgsModelRequests = (
  harness: Harness,
  cliArgs: readonly string[]
): ModelRequest[] =>
  NATIVE_ALIAS_HARNESSES.has(harness)
    ? []
    : findModelOptions(harness, cliArgs).map(option => ({ model: option.model }));

/**
 * `cliArgs` without its model options, so the CLI uses its default model. The
 * readiness probe retries with these arguments when the configured name is
 * one the CLI rejects. Unchanged for a harness that resolves aliases natively.
 */
export const withoutModelOptions = (harness: Harness, cliArgs: readonly string[]): string[] =>
  NATIVE_ALIAS_HARNESSES.has(harness)
    ? [...cliArgs]
    : rewrite(cliArgs, findModelOptions(harness, cliArgs), () => []);

export type CliArgsResolution =
  | { kind: 'resolved'; cliArgs: string[]; verified: boolean }
  | { kind: 'unresolved'; detail: string };

/**
 * Replace each model name in `cliArgs` with its mapped id.
 *
 * `verified` is false when any id came from the model's knowledge instead of
 * the harness's model list. A name that cannot be mapped while a list exists
 * makes the whole result unresolved.
 */
export const resolveCliArgs = (
  harness: Harness,
  cliArgs: readonly string[],
  map: ModelMap | undefined
): CliArgsResolution => {
  if (NATIVE_ALIAS_HARNESSES.has(harness)) {
    return { kind: 'resolved', cliArgs: [...cliArgs], verified: true };
  }
  const options = findModelOptions(harness, cliArgs);
  const models: string[] = [];
  let verified = true;
  for (const option of options) {
    const resolution = resolveModel(harness, map, { model: option.model });
    if (resolution.kind === 'unresolved') {
      return {
        kind: 'unresolved',
        detail: `harnesses.${harness}.cli_args: ${resolution.detail}`,
      };
    }
    if (resolution.kind === 'resolved' && !resolution.verified) verified = false;
    models.push(resolution.model);
  }
  let next = 0;
  return {
    kind: 'resolved',
    cliArgs: rewrite(cliArgs, options, option => option.render(models[next++]!)),
    verified,
  };
};
