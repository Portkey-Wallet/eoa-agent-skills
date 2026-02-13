import { describe, test, expect } from 'bun:test';
import * as SDK from '../../index.js';

describe('SDK exports', () => {
  // Wallet
  test('exports createWallet', () => {
    expect(typeof SDK.createWallet).toBe('function');
  });
  test('exports importWallet', () => {
    expect(typeof SDK.importWallet).toBe('function');
  });
  test('exports getWalletInfo', () => {
    expect(typeof SDK.getWalletInfo).toBe('function');
  });
  test('exports listWallets', () => {
    expect(typeof SDK.listWallets).toBe('function');
  });
  test('exports backupWallet', () => {
    expect(typeof SDK.backupWallet).toBe('function');
  });
  test('exports resolvePrivateKey', () => {
    expect(typeof SDK.resolvePrivateKey).toBe('function');
  });

  // Queries
  test('exports getChainInfo', () => {
    expect(typeof SDK.getChainInfo).toBe('function');
  });
  test('exports ensureChainInfo', () => {
    expect(typeof SDK.ensureChainInfo).toBe('function');
  });
  test('exports getTokenList', () => {
    expect(typeof SDK.getTokenList).toBe('function');
  });
  test('exports getTokenBalance', () => {
    expect(typeof SDK.getTokenBalance).toBe('function');
  });
  test('exports getTokenPrices', () => {
    expect(typeof SDK.getTokenPrices).toBe('function');
  });
  test('exports getNFTCollections', () => {
    expect(typeof SDK.getNFTCollections).toBe('function');
  });
  test('exports getNFTItems', () => {
    expect(typeof SDK.getNFTItems).toBe('function');
  });
  test('exports getTransactionHistory', () => {
    expect(typeof SDK.getTransactionHistory).toBe('function');
  });
  test('exports getTransactionDetail', () => {
    expect(typeof SDK.getTransactionDetail).toBe('function');
  });

  // Transfers
  test('exports transfer', () => {
    expect(typeof SDK.transfer).toBe('function');
  });
  test('exports crossChainTransfer', () => {
    expect(typeof SDK.crossChainTransfer).toBe('function');
  });

  // Contract
  test('exports approve', () => {
    expect(typeof SDK.approve).toBe('function');
  });
  test('exports callViewMethod', () => {
    expect(typeof SDK.callViewMethod).toBe('function');
  });
  test('exports callSendMethod', () => {
    expect(typeof SDK.callSendMethod).toBe('function');
  });
  test('exports estimateTransactionFee', () => {
    expect(typeof SDK.estimateTransactionFee).toBe('function');
  });

  // eBridge
  test('exports eBridgeTransfer', () => {
    expect(typeof SDK.eBridgeTransfer).toBe('function');
  });
  test('exports getEBridgeLimit', () => {
    expect(typeof SDK.getEBridgeLimit).toBe('function');
  });
  test('exports getEBridgeFee', () => {
    expect(typeof SDK.getEBridgeFee).toBe('function');
  });

  // Config
  test('exports getConfig', () => {
    expect(typeof SDK.getConfig).toBe('function');
  });

  // AelfSigner integration
  test('exports createSignerFromWallet', () => {
    expect(typeof SDK.createSignerFromWallet).toBe('function');
  });
  test('exports createEoaSigner', () => {
    expect(typeof SDK.createEoaSigner).toBe('function');
  });
  test('exports createSignerFromEnv', () => {
    expect(typeof SDK.createSignerFromEnv).toBe('function');
  });
  test('exports EoaSigner', () => {
    expect(typeof SDK.EoaSigner).toBe('function');
  });
});
