import * as path from 'path';
import * as yaml from 'js-yaml';
import { hasYamlContent } from './task-frontmatter';

export const WORKSPACE_CONFIG_RELPATH = path.join('config', 'config.yaml');

type ConfigurationDocument =
  | { kind: 'document'; document: unknown }
  | { kind: 'invalid'; detail: string };

/** Parse once; each feature owns its section, read policy, and null semantics. */
export const parseWorkspaceConfiguration = (contents: string): ConfigurationDocument => {
  try {
    // js-yaml v5 rejects an empty document; blank/comment-only config is unconfigured.
    return { kind: 'document', document: hasYamlContent(contents) ? yaml.load(contents) : {} };
  } catch (error) {
    return {
      kind: 'invalid',
      detail: `config.yaml is not valid YAML: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};
