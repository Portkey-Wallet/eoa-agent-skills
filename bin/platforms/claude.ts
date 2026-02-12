import {
  getPlatformPaths,
  readJsonFile,
  writeJsonFile,
  mergeMcpConfig,
  removeMcpConfig,
  generateMcpEntry,
  SERVER_NAME,
} from './utils.js';

export function setupClaude(opts: {
  configPath?: string;
  serverPath?: string;
  force?: boolean;
}) {
  const paths = getPlatformPaths();
  const configPath = opts.configPath || paths.claude;
  const existing = readJsonFile(configPath);
  const entry = generateMcpEntry(opts.serverPath);
  const { config, action } = mergeMcpConfig(
    existing,
    SERVER_NAME,
    entry,
    opts.force,
  );

  if (action === 'skipped') {
    console.log(
      `[SKIP] "${SERVER_NAME}" already exists in ${configPath}. Use --force to overwrite.`,
    );
    return;
  }

  writeJsonFile(configPath, config);
  console.log(`[${action.toUpperCase()}] Claude Desktop config → ${configPath}`);
  console.log(
    '\nRemember to replace <YOUR_PRIVATE_KEY> and <YOUR_WALLET_PASSWORD> in the config.',
  );
}

export function uninstallClaude(opts: { configPath?: string }) {
  const paths = getPlatformPaths();
  const configPath = opts.configPath || paths.claude;
  const existing = readJsonFile(configPath);
  const { config, removed } = removeMcpConfig(existing, SERVER_NAME);

  if (!removed) {
    console.log(`[SKIP] "${SERVER_NAME}" not found in ${configPath}`);
    return;
  }

  writeJsonFile(configPath, config);
  console.log(`[REMOVED] "${SERVER_NAME}" from ${configPath}`);
}
