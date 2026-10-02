#!/usr/bin/env node
// kk-detect-harness: resolves the active knowledge base harness id.
// Mirrors src/harnesses/detect.ts resolveWithHint priority. Shared by the kk
// skills (they invoke it from the repo root as
// `node .ai/kenkeep/scripts/kk-detect-harness.mjs --hint <id>`); CI guards
// drift against the TS adapters via scripts/lint-detect-harness.mjs.
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
const REGISTERED = ['claude', 'codex', 'copilot', 'cursor', 'opencode'];
const ENV_DETECTORS = [
  { env: 'CURSOR_AGENT', value: '1', harness: 'cursor' },
  { env: 'CURSOR_VERSION', value: '*nonempty*', harness: 'cursor' },
  { env: 'CLAUDECODE', value: '1', harness: 'claude' },
];
function findHint(argv) {
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--hint' && i + 1 < argv.length) return argv[i + 1];
  }
  return undefined;
}
function findRoot(argv) {
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--root' && i + 1 < argv.length) return argv[i + 1];
  }
  return undefined;
}
function detectFromEnv(env) {
  if (env.CLAUDECODE === '1') return 'claude';
  for (const d of ENV_DETECTORS) {
    if (d.value === '*nonempty*') {
      if (typeof env[d.env] === 'string' && env[d.env].length > 0) return d.harness;
    } else if (env[d.env] === d.value) return d.harness;
  }
  return undefined;
}
function findRepoRoot(start) {
  let dir = start;
  while (true) {
    if (existsSync(join(dir, '.ai', 'kenkeep'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}
function readDefault(root) {
  if (!root) return undefined;
  const config = join(root, '.ai', 'kenkeep', 'config.yaml');
  if (!existsSync(config)) return undefined;
  const text = readFileSync(config, 'utf8');
  const m = text.match(/^cliDefaultHarness:\s*(\S+)/m);
  return m ? m[1] : undefined;
}
const argv = process.argv.slice(2);
const hint = findHint(argv);
if (hint && REGISTERED.includes(hint)) {
  process.stdout.write(hint);
  process.exit(0);
}
const fromEnv = detectFromEnv(process.env);
if (fromEnv) {
  process.stdout.write(fromEnv);
  process.exit(0);
}
const fromDefault = readDefault(findRoot(argv) ?? findRepoRoot(process.cwd()));
if (fromDefault && REGISTERED.includes(fromDefault)) {
  process.stdout.write(fromDefault);
  process.exit(0);
}
process.stderr.write(
  'kk-detect-harness: could not resolve. Pass --hint <id> or set cliDefaultHarness in .ai/kenkeep/config.yaml.\n'
);
process.exit(2);
