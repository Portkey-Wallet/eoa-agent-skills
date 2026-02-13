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

// Valid Base58 aelf-style addresses (30-60 chars, no 0/O/I/l)
const VALID_ADDR_1 = '2RHSoUFr3gXFn7HRUQBYN8dVqAYVYBQg15fZ7P4dF3wMFm';
const VALID_ADDR_2 = 'JRmBduh4nXWi1aXgdUsj5gJrzeZb2LxmrAbf7W99faZSvo';

describe('storage', () => {
  const testDir = path.join(os.tmpdir(), 'portkey-eoa-test-' + Date.now());

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
    address: VALID_ADDR_1,
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
    expect(() => loadWallet(VALID_ADDR_2)).toThrow('Wallet not found');
  });

  test('listWallets returns all wallets', () => {
    saveWallet(mockWallet);
    saveWallet({ ...mockWallet, address: VALID_ADDR_2, name: 'Wallet 2' });
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

  // ============================================================
  // Path traversal prevention tests
  // ============================================================

  test('rejects path traversal with ../', () => {
    expect(() => loadWallet('../../etc/passwd')).toThrow('Invalid address format');
  });

  test('rejects path traversal with encoded slashes', () => {
    expect(() => loadWallet('foo/bar')).toThrow('Invalid address format');
  });

  test('rejects empty address', () => {
    expect(() => loadWallet('')).toThrow('Invalid address format');
  });

  test('rejects address with special characters', () => {
    expect(() => loadWallet('addr@#$%^&*()')).toThrow('Invalid address format');
  });

  test('rejects address too short (< 30 chars)', () => {
    expect(() => loadWallet('shortAddr')).toThrow('Invalid address format');
  });

  test('rejects address with forbidden Base58 chars (0, O, I, l)', () => {
    // 'O' is not in Base58 alphabet
    expect(() =>
      loadWallet('OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO'),
    ).toThrow('Invalid address format');
  });

  test('rejects save with traversal address', () => {
    expect(() =>
      saveWallet({ ...mockWallet, address: '../../../tmp/evil' }),
    ).toThrow('Invalid address format');
  });

  test('rejects delete with traversal address', () => {
    expect(() => deleteWallet('../../etc/shadow')).toThrow('Invalid address format');
  });

  test('rejects walletExists with traversal address', () => {
    expect(() => walletExists('../secret')).toThrow('Invalid address format');
  });
});
