#!/usr/bin/env node
// kk-detect-root: resolves the project root containing .ai/kenkeep.
// Shared by the kk skills (they invoke it as
// `node .ai/kenkeep/scripts/kk-detect-root.mjs`, mirroring kk-detect-harness.mjs)
// so the 33-line root-detection heredoc lives in exactly one place. Walks up
// from the current working directory and prints the first ancestor that
// contains a `.ai/kenkeep` directory, or exits non-zero when none is found.
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
let dir = process.cwd();
while (true) {
  if (existsSync(join(dir, '.ai', 'kenkeep'))) {
    process.stdout.write(dir);
    process.exit(0);
  }
  const parent = dirname(dir);
  if (parent === dir) {
    process.stderr.write('kk-detect-root: no .ai/kenkeep found in this directory or its parents.\n');
    process.exit(2);
  }
  dir = parent;
}
