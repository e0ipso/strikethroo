import * as fs from 'fs';
import * as path from 'path';
import { validateComplexityScore } from './complexity-score';
import { readYamlFrontmatter } from './task-frontmatter';

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
    const frontmatter = readYamlFrontmatter(content);
    if (frontmatter.kind !== 'data') {
      invalid.push(
        `${file}: ${frontmatter.kind === 'invalid' ? frontmatter.reason : 'missing complexity_score'}`
      );
      continue;
    }
    if (!Object.prototype.hasOwnProperty.call(frontmatter.data, 'complexity_score')) {
      invalid.push(`${file}: missing complexity_score`);
      continue;
    }
    const raw = frontmatter.data.complexity_score;
    const result = validateComplexityScore(raw);
    if (result.valid) continue;
    if (result.reason === 'non-integer') {
      invalid.push(`${file}: non-integer complexity_score "${String(raw)}"`);
      continue;
    }
    invalid.push(`${file}: complexity_score ${result.value} out of range 1-10`);
  }
  return invalid;
};
