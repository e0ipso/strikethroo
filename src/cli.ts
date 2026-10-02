#!/usr/bin/env node
/**
 * CLI Entry Point
 *
 * This file contains the main CLI setup using Commander.js
 * Handles command-line argument parsing and routing to appropriate handlers
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { isIP } from 'net';
import { init } from './index';
import { InitOptions, UpdateOptions } from './types';
import { resolveWorkspaceRoot, isResolveError } from './serve/root';
import { startServer, defaultAssetsDir } from './serve/server';
import { exportProfile } from './export-profile';
import { validateWorkspace } from './validation/workspace';
import { Finding } from './validation/types';
import { update } from './update';

const program = new Command();

program.name('strikethroo').version('0.1.0').description('AI-powered task management CLI tool');

program
  .command('init')
  .description('Initialize a new Strikethroo project')
  .option(
    '--harnesses <value>',
    'Comma-separated list of harnesses to configure (claude,codex,cursor,gemini,copilot,opencode). Omitted on re-init reuses the saved selection.'
  )
  .option(
    '--destination-directory <path>',
    'Directory to create project structure in (default: current directory)'
  )
  .option('--force', 'Force overwrite all files without prompting')
  .option(
    '--profile <value>',
    'Strikethroo profile to import: local folder, <user>/<repo> GitHub shorthand, or full git URL'
  )
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
  .command('update')
  .description('Refresh an initialized workspace and update installed Strikethroo workflow skills')
  .option(
    '--harnesses <value>',
    'Comma-separated list of harnesses to configure (claude,codex,cursor,gemini,copilot,opencode). Omitted reuses the saved selection.'
  )
  .option(
    '--destination-directory <path>',
    'Directory containing the initialized workspace (default: current directory)'
  )
  .option('--force', 'Force overwrite all files without prompting')
  .option(
    '--profile <value>',
    'Strikethroo profile to import: local folder, <user>/<repo> GitHub shorthand, or full git URL'
  )
  .action(async (options: UpdateOptions) => {
    try {
      const result = await update(options);
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      console.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

const exportCommand = program
  .command('export')
  .description('Export workspace artifacts for reuse elsewhere');

exportCommand
  .command('profile')
  .description('Package the workspace configuration as a strikethroo profile')
  .requiredOption(
    '--destination-directory <dir>',
    'Directory to write the strikethroo profile package into (must be missing or empty)'
  )
  .action(async (options: { destinationDirectory: string }) => {
    try {
      const result = await exportProfile({ destinationDirectory: options.destinationDirectory });
      process.exit(result.success ? 0 : 1);
    } catch (error) {
      console.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

program
  .command('serve')
  .description('Serve the workspace as a local web app (static SPA, JSON API, SSE change stream)')
  .option('--host <ip>', 'IP address to bind (0.0.0.0 or :: for all interfaces)', '127.0.0.1')
  .option('--port <n>', 'port to bind', '4317')
  .option('--no-open', 'do not open the browser on start')
  .option('--workspace <path>', 'override workspace root discovery')
  .action(async (opts: { host: string; port: string; open: boolean; workspace?: string }) => {
    try {
      if (isIP(opts.host) === 0) {
        console.error(
          `Invalid --host "${opts.host}": use an IP address such as 127.0.0.1, 0.0.0.0, or ::.`
        );
        process.exit(1);
      }
      const resolved = resolveWorkspaceRoot({ workspace: opts.workspace });
      if (isResolveError(resolved)) {
        console.error(resolved.error);
        process.exit(1);
      }

      const handle = await startServer({
        root: resolved.root,
        host: opts.host,
        port: Number(opts.port),
        open: opts.open,
        assetsDir: defaultAssetsDir(),
      });
      console.log(`Serving ${handle.url}`);
      if (handle.exposed) {
        console.error(
          chalk.yellow.bold('\nWarning: the viewer is reachable from the network.\n') +
            chalk.yellow(
              'Anyone who can reach this address and port can read the workspace and edit its\n' +
                'hooks, templates, and config.yaml, which agents run with their permissions.\n' +
                'Use it only on a trusted network, such as a VM host-only bridge.\n' +
                `Reachable at: ${handle.reachableUrls.join(', ')}\n`
            )
        );
      }
    } catch (error) {
      console.error(
        `Failed to start serve: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exit(1);
    }
  });

/** One human-readable line per finding: check, path when present, message. */
const formatFinding = (finding: Finding): string =>
  `${finding.check}  ${finding.path ? `${finding.path}: ` : ''}${finding.message}`;

program
  .command('validate')
  .description('Check the workspace for internal inconsistencies (read-only)')
  .option('--workspace <path>', 'override workspace root discovery')
  .option('--json', 'emit the findings report as JSON on stdout')
  .action((opts: { workspace?: string; json?: boolean }) => {
    try {
      const resolved = resolveWorkspaceRoot({ workspace: opts.workspace });
      if (isResolveError(resolved)) {
        console.error(resolved.error);
        process.exit(1);
      }

      const result = validateWorkspace(resolved.root);

      if (opts.json) {
        // Nothing decorative may join this stream: CI parses stdout whole.
        console.log(JSON.stringify(result, null, 2));
      } else if (result.findings.length === 0) {
        console.log('No findings. Workspace is consistent.');
      } else {
        for (const finding of result.findings) {
          console.log(formatFinding(finding));
        }
        console.log(
          `\n${result.findings.length} finding${result.findings.length === 1 ? '' : 's'}.`
        );
      }

      // Every finding is an error, so emptiness is the whole exit rule.
      process.exit(result.findings.length > 0 ? 1 : 0);
    } catch (error) {
      console.error(
        `Failed to validate workspace: ${error instanceof Error ? error.message : String(error)}`
      );
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
