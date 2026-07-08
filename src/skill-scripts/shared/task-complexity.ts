import * as fs from 'fs';
import * as path from 'path';
import { validateComplexityScore } from './complexity-score';
import { extractFrontmatter } from './task-file';

export const validateTaskComplexityScores = (planDir: string): string[] => {
  const tasksDir = path.join(planDir, 'tasks');
  if (!fs.existsSync(tasksDir)) return [];
  let files: string[];
  try {
    if (!fs.lstatSync(tasksDir).isDirectory()) return [];
    files = fs
      .readdirSync(tasksDir)
      .filter(f => f.endsWith('.md'))
      .sort();
  } catch (_err) {
    return [];
  }

  const invalid: string[] = [];
  for (const file of files) {
    let content: string;
    try {
      content = fs.readFileSync(path.join(tasksDir, file), 'utf8');
    } catch (_err) {
      invalid.push(`${file}: unreadable`);
      continue;
    }
    const frontmatter = extractFrontmatter(content);
    const match = frontmatter
      ? frontmatter.match(/^\s*complexity_score\s*:\s*(.*?)\s*(?:#.*)?$/im)
      : null;
    if (!match || match[1] === undefined) {
      invalid.push(`${file}: missing complexity_score`);
      continue;
    }

    const raw = match[1].trim();
    const result = validateComplexityScore(raw);
    if (result.valid) continue;
    if (result.reason === 'non-integer') {
      invalid.push(`${file}: non-integer complexity_score "${raw}"`);
      continue;
    }
    invalid.push(`${file}: complexity_score ${result.value} out of range 1-10`);
  }
  return invalid;
};
