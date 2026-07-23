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
import { getAgentFormat, convertAgentMdToToml, convertAgentMdToKiroJson } from '../utils';
import { HarnessAdapter, registerHarnessAdapter } from './registry';

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
 * Write the agent files for a harness under `projectRoot`, overwriting any
 * existing files. Returns the absolute paths written. Shared by `install` and
 * `update` — the operation is idempotent.
 */
async function writeAgentFiles(harness: Harness, projectRoot: string): Promise<string[]> {
  const sourceAgentsDir = getAgentsTemplateDir();
  if (!(await fs.pathExists(sourceAgentsDir))) {
    return [];
  }

  const agentFiles = (await fs.readdir(sourceAgentsDir)).filter(f => f.endsWith('.md'));
  const formatInfo = getAgentFormat(harness);
  const targetDir = agentDirFor(harness, projectRoot);
  await fs.ensureDir(targetDir);

  const writtenFiles: string[] = [];
  for (const agentFile of agentFiles) {
    const sourcePath = path.join(sourceAgentsDir, agentFile);
    const content = await fs.readFile(sourcePath, 'utf-8');
    const baseName = path.basename(agentFile, '.md');
    const targetPath = path.join(targetDir, baseName + formatInfo.extension);

    if (formatInfo.format === 'toml') {
      await fs.writeFile(targetPath, convertAgentMdToToml(content), 'utf-8');
    } else if (formatInfo.format === 'json') {
      await fs.writeFile(targetPath, convertAgentMdToKiroJson(content), 'utf-8');
    } else {
      await fs.writeFile(targetPath, content, 'utf-8');
    }

    writtenFiles.push(targetPath);
  }

  return writtenFiles;
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
