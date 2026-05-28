import { findStrikethrooRoot } from './shared/root';

const main = (): void => {
  const startPath = process.argv[2] || process.cwd();
  const root = findStrikethrooRoot(startPath);
  if (!root) {
    process.stderr.write(
      `Could not find .ai/strikethroo root from ${startPath} or any parent directory.\n`
    );
    process.exit(1);
  }
  process.stdout.write(`${root}\n`);
  process.exit(0);
};

if (require.main === module) {
  main();
}

export { main };
