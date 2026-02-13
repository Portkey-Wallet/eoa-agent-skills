import type {
  PortkeyConfig,
  CreateWalletParams,
  CreateWalletResult,
  ImportWalletParams,
  ImportWalletResult,
  GetWalletInfoParams,
  GetWalletInfoResult,
  BackupWalletParams,
  BackupWalletResult,
  StoredWallet,
  WalletPublicInfo,
} from '../../lib/types.js';
import { encrypt, decrypt, generateStrongPassword } from '../../lib/crypto.js';
import {
  saveWallet,
  loadWallet,
  listWallets as listStoredWallets,
  walletExists,
  deleteWallet as deleteStoredWallet,
  getWalletDir,
} from '../../lib/storage.js';
import * as fs from 'fs';
import * as path from 'path';
import {
  createNewWallet,
  getWalletByMnemonic,
  getWallet,
} from '../../lib/aelf.js';

// ============================================================
// createWallet — Generate a new wallet, encrypt, and store locally
// ============================================================

export async function createWallet(
  config: PortkeyConfig,
  params: CreateWalletParams,
): Promise<CreateWalletResult> {
  const { name, redactMnemonic } = params;
  const passwordGenerated = !params.password;
  const password = params.password || generateStrongPassword();

  const walletInfo = createNewWallet();

  const stored: StoredWallet = {
    name: name || `Wallet-${walletInfo.address.slice(0, 8)}`,
    address: walletInfo.address,
    publicKey: extractPublicKey(walletInfo),
    AESEncryptPrivateKey: encrypt(walletInfo.privateKey, password),
    AESEncryptMnemonic: walletInfo.mnemonic
      ? encrypt(walletInfo.mnemonic, password)
      : '',
    createdAt: new Date().toISOString(),
    network: config.network,
  };

  saveWallet(stored);

  const result: CreateWalletResult = {
    address: walletInfo.address,
  };

  // Mnemonic handling: redact or return
  if (redactMnemonic && walletInfo.mnemonic) {
    const savedTo = saveMnemonicToFile(walletInfo.address, walletInfo.mnemonic);
    result.mnemonicSavedTo = savedTo;
  } else {
    result.mnemonic = walletInfo.mnemonic || '';
  }

  // Password: include in result only when auto-generated
  if (passwordGenerated) {
    result.passwordGenerated = true;
    result.password = password;
  }

  return result;
}

// ============================================================
// importWallet — Import from mnemonic or private key
// ============================================================

export async function importWallet(
  config: PortkeyConfig,
  params: ImportWalletParams,
): Promise<ImportWalletResult> {
  const { mnemonic, privateKey, name } = params;
  const passwordGenerated = !params.password;
  const password = params.password || generateStrongPassword();

  if (!mnemonic && !privateKey) {
    throw new Error('Either mnemonic or privateKey is required');
  }

  let walletInfo;
  if (mnemonic) {
    const words = mnemonic.trim().split(/\s+/);
    if (words.length !== 12) {
      throw new Error('Mnemonic must be exactly 12 words');
    }
    walletInfo = getWalletByMnemonic(mnemonic.trim());
  } else {
    const pk = privateKey!.replace(/^0x/, '');
    if (!/^[0-9a-fA-F]{64}$/.test(pk)) {
      throw new Error('Private key must be 64 hex characters');
    }
    walletInfo = getWallet(pk);
  }

  if (walletExists(walletInfo.address)) {
    throw new Error(`Wallet already exists: ${walletInfo.address}`);
  }

  const stored: StoredWallet = {
    name: name || `Imported-${walletInfo.address.slice(0, 8)}`,
    address: walletInfo.address,
    publicKey: extractPublicKey(walletInfo),
    AESEncryptPrivateKey: encrypt(walletInfo.privateKey, password),
    AESEncryptMnemonic: mnemonic ? encrypt(mnemonic.trim(), password) : '',
    createdAt: new Date().toISOString(),
    network: config.network,
  };

  saveWallet(stored);

  const result: ImportWalletResult = { address: walletInfo.address };
  if (passwordGenerated) {
    result.passwordGenerated = true;
    result.password = password;
  }
  return result;
}

