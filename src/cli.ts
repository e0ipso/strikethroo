#!/usr/bin/env node
/**
 * CLI Entry Point
 *
 * This file contains the main CLI setup using Commander.js
 * Handles command-line argument parsing and routing to appropriate handlers
 */

import { Command } from 'commander';
import { init } from './index';
import { status } from './status';
import { showPlan, archivePlan, deletePlan } from './plan';
import { InitOptions } from './types';

const program = new Command();

program.name('ai-task-manager').version('0.1.0').description('AI-powered task management CLI tool');

program
  .command('init')
  .description('Initialize a new AI task management project')
  .requiredOption(
    '--assistants <value>',
    'Comma-separated list of assistants to configure (claude,gemini,opencode)'
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

program
  .command('status')
  .description('Display dashboard with plans and task statistics')
  .action(async () => {
    try {
      const result = await status();

      if (result.success) {
        process.exit(0);
      } else {
        if (result.message) {
          console.error(result.message);
        }
        process.exit(1);
      }
    } catch (error) {
      console.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Create parent plan command for help organization
const planCommand = program
  .command('plan')
  .description('Display and manage plans. Use `plan <id>` as shorthand for `plan show <id>`.');

// Plan show subcommand
planCommand
  .command('show <plan-id>')
  .description('Display plan metadata, progress, and executive summary')
  .action(async (planId: string) => {
    try {
      const planIdNum = parseInt(planId, 10);
      if (isNaN(planIdNum)) {
        console.error(`Invalid plan ID: ${planId}. Must be a number.`);
        process.exit(1);
      }

      const result = await showPlan(planIdNum);

      if (result.success) {
        process.exit(0);
      } else {
        if (result.message) {
          console.error(result.message);
        }
        process.exit(1);
      }
    } catch (error) {
      console.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Plan archive subcommand
planCommand
  .command('archive <plan-id>')
  .description('Move a plan from active to archive directory')
  .action(async (planId: string) => {
    try {
      const planIdNum = parseInt(planId, 10);
      if (isNaN(planIdNum)) {
        console.error(`Invalid plan ID: ${planId}. Must be a number.`);
        process.exit(1);
      }

      const result = await archivePlan(planIdNum);

      if (result.success) {
        process.exit(0);
      } else {
        if (result.message) {
          console.error(result.message);
        }
        process.exit(1);
      }
    } catch (error) {
      console.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Plan delete subcommand
planCommand
  .command('delete <plan-id>')
  .description('Permanently delete a plan and all its tasks')
  .action(async (planId: string) => {
    try {
      const planIdNum = parseInt(planId, 10);
      if (isNaN(planIdNum)) {
        console.error(`Invalid plan ID: ${planId}. Must be a number.`);
        process.exit(1);
      }

      const result = await deletePlan(planIdNum);

      if (result.success) {
        process.exit(0);
      } else {
        if (result.message) {
          console.error(result.message);
        }
        process.exit(1);
      }
    } catch (error) {
      console.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Backward compatibility: plan <id> as shorthand for plan show <id>
planCommand
  .argument('[plan-id]', 'Plan ID to display (shorthand for show subcommand)')
  .action(async (planId?: string) => {
    // Only handle if planId is provided and no subcommand was matched
    if (planId) {
      try {
        const planIdNum = parseInt(planId, 10);
        if (isNaN(planIdNum)) {
          console.error(`Invalid plan ID: ${planId}. Must be a number.`);
          process.exit(1);
        }

        const result = await showPlan(planIdNum);

        if (result.success) {
          process.exit(0);
        } else {
          if (result.message) {
            console.error(result.message);
          }
          process.exit(1);
        }
      } catch (error) {
        console.error(
          `Unexpected error: ${error instanceof Error ? error.message : String(error)}`
        );
        process.exit(1);
      }
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
