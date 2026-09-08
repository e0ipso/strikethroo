/**
 * Location of the locally built skill tree.
 *
 * `npm run build` writes bundles, assembled SKILL.md files, and copied
 * references into dist-test/ (gitignored). Suites that execute the bundles or
 * assert on rendered prompts read from here, so a stale build fails them
 * against source that is already correct. Rebuild before running the suite.
 *
 * The tracked root skills/ directory is the released tree and is never read by
 * tests, except by skills-mirror.test.ts, which checks its shape.
 */

import * as path from 'path';

export const REPO_ROOT = path.resolve(__dirname, '..', '..');
export const BUILT_SKILLS_ROOT = path.join(REPO_ROOT, 'dist-test');

export const builtSkillDir = (skill: string): string => path.join(BUILT_SKILLS_ROOT, skill);
