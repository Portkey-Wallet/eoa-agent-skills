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
import {
  createNewWallet,
  getWalletByMnemonic,
  getWallet,
} from '../../lib/aelf.js';
import {
  getActiveWalletProfile,
  setActiveWalletProfile,
  type ActiveWalletProfile,
  type SignerContextInput,
} from '../../lib/wallet-context.js';
import * as path from 'node:path';

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
  setActiveWalletProfile(
    {
      walletType: 'EOA',
      source: 'eoa-local',
      network: config.network,
      address: walletInfo.address,
      walletFile: path.join(getWalletDir(), `${walletInfo.address}.json`),
    },
    {
      skill: 'portkey-eoa',
      version: process.env.npm_package_version || '0.0.0',
    },
  );

  const result: CreateWalletResult = {
    address: walletInfo.address,
  };

  // Mnemonic handling: redact or return
  // When redacted, mnemonic is NOT returned — it's already AES-encrypted in the wallet file
  // and can be recovered via `wallet backup --address <addr> --password <pwd>`
  if (redactMnemonic) {
    result.mnemonicHint =
      'Mnemonic is encrypted and stored in your wallet file. ' +
      'To recover it, run: wallet backup --address ' +
      walletInfo.address +
      ' --password <your_password>';
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
  setActiveWalletProfile(
    {
      walletType: 'EOA',
      source: 'eoa-local',
      network: config.network,
      address: walletInfo.address,
      walletFile: path.join(getWalletDir(), `${walletInfo.address}.json`),
    },
    {
      skill: 'portkey-eoa',
      version: process.env.npm_package_version || '0.0.0',
    },
  );

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

type ResolvePrivateKeyParams = {
  privateKey?: string;
  address?: string;
  password?: string;
  signerMode?: SignerContextInput['signerMode'];
};

function resolveExplicitPrivateKey(params: ResolvePrivateKeyParams): string | null {
  if (params.privateKey) return params.privateKey;
  if (!params.address) return null;
  const password = params.password || process.env.PORTKEY_WALLET_PASSWORD;
  if (!password) {
    throw new Error(
      'SIGNER_PASSWORD_REQUIRED: password is required for explicit wallet address (set PORTKEY_WALLET_PASSWORD env or pass password param)',
    );
  }
  try {
    const stored = loadWallet(params.address);
    return decrypt(stored.AESEncryptPrivateKey, password);
  } catch (error) {
    throw new Error(
      `SIGNER_CONTEXT_INVALID: failed to decrypt explicit wallet "${params.address}" (${error instanceof Error ? error.message : String(error)})`,
    );
  }
}

function resolveContextPrivateKey(params: ResolvePrivateKeyParams): string | null {
  const active = getActiveWalletProfile();
  if (!active || active.walletType !== 'EOA' || !active.address) {
    return null;
  }
  const password = params.password || process.env.PORTKEY_WALLET_PASSWORD;
  if (!password) {
    throw new Error(
      'SIGNER_PASSWORD_REQUIRED: password is required for active EOA wallet (set PORTKEY_WALLET_PASSWORD env or pass password param)',
    );
  }
  try {
    const stored = loadWallet(active.address);
    return decrypt(stored.AESEncryptPrivateKey, password);
  } catch (error) {
    throw new Error(
      `SIGNER_CONTEXT_INVALID: failed to decrypt active wallet "${active.address}" (${error instanceof Error ? error.message : String(error)})`,
    );
  }
}

function resolveEnvPrivateKey(): string | null {
  return process.env.PORTKEY_PRIVATE_KEY || null;
}

export function resolvePrivateKey(params: ResolvePrivateKeyParams): string {
  const mode = params.signerMode || 'auto';

  if (mode === 'daemon') {
    throw new Error(
      'SIGNER_DAEMON_NOT_IMPLEMENTED: daemon signer provider is reserved for future release',
    );
  }

  if (mode === 'explicit') {
    const explicit = resolveExplicitPrivateKey(params);
    if (explicit) return explicit;
    throw new Error(
      'SIGNER_CONTEXT_NOT_FOUND: no explicit signer input provided (expected privateKey or address+password)',
    );
  }

  if (mode === 'context') {
    const context = resolveContextPrivateKey(params);
    if (context) return context;
    throw new Error(
      'SIGNER_CONTEXT_NOT_FOUND: no active EOA wallet context available',
    );
  }

  if (mode === 'env') {
    const envPk = resolveEnvPrivateKey();
    if (envPk) return envPk;
    throw new Error(
      'SIGNER_CONTEXT_NOT_FOUND: no PORTKEY_PRIVATE_KEY available from env',
    );
  }

  let lastContextError: unknown = null;

  const explicit = resolveExplicitPrivateKey(params);
  if (explicit) return explicit;

  try {
    const context = resolveContextPrivateKey(params);
    if (context) return context;
  } catch (error) {
    lastContextError = error;
  }

  const envPk = resolveEnvPrivateKey();
  if (envPk) return envPk;

  if (lastContextError) {
    throw lastContextError;
  }

  throw new Error(
    'SIGNER_CONTEXT_NOT_FOUND: no signer available from explicit/context/env',
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

// ============================================================
// AelfSigner bridge — create signer from resolved wallet
// ============================================================

import { createEoaSigner, type AelfSigner } from '@portkey/aelf-signer';

/**
 * Create an AelfSigner (EoaSigner) from the resolved private key.
 * Uses the same resolution logic as eoa-agent-skills:
 *   1. Direct privateKey param
 *   2. PORTKEY_PRIVATE_KEY env var
 *   3. Local wallet file (address + password)
 *
 * The returned signer can be used with awaken-agent-skills / eforest-agent-skills.
 */
export function createSignerFromWallet(params: {
  privateKey?: string;
  address?: string;
  password?: string;
  signerMode?: SignerContextInput['signerMode'];
}): AelfSigner {
  const pk = resolvePrivateKey(params);
  return createEoaSigner(pk);
}

export function getActiveWallet(): ActiveWalletProfile | null {
  return getActiveWalletProfile();
}

export function setActiveWallet(input: {
  walletType: 'EOA' | 'CA';
  source: 'eoa-local' | 'ca-keystore' | 'env';
  network?: string;
  address?: string;
  caAddress?: string;
  caHash?: string;
  walletFile?: string;
  keystoreFile?: string;
}) {
  return setActiveWalletProfile(input, {
    skill: 'portkey-eoa',
    version: process.env.npm_package_version || '0.0.0',
  });
}
