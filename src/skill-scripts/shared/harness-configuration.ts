import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

import { SUPPORTED_HARNESSES, type Harness } from '../../types';
import { WORKSPACE_CONFIG_RELPATH } from './execution-routing';

export const HARNESS_CONFIGURATION_SECTION = 'harnesses';
export const HARNESS_CONFIGURATION_NORMALIZATION_VERSION = 1;

export interface NormalizedHarnessInvocation {
  readonly cliArgs: readonly string[];
  readonly cliArgsHash: string;
}

export type NormalizedHarnessConfiguration = Readonly<Record<Harness, NormalizedHarnessInvocation>>;

export type HarnessConfigurationResult =
  | { kind: 'config'; config: NormalizedHarnessConfiguration }
  | { kind: 'invalid'; errors: readonly string[] };

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const hashHarnessCliArgs = (
  harness: Harness,
  cliArgs: readonly string[],
  normalizationVersion = HARNESS_CONFIGURATION_NORMALIZATION_VERSION
): string =>
  createHash('sha256')
    .update(
      JSON.stringify({
        schema: normalizationVersion,
        harness,
        cliArgs,
      }),
      'utf8'
    )
    .digest('hex');

const normalizeInvocation = (
  harness: Harness,
  cliArgs: readonly string[]
): NormalizedHarnessInvocation => {
  const immutableArgs = Object.freeze([...cliArgs]);
  return Object.freeze({
    cliArgs: immutableArgs,
    cliArgsHash: hashHarnessCliArgs(harness, immutableArgs),
  });
};

const emptyConfiguration = (): NormalizedHarnessConfiguration =>
  Object.freeze(
    Object.fromEntries(
      SUPPORTED_HARNESSES.map(harness => [harness, normalizeInvocation(harness, [])])
    ) as Record<Harness, NormalizedHarnessInvocation>
  );

const validateHarnessEntry = (
  harness: Harness,
  raw: unknown,
  errors: string[]
): NormalizedHarnessInvocation | null => {
  const entryPath = `config.yaml ${HARNESS_CONFIGURATION_SECTION}.${harness}`;
  if (!isPlainObject(raw)) {
    errors.push(`${entryPath} must be a mapping.`);
    return null;
  }

  for (const key of Object.keys(raw)) {
    if (key !== 'cli_args') errors.push(`${entryPath}.${key} is not supported.`);
  }

  if (!('cli_args' in raw)) return normalizeInvocation(harness, []);
  if (!Array.isArray(raw.cli_args)) {
    errors.push(`${entryPath}.cli_args must be an array of exact strings.`);
    return null;
  }

  const cliArgs: string[] = [];
  raw.cli_args.forEach((value, index) => {
    const valuePath = `${entryPath}.cli_args[${index}]`;
    if (typeof value !== 'string' || value.length === 0) {
      errors.push(`${valuePath} must be a non-empty string.`);
      return;
    }
    if (value.includes('\0')) {
      errors.push(`${valuePath} must not contain a NUL character.`);
      return;
    }
    cliArgs.push(value);
  });

  return normalizeInvocation(harness, cliArgs);
};

/**
 * Loads the local per-harness invocation arguments from config/config.yaml.
 * Other top-level sections remain owned by their respective features.
 */
export const loadHarnessConfiguration = (strikethrooRoot: string): HarnessConfigurationResult => {
  const configPath = path.join(strikethrooRoot, WORKSPACE_CONFIG_RELPATH);
  let contents: string;
  try {
    contents = fs.readFileSync(configPath, 'utf8');
  } catch (error) {
    if ((error as { code?: unknown }).code === 'ENOENT') {
      return { kind: 'config', config: emptyConfiguration() };
    }
    return {
      kind: 'invalid',
      errors: [
        `config.yaml could not be read: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }

  let document: unknown;
  try {
    document = yaml.load(contents);
  } catch (error) {
    return {
      kind: 'invalid',
      errors: [
        `config.yaml is not valid YAML: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }

  if (document === null || document === undefined) {
    return { kind: 'config', config: emptyConfiguration() };
  }
  if (!isPlainObject(document)) {
    return { kind: 'invalid', errors: ['config.yaml must be a YAML mapping.'] };
  }

  const section = document[HARNESS_CONFIGURATION_SECTION];
  if (section === null || section === undefined) {
    return { kind: 'config', config: emptyConfiguration() };
  }
  if (!isPlainObject(section)) {
    return {
      kind: 'invalid',
      errors: [`config.yaml ${HARNESS_CONFIGURATION_SECTION} must be a YAML mapping.`],
    };
  }

  const errors: string[] = [];
  const supportedHarnesses = new Set<string>(SUPPORTED_HARNESSES);
  for (const harness of Object.keys(section)) {
    if (!supportedHarnesses.has(harness)) {
      errors.push(`config.yaml ${HARNESS_CONFIGURATION_SECTION}.${harness} is not supported.`);
    }
  }

  const entries = {} as Record<Harness, NormalizedHarnessInvocation>;
  for (const harness of SUPPORTED_HARNESSES) {
    if (!(harness in section)) {
      entries[harness] = normalizeInvocation(harness, []);
      continue;
    }
    const entry = validateHarnessEntry(harness, section[harness], errors);
    if (entry) entries[harness] = entry;
  }

  if (errors.length > 0) return { kind: 'invalid', errors };
  return { kind: 'config', config: Object.freeze(entries) };
};
