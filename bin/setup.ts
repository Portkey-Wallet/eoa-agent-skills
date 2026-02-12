#!/usr/bin/env bun
import { Command } from 'commander';
import { setupClaude, uninstallClaude } from './platforms/claude.js';
import { setupCursor, uninstallCursor } from './platforms/cursor.js';
import { setupOpenclaw } from './platforms/openclaw.js';
import {
  getPackageRoot,
  getPlatformPaths,
  readJsonFile,
  writeJsonFile,
  SERVER_NAME,
} from './platforms/utils.js';
import * as fs from 'fs';
import * as path from 'path';

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
    console.log(`    Path: ${paths.cursorProject}\n`);

    // OpenClaw
    const openclawPath = path.join(getPackageRoot(), 'openclaw.json');
    const openclawExists = fs.existsSync(openclawPath);
    const openclawConfig = openclawExists ? readJsonFile(openclawPath) : null;
    const toolCount = openclawConfig?.tools?.length ?? 0;
    console.log(
      `  OpenClaw: ${openclawExists ? `AVAILABLE (${toolCount} tools)` : 'openclaw.json NOT FOUND'}`,
    );
    console.log(`    Path: ${openclawPath}`);
    if (openclawExists) {
      console.log(
        `    Usage: bun run bin/setup.ts openclaw --config-path <your-openclaw-config>`,
      );
    }
  });

// ============================================================
// Uninstall
// ============================================================

program
  .command('uninstall <platform>')
  .description('Remove configuration for a platform (claude, cursor, openclaw)')
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
      case 'openclaw':
        if (!opts.configPath) {
          console.log(
            '[INFO] OpenClaw tools are merged into external config files.',
          );
          console.log(
            '       Provide --config-path to remove portkey tools from a specific file.',
          );
          return;
        }
        try {
          const config = readJsonFile(opts.configPath);
          if (!config.tools || !Array.isArray(config.tools)) {
            console.log('[INFO] No tools found in config file.');
            return;
          }
          const before = config.tools.length;
          config.tools = config.tools.filter(
            (t: any) => !t.name?.startsWith('portkey-eoa-'),
          );
          const removed = before - config.tools.length;
          if (removed > 0) {
            writeJsonFile(opts.configPath, config);
            console.log(
              `[DONE] Removed ${removed} portkey tools from ${opts.configPath}`,
            );
          } else {
            console.log('[INFO] No portkey tools found in config file.');
          }
        } catch (err: any) {
          console.error(`[ERROR] ${err.message}`);
        }
        break;
      default:
        console.error(`Unknown platform: ${platform}. Supported: claude, cursor, openclaw`);
        process.exit(1);
    }
  });

program.parse();
