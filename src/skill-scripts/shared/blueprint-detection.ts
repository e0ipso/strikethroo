import * as fs from 'fs';

export const hasExecutionBlueprint = (planFile: string): boolean => {
  try {
    const content = fs.readFileSync(planFile, 'utf8');
    return /^## Execution Blueprint/m.test(content);
  } catch (_err) {
    return false;
  }
};
