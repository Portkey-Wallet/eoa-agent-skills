#!/usr/bin/env bun
import { Command } from 'commander';
import { setupClaude, uninstallClaude } from './platforms/claude.js';
import { setupCursor, uninstallCursor } from './platforms/cursor.js';
import { setupOpenclaw } from './platforms/openclaw.js';
import {
  getPlatformPaths,
  readJsonFile,
  SERVER_NAME,
} from './platforms/utils.js';
import * as fs from 'fs';

const program = new Command();

program
  .name('portkey-setup')
  .description('Configure Portkey EOA Agent Skills for AI platforms');

// ============================================================
// Claude Desktop
// ============================================================

program
  .command('claude')
  .description('Add MCP server to Claude Desktop config')
  .option('--config-path <path>', 'Custom config file path')
  .option('--server-path <path>', 'Custom MCP server entry point')
  .option('--force', 'Overwrite existing entry')
  .action((opts) => {
    setupClaude(opts);
  });

// ============================================================
// Cursor
// ============================================================

program
  .command('cursor')
  .description('Add MCP server to Cursor config')
  .option('--global', 'Write to global config instead of project-level')
  .option('--config-path <path>', 'Custom config file path')
  .option('--server-path <path>', 'Custom MCP server entry point')
  .option('--force', 'Overwrite existing entry')
  .action((opts) => {
    setupCursor(opts);
  });

// ============================================================
// OpenClaw
// ============================================================

program
  .command('openclaw')
  .description('Generate OpenClaw tool configuration')
  .option('--config-path <path>', 'Merge into existing config file')
  .option('--cwd <dir>', 'Override working directory in config')
  .option('--force', 'Overwrite existing tools')
  .action((opts) => {
    setupOpenclaw(opts);
  });

// ============================================================
// List — show current config status
// ============================================================

program
  .command('list')
  .description('Show configuration status for all platforms')
  .action(() => {
    const paths = getPlatformPaths();

    console.log('Platform Configuration Status:\n');

    // Claude
    const claudeExists = fs.existsSync(paths.claude);
    const claudeConfig = claudeExists ? readJsonFile(paths.claude) : null;
    const claudeHasServer = claudeConfig?.mcpServers?.[SERVER_NAME];
    console.log(
      `  Claude Desktop: ${claudeHasServer ? 'CONFIGURED' : claudeExists ? 'NOT CONFIGURED' : 'CONFIG FILE NOT FOUND'}`,
    );
    console.log(`    Path: ${paths.claude}\n`);

    // Cursor Global
    const cursorGlobalExists = fs.existsSync(paths.cursorGlobal);
    const cursorGlobalConfig = cursorGlobalExists
      ? readJsonFile(paths.cursorGlobal)
      : null;
    const cursorGlobalHasServer =
      cursorGlobalConfig?.mcpServers?.[SERVER_NAME];
    console.log(
      `  Cursor (global): ${cursorGlobalHasServer ? 'CONFIGURED' : cursorGlobalExists ? 'NOT CONFIGURED' : 'CONFIG FILE NOT FOUND'}`,
    );
    console.log(`    Path: ${paths.cursorGlobal}\n`);

    // Cursor Project
    const cursorProjectExists = fs.existsSync(paths.cursorProject);
    const cursorProjectConfig = cursorProjectExists
      ? readJsonFile(paths.cursorProject)
      : null;
    const cursorProjectHasServer =
      cursorProjectConfig?.mcpServers?.[SERVER_NAME];
    console.log(
      `  Cursor (project): ${cursorProjectHasServer ? 'CONFIGURED' : cursorProjectExists ? 'NOT CONFIGURED' : 'CONFIG FILE NOT FOUND'}`,
    );
    console.log(`    Path: ${paths.cursorProject}`);
  });

// ============================================================
// Uninstall
// ============================================================

program
  .command('uninstall <platform>')
  .description('Remove configuration for a platform (claude, cursor)')
  .option('--global', 'For cursor: uninstall from global config')
  .option('--config-path <path>', 'Custom config file path')
  .action((platform, opts) => {
    switch (platform) {
      case 'claude':
        uninstallClaude(opts);
        break;
      case 'cursor':
        uninstallCursor(opts);
        break;
      default:
        console.error(`Unknown platform: ${platform}`);
        process.exit(1);
    }
  });

program.parse();