// ============================================================
// getWalletInfo — Get wallet public info (no secrets)
// ============================================================

export async function getWalletInfo(
  _config: PortkeyConfig,
  params: GetWalletInfoParams,
): Promise<GetWalletInfoResult> {
  const stored = loadWallet(params.address);
  return {
    address: stored.address,
    publicKey: stored.publicKey,
    name: stored.name,
    network: stored.network,
    createdAt: stored.createdAt,
  };
}

// ============================================================
// listWallets — List all local wallets (public info only, sanitized)
// ============================================================

export async function listWallets(
  _config: PortkeyConfig,
): Promise<WalletPublicInfo[]> {
  return listStoredWallets().map((w) => ({
    address: w.address,
    publicKey: w.publicKey,
    name: w.name,
    network: w.network,
    createdAt: w.createdAt,
  }));
}

// ============================================================
// deleteWallet — Remove a locally stored wallet
// ============================================================

export async function deleteWalletByAddress(
  _config: PortkeyConfig,
  params: { address: string; password: string },
): Promise<{ address: string; deleted: boolean }> {
  const { address, password } = params;
  if (!password) throw new Error('password is required');

  // Verify password is correct before deleting
  const stored = loadWallet(address);
  decrypt(stored.AESEncryptPrivateKey, password);

  deleteStoredWallet(address);
  return { address, deleted: true };
}

// ============================================================
// backupWallet — Export mnemonic / private key (dangerous)
// ============================================================

export async function backupWallet(
  _config: PortkeyConfig,
  params: BackupWalletParams,
): Promise<BackupWalletResult> {
  const { address, password } = params;
  if (!password) throw new Error('password is required');

  const stored = loadWallet(address);
  const privateKey = decrypt(stored.AESEncryptPrivateKey, password);

  let mnemonic: string | undefined;
  if (stored.AESEncryptMnemonic) {
    mnemonic = decrypt(stored.AESEncryptMnemonic, password);
  }

  return { privateKey, mnemonic };
}

// ============================================================
// resolvePrivateKey — Get private key from params (direct or wallet file)
// ============================================================

export function resolvePrivateKey(params: {
  privateKey?: string;
  address?: string;
  password?: string;
}): string {
  // 1. Direct private key from params
  if (params.privateKey) return params.privateKey;

  // 2. From environment variable
  if (process.env.PORTKEY_PRIVATE_KEY) return process.env.PORTKEY_PRIVATE_KEY;

  // 3. From local wallet file
  if (params.address) {
    const password = params.password || process.env.PORTKEY_WALLET_PASSWORD;
    if (!password) {
      throw new Error(
        'password is required to decrypt local wallet (set PORTKEY_WALLET_PASSWORD env or pass password param)',
      );
    }
    const stored = loadWallet(params.address);
    return decrypt(stored.AESEncryptPrivateKey, password);
  }

  throw new Error(
    'No private key available. Provide privateKey, or address+password, or set PORTKEY_PRIVATE_KEY env.',
  );
}

// ============================================================
// Helpers
// ============================================================

function extractPublicKey(walletInfo: any): { x: string; y: string } {
  try {
    const pub = walletInfo.keyPair.getPublic();
    return { x: pub.x.toString('hex'), y: pub.y.toString('hex') };
  } catch {
    return { x: '', y: '' };
  }
}

/**
 * Save mnemonic to a local file (for redactMnemonic mode).
 * File is written with 0600 permissions and stored alongside wallet files.
 */
function saveMnemonicToFile(address: string, mnemonic: string): string {
  const dir = path.join(getWalletDir(), '..', 'mnemonics');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  }
  const filePath = path.join(dir, `${address}.txt`);
  fs.writeFileSync(
    filePath,
    `# Mnemonic for ${address}\n# Created: ${new Date().toISOString()}\n# DELETE THIS FILE after you have safely backed up the mnemonic.\n\n${mnemonic}\n`,
    { encoding: 'utf-8', mode: 0o600 },
  );
  return filePath;
}
