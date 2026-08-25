/**
 * Shared Agent Harness Adapter
 *
 * Every harness Strikethroo currently supports installs the same way: copy the
 * agent templates from `templates/harness/agents/`, converting to Codex's TOML
 * format where required. Rather than hand-write six near-identical adapters, a
 * single factory produces one per harness, parameterized by the existing
 * `getAgentFormat` descriptor.
 *
 * The same factory also installs the packaged Agent Skills, which — unlike
 * agents — are copied verbatim for every harness: the `SKILL.md` format is
 * harness-agnostic, so there is nothing to convert.
 *
 * Importing this module has the side effect of registering an adapter for every
 * entry in `SUPPORTED_HARNESSES`.
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { Harness, SUPPORTED_HARNESSES } from '../types';
import { getAgentFormat, convertAgentMdToToml } from '../utils';
import { HarnessAdapter, SkillInstallResult, registerHarnessAdapter } from './registry';

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
    } else {
      await fs.writeFile(targetPath, content, 'utf-8');
    }

    writtenFiles.push(targetPath);
  }

  return writtenFiles;
}

/**
 * Absolute path to the packaged Agent Skills directory.
 *
 * Resolved the same way as {@link getAgentsTemplateDir}: relative to this
 * compiled module, two levels below the package root that holds `templates/`.
 */
function getSkillsTemplateDir(): string {
  return path.join(__dirname, '..', '..', 'templates', 'harness', 'skills');
}

/** Resolve the target skills directory for a harness under a project root. */
function skillsDirFor(harness: Harness, projectRoot: string): string {
  return path.resolve(projectRoot || '.', getAgentFormat(harness).skillsDirectory);
}

/** One packaged file paired with the absolute path it will be written to. */
interface SkillFileCopy {
  source: string;
  dest: string;
}

/**
 * Recursively pair every regular file under `sourceDir` with its destination
 * under `destDir`, preserving the tree shape.
 */
async function collectSkillFiles(sourceDir: string, destDir: string): Promise<SkillFileCopy[]> {
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  const copies: SkillFileCopy[] = [];

  for (const entry of entries) {
    const source = path.join(sourceDir, entry.name);
    const dest = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copies.push(...(await collectSkillFiles(source, dest)));
    } else if (entry.isFile()) {
      copies.push({ source, dest });
    }
  }

  return copies;
}

/**
 * Copy every packaged skill into the harness's skills directory under
 * `projectRoot`, overwriting unconditionally and without consulting
 * `.init-metadata.json` — skill artifacts are owned by the release, not by the
 * user's workspace.
 *
 * `replacedExisting` answers only "did this call overwrite something it wrote
 * itself?". A harness skills directory routinely holds unrelated third-party
 * skills, so a "directory is non-empty" check would report a replacement on
 * every fresh install. The probe therefore runs per computed destination and
 * before the copy, which would otherwise destroy the evidence.
 */
async function writeSkillFiles(harness: Harness, projectRoot: string): Promise<SkillInstallResult> {
  const sourceSkillsDir = getSkillsTemplateDir();
  const skillsDir = skillsDirFor(harness, projectRoot);

  if (!(await fs.pathExists(sourceSkillsDir))) {
    return { files: [], skillsDir, replacedExisting: false };
  }

  // Each immediate child directory is one skill; stray files at this level are
  // not skills and are ignored.
  const skillNames = (await fs.readdir(sourceSkillsDir, { withFileTypes: true }))
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);

  const copies: SkillFileCopy[] = [];
  for (const skillName of skillNames) {
    copies.push(
      ...(await collectSkillFiles(
        path.join(sourceSkillsDir, skillName),
        path.join(skillsDir, skillName)
      ))
    );
  }

  let replacedExisting = false;
  for (const copy of copies) {
    if (await fs.pathExists(copy.dest)) {
      replacedExisting = true;
      break;
    }
  }

  for (const copy of copies) {
    await fs.ensureDir(path.dirname(copy.dest));
    await fs.copy(copy.source, copy.dest, { overwrite: true });
  }

  return { files: copies.map(copy => copy.dest), skillsDir, replacedExisting };
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
    async installSkills(projectRoot: string): Promise<SkillInstallResult> {
      return writeSkillFiles(id, projectRoot);
    },
  };
}

// Register an adapter for every supported harness.
for (const harness of SUPPORTED_HARNESSES) {
  registerHarnessAdapter(createAgentAdapter(harness));
}
