import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { StoredWallet } from './types.js';

const DEFAULT_WALLET_DIR = path.join(os.homedir(), '.portkey', 'eoa', 'wallets');

// aelf addresses are Base58-encoded (1-9, A-Z, a-z excluding 0, O, I, l)
const AELF_ADDRESS_RE = /^[1-9A-HJ-NP-Za-km-z]{30,60}$/;

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
 * Ensure the wallet directory exists with restricted permissions (0700).
 */
function ensureDir(): void {
  const dir = getWalletDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
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
  const filePath = safeWalletPath(address);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

/**
 * Check if a wallet exists locally.
 */
export function walletExists(address: string): boolean {
  return fs.existsSync(safeWalletPath(address));
}
