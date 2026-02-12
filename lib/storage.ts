import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { StoredWallet } from './types.js';

const DEFAULT_WALLET_DIR = path.join(os.homedir(), '.portkey-agent', 'wallets');

/**
 * Get the wallet storage directory.
 * Priority: PORTKEY_WALLET_DIR env > default ~/.portkey-agent/wallets/
 */
export function getWalletDir(): string {
  return process.env.PORTKEY_WALLET_DIR || DEFAULT_WALLET_DIR;
}

/**
 * Ensure the wallet directory exists.
 */
function ensureDir(): void {
  const dir = getWalletDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Get the file path for a wallet by address.
 */
function walletPath(address: string): string {
  return path.join(getWalletDir(), `${address}.json`);
}

/**
 * Save a wallet to local storage (encrypted JSON file).
 */
export function saveWallet(wallet: StoredWallet): void {
  ensureDir();
  const filePath = walletPath(wallet.address);
  fs.writeFileSync(filePath, JSON.stringify(wallet, null, 2) + '\n', 'utf-8');
}

/**
 * Load a wallet from local storage by address.
 */
export function loadWallet(address: string): StoredWallet {
  const filePath = walletPath(address);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Wallet not found: ${address}`);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content) as StoredWallet;
}

/**
 * List all locally stored wallets (public info only).
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
  const filePath = walletPath(address);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

/**
 * Check if a wallet exists locally.
 */
export function walletExists(address: string): boolean {
  return fs.existsSync(walletPath(address));
}
