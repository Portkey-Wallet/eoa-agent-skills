import * as path from 'path';
import * as fs from 'fs';
import {
  getPackageRoot,
  readJsonFile,
  writeJsonFile,
} from './utils.js';

export function setupOpenclaw(opts: {
  configPath?: string;
  cwd?: string;
  force?: boolean;
}) {
  const pkgRoot = getPackageRoot();
  const openclawSrc = path.join(pkgRoot, 'openclaw.json');

  if (!fs.existsSync(openclawSrc)) {
    console.log('[ERROR] openclaw.json not found in package root');
    return;
  }

  const openclawConfig = readJsonFile(openclawSrc);

  // Replace cwd placeholder if specified
  if (opts.cwd) {
    if (openclawConfig.tools) {
      for (const tool of openclawConfig.tools) {
        if (tool.cwd) tool.cwd = opts.cwd;
      }
    }
  }

  if (opts.configPath) {
    // Merge into existing config
    const existing = readJsonFile(opts.configPath);
    if (!existing.tools) existing.tools = [];

    const existingNames = new Set(
      existing.tools.map((t: any) => t.name),
    );
    let added = 0;
    for (const tool of openclawConfig.tools || []) {
      if (existingNames.has(tool.name) && !opts.force) continue;
      existing.tools = existing.tools.filter(
        (t: any) => t.name !== tool.name,
      );
      existing.tools.push(tool);
      added++;
    }

    writeJsonFile(opts.configPath, existing);
    console.log(`[DONE] Merged ${added} tools into ${opts.configPath}`);
  } else {
    // Just output the config
    console.log(JSON.stringify(openclawConfig, null, 2));
  }
}
