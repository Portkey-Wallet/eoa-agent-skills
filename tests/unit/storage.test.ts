import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  saveWallet,
  loadWallet,
  listWallets,
  deleteWallet,
  walletExists,
} from '../../lib/storage.js';
import type { StoredWallet } from '../../lib/types.js';

describe('storage', () => {
  const testDir = path.join(os.tmpdir(), 'portkey-agent-test-' + Date.now());

  beforeEach(() => {
    process.env.PORTKEY_WALLET_DIR = testDir;
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    delete process.env.PORTKEY_WALLET_DIR;
  });

  const mockWallet: StoredWallet = {
    name: 'Test Wallet',
    address: 'testAddress123',
    publicKey: { x: 'abc', y: 'def' },
    AESEncryptPrivateKey: 'encrypted_pk',
    AESEncryptMnemonic: 'encrypted_mnemonic',
    createdAt: '2025-01-01T00:00:00.000Z',
    network: 'mainnet',
  };

  test('saveWallet creates file', () => {
    saveWallet(mockWallet);
    const filePath = path.join(testDir, `${mockWallet.address}.json`);
    expect(fs.existsSync(filePath)).toBe(true);
  });

  test('loadWallet returns saved wallet', () => {
    saveWallet(mockWallet);
    const loaded = loadWallet(mockWallet.address);
    expect(loaded.name).toBe(mockWallet.name);
    expect(loaded.address).toBe(mockWallet.address);
    expect(loaded.publicKey.x).toBe('abc');
  });

  test('loadWallet throws for non-existent wallet', () => {
    expect(() => loadWallet('nonexistent')).toThrow('Wallet not found');
  });

  test('listWallets returns all wallets', () => {
    saveWallet(mockWallet);
    saveWallet({ ...mockWallet, address: 'addr2', name: 'Wallet 2' });
    const wallets = listWallets();
    expect(wallets.length).toBe(2);
  });

  test('deleteWallet removes wallet file', () => {
    saveWallet(mockWallet);
    expect(walletExists(mockWallet.address)).toBe(true);
    deleteWallet(mockWallet.address);
    expect(walletExists(mockWallet.address)).toBe(false);
  });

  test('walletExists returns correct boolean', () => {
    expect(walletExists(mockWallet.address)).toBe(false);
    saveWallet(mockWallet);
    expect(walletExists(mockWallet.address)).toBe(true);
  });
});
