/**
 * Harness Adapter Registry Tests
 *
 * Integration-first: exercises the registry against the real filesystem and the
 * real agent templates, since the whole point of an adapter is what it writes to
 * disk. Covers registry membership and the detect/install/update lifecycle.
 */

import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import { HarnessRegistry } from '../harnesses';
import { SUPPORTED_HARNESSES } from '../types';
import { getAgentFormat } from '../utils';

describe('HarnessRegistry', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'st-harness-registry-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('registers exactly one adapter per supported harness', () => {
    expect(new Set(HarnessRegistry.keys())).toEqual(new Set(SUPPORTED_HARNESSES));
    for (const harness of SUPPORTED_HARNESSES) {
      expect(HarnessRegistry.get(harness)?.id).toBe(harness);
    }
  });

  it('install creates the harness agent files for a markdown harness', async () => {
    const created = await HarnessRegistry.get('claude')!.install(tempDir);

    const agentPath = path.join(tempDir, '.claude/agents/plan-creator.md');
    expect(await fs.pathExists(agentPath)).toBe(true);
    expect(created).toContain(agentPath);
  });

  it('install converts to TOML for codex', async () => {
    await HarnessRegistry.get('codex')!.install(tempDir);

    const tomlPath = path.join(tempDir, '.codex/agents/plan-creator.toml');
    expect(await fs.pathExists(tomlPath)).toBe(true);
    const contents = await fs.readFile(tomlPath, 'utf-8');
    expect(contents).toContain('developer_instructions = """');
  });

  it('detect is false before install and true after', async () => {
    const adapter = HarnessRegistry.get('gemini')!;
    expect(await adapter.detect(tempDir)).toBe(false);

    await adapter.install(tempDir);
    expect(await adapter.detect(tempDir)).toBe(true);

    const agentDir = path.join(tempDir, getAgentFormat('gemini').directory);
    expect(await fs.pathExists(agentDir)).toBe(true);
  });

  it('update is idempotent and rewrites the same files as install', async () => {
    const adapter = HarnessRegistry.get('claude')!;
    const installed = await adapter.install(tempDir);
    const updated = await adapter.update(tempDir);

    expect(updated).toEqual(installed);
    for (const file of updated) {
      expect(await fs.pathExists(file)).toBe(true);
    }
  });
});
