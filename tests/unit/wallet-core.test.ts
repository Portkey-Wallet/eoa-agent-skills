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
  createSignerFromWallet,
  resolvePrivateKey,
  getActiveWallet,
  setActiveWallet,
} from '../../src/core/wallet.js';
import { getConfig } from '../../lib/config.js';

describe('core/wallet', () => {
  const testDir = path.join(
    os.tmpdir(),
    'portkey-wallet-test-' + Date.now(),
  );
  const contextPath = path.join(
    os.tmpdir(),
    'portkey-wallet-context-test-' + Date.now() + '.json',
  );
  const config = getConfig('mainnet');

  beforeEach(() => {
    process.env.PORTKEY_WALLET_DIR = testDir;
    process.env.PORTKEY_SKILL_WALLET_CONTEXT_PATH = contextPath;
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    if (fs.existsSync(contextPath)) {
      fs.rmSync(contextPath, { force: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true });
    }
    delete process.env.PORTKEY_WALLET_DIR;
    delete process.env.PORTKEY_PRIVATE_KEY;
    delete process.env.PORTKEY_WALLET_PASSWORD;
    delete process.env.PORTKEY_SKILL_WALLET_CONTEXT_PATH;
  });

  test('createWallet returns address and mnemonic', async () => {
    const result = await createWallet(config, { password: 'testpass' });
    expect(result.address).toBeTruthy();
    expect(result.mnemonic).toBeTruthy();
    expect(result.mnemonic?.split(' ').length).toBe(12);
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

  // ============================================================
  // createSignerFromWallet tests
  // ============================================================

  test('createSignerFromWallet works with direct privateKey', async () => {
    const created = await createWallet(config, { password: 'pass' });
    const backup = await backupWallet(config, {
      address: created.address,
      password: 'pass',
    });
    const signer = createSignerFromWallet({ privateKey: backup.privateKey });
    expect(signer).toBeTruthy();
    expect(signer.address).toBeTruthy();
    expect(typeof signer.signMessage).toBe('function');
    expect(typeof signer.sendContractCall).toBe('function');
  });

  test('createSignerFromWallet works with env fallback', async () => {
    const created = await createWallet(config, { password: 'pass' });
    const backup = await backupWallet(config, {
      address: created.address,
      password: 'pass',
    });
    process.env.PORTKEY_PRIVATE_KEY = backup.privateKey;
    try {
      const signer = createSignerFromWallet({});
      expect(signer).toBeTruthy();
      expect(signer.address).toBeTruthy();
      expect(typeof signer.signMessage).toBe('function');
    } finally {
      delete process.env.PORTKEY_PRIVATE_KEY;
    }
  });

  test('createSignerFromWallet throws without password or key', () => {
    expect(() =>
      createSignerFromWallet({
        address: 'nonExistentAddress12345678901234567890',
      }),
    ).toThrow();
  });

  test('createWallet writes active wallet context', async () => {
    const created = await createWallet(config, { password: 'pass' });
    const active = getActiveWallet();
    expect(active?.walletType).toBe('EOA');
    expect(active?.source).toBe('eoa-local');
    expect(active?.address).toBe(created.address);
  });

  test('resolvePrivateKey can read from active wallet context', async () => {
    const created = await createWallet(config, { password: 'pass' });
    const backup = await backupWallet(config, {
      address: created.address,
      password: 'pass',
    });

    process.env.PORTKEY_WALLET_PASSWORD = 'pass';
    delete process.env.PORTKEY_PRIVATE_KEY;

    const privateKey = resolvePrivateKey({});
    expect(privateKey).toBe(backup.privateKey);
  });

  test('resolvePrivateKey with signerMode=context ignores env priority', async () => {
    const created = await createWallet(config, { password: 'pass' });
    const backup = await backupWallet(config, {
      address: created.address,
      password: 'pass',
    });
    const envWallet = await createWallet(config, { password: 'env-pass' });
    const envBackup = await backupWallet(config, {
      address: envWallet.address,
      password: 'env-pass',
    });
    setActiveWallet({
      walletType: 'EOA',
      source: 'eoa-local',
      network: 'mainnet',
      address: created.address,
      walletFile: path.join(testDir, `${created.address}.json`),
    });

    process.env.PORTKEY_PRIVATE_KEY = envBackup.privateKey;
    process.env.PORTKEY_WALLET_PASSWORD = 'pass';
    const fromContext = resolvePrivateKey({ signerMode: 'context' });
    expect(fromContext).toBe(backup.privateKey);
  });

  test('resolvePrivateKey with signerMode=env ignores context', async () => {
    await createWallet(config, { password: 'pass' });
    const envWallet = await createWallet(config, { password: 'env-pass' });
    const envBackup = await backupWallet(config, {
      address: envWallet.address,
      password: 'env-pass',
    });

    process.env.PORTKEY_PRIVATE_KEY = envBackup.privateKey;
    const fromEnv = resolvePrivateKey({ signerMode: 'env' });
    expect(fromEnv).toBe(envBackup.privateKey);
  });

  test('resolvePrivateKey daemon mode returns not implemented', () => {
    expect(() => resolvePrivateKey({ signerMode: 'daemon' })).toThrow(
      'SIGNER_DAEMON_NOT_IMPLEMENTED',
    );
  });

  test('resolvePrivateKey context mode throws invalid when active wallet file is missing', async () => {
    const created = await createWallet(config, { password: 'pass' });
    const walletPath = path.join(testDir, `${created.address}.json`);
    fs.rmSync(walletPath, { force: true });
    process.env.PORTKEY_WALLET_PASSWORD = 'pass';

    expect(() => resolvePrivateKey({ signerMode: 'context' })).toThrow(
      'SIGNER_CONTEXT_INVALID',
    );
  });

  test('resolvePrivateKey auto mode falls back to env when context is invalid', async () => {
    const created = await createWallet(config, { password: 'pass' });
    const contextWalletPath = path.join(testDir, `${created.address}.json`);
    fs.rmSync(contextWalletPath, { force: true });

    const envWallet = await createWallet(config, { password: 'env-pass' });
    const envBackup = await backupWallet(config, {
      address: envWallet.address,
      password: 'env-pass',
    });
    setActiveWallet({
      walletType: 'EOA',
      source: 'eoa-local',
      network: 'mainnet',
      address: created.address,
      walletFile: contextWalletPath,
    });
    process.env.PORTKEY_PRIVATE_KEY = envBackup.privateKey;

    const privateKey = resolvePrivateKey({ signerMode: 'auto' });
    expect(privateKey).toBe(envBackup.privateKey);
  });
});
