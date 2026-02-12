import {
  getPlatformPaths,
  readJsonFile,
  writeJsonFile,
  mergeMcpConfig,
  removeMcpConfig,
  generateMcpEntry,
  SERVER_NAME,
} from './utils.js';

export function setupCursor(opts: {
  global?: boolean;
  configPath?: string;
  serverPath?: string;
  force?: boolean;
}) {
  const paths = getPlatformPaths();
  const configPath =
    opts.configPath || (opts.global ? paths.cursorGlobal : paths.cursorProject);
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
  const scope = opts.global ? 'global' : 'project-level';
  console.log(
    `[${action.toUpperCase()}] Cursor ${scope} config → ${configPath}`,
  );
  console.log(
    '\nRemember to replace <YOUR_PRIVATE_KEY> and <YOUR_WALLET_PASSWORD> in the config.',
  );
}

export function uninstallCursor(opts: {
  global?: boolean;
  configPath?: string;
}) {
  const paths = getPlatformPaths();
  const configPath =
    opts.configPath || (opts.global ? paths.cursorGlobal : paths.cursorProject);
  const existing = readJsonFile(configPath);
  const { config, removed } = removeMcpConfig(existing, SERVER_NAME);

  if (!removed) {
    console.log(`[SKIP] "${SERVER_NAME}" not found in ${configPath}`);
    return;
  }

  writeJsonFile(configPath, config);
  console.log(`[REMOVED] "${SERVER_NAME}" from ${configPath}`);
}
