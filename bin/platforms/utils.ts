import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

const PKG_NAME = 'portkey-eoa-agent-skills';

// ============================================================
// Package root detection
// ============================================================

export function getPackageRoot(): string {
  // import.meta.dir is bin/platforms/, go up 2 levels
  return path.resolve(import.meta.dir, '..', '..');
}

export function getMcpServerPath(): string {
  return path.join(getPackageRoot(), 'src', 'mcp', 'server.ts');
}

// ============================================================
// Bun executable detection
// ============================================================

export function getBunPath(): string {
  try {
    const cmd = os.platform() === 'win32' ? 'where bun' : 'which bun';
    const result = Bun.spawnSync(cmd.split(' '));
    const stdout = result.stdout.toString().trim();
    if (stdout) return stdout.split('\n')[0].trim();
  } catch {
    // fallback
  }
  return 'bun';
}

// ============================================================
// Cross-platform config paths
// ============================================================

export function getPlatformPaths() {
  const home = os.homedir();
  const p = os.platform();

  let claude: string;
  if (p === 'darwin') {
    claude = path.join(
      home,
      'Library',
      'Application Support',
      'Claude',
      'claude_desktop_config.json',
    );
  } else if (p === 'win32') {
    claude = path.join(
      process.env.APPDATA || path.join(home, 'AppData', 'Roaming'),
      'Claude',
      'claude_desktop_config.json',
    );
  } else {
    claude = path.join(home, '.config', 'Claude', 'claude_desktop_config.json');
  }

  return {
    claude,
    cursorGlobal: path.join(home, '.cursor', 'mcp.json'),
    cursorProject: path.join(process.cwd(), '.cursor', 'mcp.json'),
  };
}

// ============================================================
// JSON file utilities
// ============================================================

export function readJsonFile(filePath: string): any {
  try {
    if (!fs.existsSync(filePath)) return {};
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return {};
  }
}

export function writeJsonFile(filePath: string, data: any): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(
    filePath,
    JSON.stringify(data, null, 2) + '\n',
    'utf-8',
  );
}

// ============================================================
// MCP config merge (never overwrite other servers)
// ============================================================

export const SERVER_NAME = PKG_NAME;

export function mergeMcpConfig(
  existing: any,
  name: string,
  entry: any,
  force = false,
): { config: any; action: 'created' | 'updated' | 'skipped' } {
  const config = { ...existing };
  if (!config.mcpServers) config.mcpServers = {};

  if (config.mcpServers[name] && !force) {
    return { config, action: 'skipped' };
  }

  const action = config.mcpServers[name] ? 'updated' : 'created';
  config.mcpServers[name] = entry;
  return { config, action };
}

export function removeMcpConfig(
  existing: any,
  name: string,
): { config: any; removed: boolean } {
  const config = { ...existing };
  if (!config.mcpServers || !config.mcpServers[name]) {
    return { config, removed: false };
  }
  delete config.mcpServers[name];
  return { config, removed: true };
}

// ============================================================
// MCP entry generator
// ============================================================

export function generateMcpEntry(customServerPath?: string) {
  return {
    command: getBunPath(),
    args: ['run', customServerPath || getMcpServerPath()],
    env: {
      PORTKEY_PRIVATE_KEY: '<YOUR_PRIVATE_KEY>',
      PORTKEY_NETWORK: 'mainnet',
      PORTKEY_WALLET_PASSWORD: '<YOUR_WALLET_PASSWORD>',
    },
  };
}
