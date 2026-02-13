import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { StoredWallet } from './types.js';

const DEFAULT_WALLET_DIR = path.join(os.homedir(), '.portkey', 'eoa', 'wallets');

// Legacy directories from previous versions (newest first)
const LEGACY_WALLET_DIRS = [
  path.join(os.homedir(), '.portkey-eoa', 'wallets'),
  path.join(os.homedir(), '.portkey-agent', 'wallets'),
];

// aelf addresses are Base58-encoded (1-9, A-Z, a-z excluding 0, O, I, l)
const AELF_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{30,60}$/;

let migrationChecked = false;

/** Reset migration flag (for testing only). */
export function _resetMigrationFlag(): void {
  migrationChecked = false;
}

/**
 * Get the wallet storage directory.
 * Priority: PORTKEY_WALLET_DIR env > default ~/.portkey/eoa/wallets/
 */
export function getWalletDir(): string {
  return process.env.PORTKEY_WALLET_DIR || DEFAULT_WALLET_DIR;
}

/**
 * Validate an address string and return a safe absolute file path.
 * Prevents path traversal attacks by:
 *  1. Checking the address matches the Base58 character set
 *  2. Verifying the resolved path stays inside the wallet directory
 */
function safeWalletPath(address: string): string {
  if (!address || !AELF_ADDRESS_RE.test(address)) {
    throw new Error(`Invalid address format: ${address}`);
  }
  const dir = path.resolve(getWalletDir());
  const resolved = path.resolve(dir, `${address}.json`);
  if (!resolved.startsWith(dir + path.sep) && resolved !== dir) {
    throw new Error('Path traversal detected');
  }
  return resolved;
}

/**
 * Auto-migrate wallet files from legacy directories to the current directory.
 * Only runs once per process. Copies (does not delete) files from old locations.
 * Skips files that already exist in the new directory (no overwrite).
 */
function migrateFromLegacy(): void {
  if (migrationChecked) return;
  migrationChecked = true;

  // Skip migration if user overrode the directory via env
  if (process.env.PORTKEY_WALLET_DIR) return;

  const targetDir = getWalletDir();

  for (const legacyDir of LEGACY_WALLET_DIRS) {
    if (!fs.existsSync(legacyDir)) continue;

    const files = fs.readdirSync(legacyDir).filter((f) => f.endsWith('.json'));
    if (files.length === 0) continue;

    // Ensure target exists before copying
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true, mode: 0o700 });
    }

    let migrated = 0;
    for (const file of files) {
      const dest = path.join(targetDir, file);
      if (fs.existsSync(dest)) continue; // don't overwrite
      const src = path.join(legacyDir, file);
      fs.copyFileSync(src, dest);
      fs.chmodSync(dest, 0o600);
      migrated++;
    }

    if (migrated > 0) {
      console.error(
        `[portkey] Migrated ${migrated} wallet(s) from ${legacyDir} → ${targetDir}`,
      );
    }
  }
}

/**
 * Ensure the wallet directory exists with restricted permissions (0700).
 * On first call, also checks for legacy directories and auto-migrates.
 */
function ensureDir(): void {
  const dir = getWalletDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  migrateFromLegacy();
}

/**
 * Save a wallet to local storage (encrypted JSON file, mode 0600).
 */
export function saveWallet(wallet: StoredWallet): void {
  ensureDir();
  const filePath = safeWalletPath(wallet.address);
  fs.writeFileSync(filePath, JSON.stringify(wallet, null, 2) + '\n', {
    encoding: 'utf-8',
    mode: 0o600,
  });
}

/**
 * Load a wallet from local storage by address.
 */
export function loadWallet(address: string): StoredWallet {
  ensureDir();
  const filePath = safeWalletPath(address);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Wallet not found: ${address}`);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as StoredWallet;
}

/**
 * List all locally stored wallets.
 * Returns full StoredWallet objects (internal use).
 * Use core/wallet.ts listWallets() for public-facing sanitized output.
 */
export function listWallets(): StoredWallet[] {
  ensureDir();
  const dir = getWalletDir();
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  return files.map((f) => {
    const content = fs.readFileSync(path.join(dir, f), 'utf-8');
    return JSON.parse(content) as StoredWallet;
  });
}

/**
 * Delete a wallet file by address.
 */
export function deleteWallet(address: string): void {
  ensureDir();
  const filePath = safeWalletPath(address);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

/**
 * Check if a wallet exists locally.
 */
export function walletExists(address: string): boolean {
  ensureDir();
  return fs.existsSync(safeWalletPath(address));
}
