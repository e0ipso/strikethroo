#!/usr/bin/env node
/**
 * CLI Entry Point
 *
 * This file contains the main CLI setup using Commander.js
 * Handles command-line argument parsing and routing to appropriate handlers
 */

import { Command } from 'commander';
import { init } from './index';
import { InitOptions } from './types';

const program = new Command();

program.name('strikethroo').version('0.1.0').description('AI-powered task management CLI tool');

program
  .command('init')
  .description('Initialize a new Strikethroo project')
  .requiredOption(
    '--harnesses <value>',
    'Comma-separated list of harnesses to configure (claude,codex,cursor,gemini,github,opencode)'
  )
  .option(
    '--destination-directory <path>',
    'Directory to create project structure in (default: current directory)'
  )
  .option('--force', 'Force overwrite all files without prompting')
  .action(async (options: InitOptions) => {
    try {
      // Execute the init command
      const result = await init(options);

      // Exit with appropriate code based on result
      if (result.success) {
        process.exit(0);
      } else {
        process.exit(1);
      }
    } catch (error) {
      console.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Error handling for unknown commands
program.on('command:*', async operands => {
  console.error(`Unknown command: ${operands[0]}`);
  console.log('Use --help to see available commands');
  process.exit(1);
});

// Parse command line arguments
program.parse();

// If no arguments provided, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
  process.exit(0);
}
