import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  createWallet,
  importWallet,
  getWalletInfo,
  listWallets,
  backupWallet,
} from '../../src/core/wallet.js';
import { getConfig } from '../../lib/config.js';

describe('core/wallet', () => {
  const testDir = path.join(
    os.tmpdir(),
    'portkey-wallet-test-' + Date.now(),
  );
  const config = getConfig('mainnet');

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

  test('createWallet returns address and mnemonic', async () => {
    const result = await createWallet(config, { password: 'testpass' });
    expect(result.address).toBeTruthy();
    expect(result.mnemonic).toBeTruthy();
    expect(result.mnemonic.split(' ').length).toBe(12);
  });

  test('createWallet stores encrypted wallet locally', async () => {
    const result = await createWallet(config, {
      password: 'testpass',
      name: 'MyWallet',
    });
    const files = fs.readdirSync(testDir);
    expect(files.length).toBe(1);
    expect(files[0]).toBe(`${result.address}.json`);
  });

  test('importWallet with mnemonic works', async () => {
    // First create to get a mnemonic
    const created = await createWallet(config, { password: 'pass1' });

    // Clean up and re-import
    fs.rmSync(testDir, { recursive: true });

    const imported = await importWallet(config, {
      password: 'pass2',
      mnemonic: created.mnemonic,
    });
    expect(imported.address).toBe(created.address);
  });

  test('importWallet rejects invalid mnemonic', async () => {
    await expect(
      importWallet(config, { password: 'pass', mnemonic: 'not enough words' }),
    ).rejects.toThrow('12 words');
  });

  test('importWallet rejects invalid private key', async () => {
    await expect(
      importWallet(config, { password: 'pass', privateKey: 'not_hex' }),
    ).rejects.toThrow('64 hex');
  });

  test('importWallet rejects duplicate wallet', async () => {
    const created = await createWallet(config, { password: 'pass' });
    await expect(
      importWallet(config, {
        password: 'pass',
        mnemonic: created.mnemonic,
      }),
    ).rejects.toThrow('already exists');
  });

  test('getWalletInfo returns public info', async () => {
    const created = await createWallet(config, {
      password: 'pass',
      name: 'TestName',
    });
    const info = await getWalletInfo(config, { address: created.address });
    expect(info.address).toBe(created.address);
    expect(info.name).toBe('TestName');
    expect(info.network).toBe('mainnet');
  });

  test('listWallets returns all wallets', async () => {
    await createWallet(config, { password: 'pass' });
    await createWallet(config, { password: 'pass' });
    const wallets = await listWallets(config);
    expect(wallets.length).toBe(2);
  });

  test('listWallets returns sanitized public info only', async () => {
    await createWallet(config, { password: 'pass', name: 'SanitizeTest' });
    const wallets = await listWallets(config);
    expect(wallets.length).toBe(1);

    const w = wallets[0] as any;
    // Should contain public fields
    expect(w.address).toBeTruthy();
    expect(w.publicKey).toBeTruthy();
    expect(w.name).toBe('SanitizeTest');
    expect(w.network).toBeTruthy();
    expect(w.createdAt).toBeTruthy();

    // Must NOT contain encrypted secrets
    expect(w.AESEncryptPrivateKey).toBeUndefined();
    expect(w.AESEncryptMnemonic).toBeUndefined();
  });

  test('backupWallet returns private key and mnemonic', async () => {
    const created = await createWallet(config, { password: 'pass' });
    const backup = await backupWallet(config, {
      address: created.address,
      password: 'pass',
    });
    expect(backup.privateKey).toBeTruthy();
    expect(backup.mnemonic).toBe(created.mnemonic);
  });

  test('backupWallet rejects wrong password', async () => {
    const created = await createWallet(config, { password: 'correct' });
    await expect(
      backupWallet(config, {
        address: created.address,
        password: 'wrong',
      }),
    ).rejects.toThrow();
  });
});
