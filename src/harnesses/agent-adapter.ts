/**
 * Shared Agent Harness Adapter
 *
 * Every harness Strikethroo currently supports installs the same way: copy the
 * agent templates from `templates/harness/agents/`, converting to Codex's TOML
 * format where required. Rather than hand-write six near-identical adapters, a
 * single factory produces one per harness, parameterized by the existing
 * `getAgentFormat` descriptor.
 *
 * Importing this module has the side effect of registering an adapter for every
 * entry in `SUPPORTED_HARNESSES`.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { Harness, SUPPORTED_HARNESSES } from '../types';
import { getAgentFormat, convertAgentMdToToml } from '../utils';
import { HarnessAdapter, registerHarnessAdapter } from './registry';
import { ManagedFile, writeManagedFile } from '../managed-files';

/**
 * Absolute path to the shared agent templates directory.
 *
 * Resolved relative to this compiled module: `dist/harnesses/agent-adapter.js`
 * sits two levels below the package root that holds `templates/`.
 */
function getAgentsTemplateDir(): string {
  return path.join(__dirname, '..', '..', 'templates', 'harness', 'agents');
}

/** Resolve the target agent directory for a harness under a project root. */
function agentDirFor(harness: Harness, projectRoot: string): string {
  return path.resolve(projectRoot || '.', getAgentFormat(harness).directory);
}

/**
 * List the agent files a harness installs, with their content, by path
 * relative to `projectRoot`. Reads only the shipped templates; writes nothing.
 */
async function planAgentFiles(harness: Harness): Promise<ManagedFile[]> {
  const sourceAgentsDir = getAgentsTemplateDir();
  if (!(await fs.pathExists(sourceAgentsDir))) {
    return [];
  }

  const formatInfo = getAgentFormat(harness);
  const agentFiles = (await fs.readdir(sourceAgentsDir)).filter(f => f.endsWith('.md')).sort();
  const planned: ManagedFile[] = [];
  for (const agentFile of agentFiles) {
    const content = await fs.readFile(path.join(sourceAgentsDir, agentFile), 'utf-8');
    planned.push({
      relativePath: path.join(
        formatInfo.directory,
        path.basename(agentFile, '.md') + formatInfo.extension
      ),
      content: formatInfo.format === 'toml' ? convertAgentMdToToml(content) : content,
    });
  }
  return planned;
}

/**
 * Write every planned agent file for a harness, replacing existing files.
 * Returns the absolute paths written. Writes are contained below the project:
 * a symbolic link at the harness directory, the agent directory, or an agent
 * file is refused, never written through.
 */
async function writeAgentFiles(harness: Harness, projectRoot: string): Promise<string[]> {
  const root = path.resolve(projectRoot || '.');
  const written: string[] = [];
  for (const file of await planAgentFiles(harness)) {
    await writeManagedFile(root, file);
    written.push(path.join(root, file.relativePath));
  }
  return written;
}

/**
 * Build a {@link HarnessAdapter} for a harness whose install mechanism is the
 * shared agent-file copy.
 */
export function createAgentAdapter(id: Harness): HarnessAdapter {
  return {
    id,
    async detect(projectRoot: string): Promise<boolean> {
      return fs.pathExists(agentDirFor(id, projectRoot));
    },
    async plan(): Promise<ManagedFile[]> {
      return planAgentFiles(id);
    },
    async install(projectRoot: string): Promise<string[]> {
      return writeAgentFiles(id, projectRoot);
    },
    async update(projectRoot: string): Promise<string[]> {
      return writeAgentFiles(id, projectRoot);
    },
  };
}

// Register an adapter for every supported harness.
for (const harness of SUPPORTED_HARNESSES) {
  registerHarnessAdapter(createAgentAdapter(harness));
}
