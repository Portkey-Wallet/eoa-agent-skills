import { describe, test, expect } from 'bun:test';
import {
  getWallet,
  createNewWallet,
  getWalletByMnemonic,
  isAelfAddress,
  getAelfAddress,
  getChainIdFromAddress,
  isCrossChain,
  getAelfInstance,
} from '../../lib/aelf.js';

describe('aelf utilities', () => {
  test('getWallet returns wallet with address', () => {
    const wallet = getWallet();
    expect(wallet.address).toBeTruthy();
    expect(typeof wallet.address).toBe('string');
  });

  test('getWallet with private key returns correct wallet', () => {
    const pk =
      'f6e512a3c259e5f9af981d7f99d245aa5bc52fe448495e0b0dd56e8406be6f71';
    const wallet = getWallet(pk);
    expect(wallet.privateKey).toBe(pk);
    expect(wallet.address).toBeTruthy();
  });

  test('createNewWallet returns wallet with mnemonic', () => {
    const wallet = createNewWallet();
    expect(wallet.address).toBeTruthy();
    expect(wallet.mnemonic).toBeTruthy();
    expect(wallet.privateKey).toBeTruthy();
    // Mnemonic should be 12 words
    const words = wallet.mnemonic!.split(' ');
    expect(words.length).toBe(12);
  });

  test('getWalletByMnemonic restores same wallet', () => {
    const wallet1 = createNewWallet();
    const wallet2 = getWalletByMnemonic(wallet1.mnemonic!);
    expect(wallet2.address).toBe(wallet1.address);
    expect(wallet2.privateKey).toBe(wallet1.privateKey);
  });

  test('getAelfInstance returns instance', () => {
    const instance = getAelfInstance('https://aelf-test-node.aelf.io');
    expect(instance).toBeTruthy();
    expect(instance.chain).toBeTruthy();
  });

  test('getAelfInstance caches instances', () => {
    const url = 'https://test-rpc-unique.aelf.io';
    const inst1 = getAelfInstance(url);
    const inst2 = getAelfInstance(url);
    expect(inst1).toBe(inst2); // Same reference
  });

  describe('address utilities', () => {
    test('getAelfAddress extracts address from DID format', () => {
      const didAddr = 'ELF_someAddress123_AELF';
      expect(getAelfAddress(didAddr)).toBe('someAddress123');
    });

    test('getAelfAddress handles raw address', () => {
      const rawAddr = 'someAddress123';
      expect(getAelfAddress(rawAddr)).toBe('someAddress123');
    });

    test('getChainIdFromAddress extracts chainId', () => {
      expect(getChainIdFromAddress('ELF_addr_AELF')).toBe('AELF');
      expect(getChainIdFromAddress('ELF_addr_tDVV')).toBe('tDVV');
      expect(getChainIdFromAddress('rawAddress')).toBeUndefined();
    });

    test('isCrossChain detects cross-chain addresses', () => {
      expect(isCrossChain('ELF_addr_tDVV', 'AELF')).toBe(true);
      expect(isCrossChain('ELF_addr_AELF', 'AELF')).toBe(false);
      expect(isCrossChain('rawAddress', 'AELF')).toBe(false);
    });
  });
});
