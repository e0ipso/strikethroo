import { readContainedFile } from './safe-fs';
import { WORKSPACE_CONFIG_RELPATH, parseWorkspaceConfiguration } from './workspace-configuration';

export type CodeReviewConfiguration =
  | { kind: 'config'; enabled: boolean }
  | { kind: 'invalid'; detail: string };

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

/** Only an explicit boolean true authorizes review. Other sections have their own readers. */
export const loadCodeReviewConfiguration = (strikethrooRoot: string): CodeReviewConfiguration => {
  const read = readContainedFile(strikethrooRoot, WORKSPACE_CONFIG_RELPATH);
  if ('error' in read) {
    if (read.error === 'not-found') return { kind: 'config', enabled: false };
    return { kind: 'invalid', detail: `config.yaml could not be read: ${read.message}` };
  }
  const contents = read.content;

  const parsed = parseWorkspaceConfiguration(contents);
  if (parsed.kind === 'invalid') return parsed;
  const { document } = parsed;
  if (!isPlainObject(document)) {
    return { kind: 'invalid', detail: 'config.yaml must be a YAML mapping.' };
  }
  if (!Object.prototype.hasOwnProperty.call(document, 'code_review')) {
    return { kind: 'config', enabled: false };
  }

  const section = document.code_review;
  if (!isPlainObject(section)) {
    return { kind: 'invalid', detail: 'config.yaml code_review must be a YAML mapping.' };
  }
  const unsupported = Object.keys(section).find(key => key !== 'enabled');
  if (unsupported !== undefined) {
    return { kind: 'invalid', detail: `config.yaml code_review.${unsupported} is not supported.` };
  }
  if (!Object.prototype.hasOwnProperty.call(section, 'enabled')) {
    return { kind: 'config', enabled: false };
  }
  if (typeof section.enabled !== 'boolean') {
    return { kind: 'invalid', detail: 'config.yaml code_review.enabled must be a boolean.' };
  }
  return { kind: 'config', enabled: section.enabled };
};
