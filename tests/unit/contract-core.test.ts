import { afterEach, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { setCachedChainInfo } from '../../lib/config.js';
import {
  chainCoreMockState,
  installChainCoreModuleMocks,
  resetChainCoreMockState,
} from './chain-core-mock-state';

installChainCoreModuleMocks();

let contractCore: typeof import('../../src/core/contract.js');
const originalFetch = globalThis.fetch;

const config = { network: 'mainnet' as const, apiUrl: 'https://api.mock' };

function seedChainInfo() {
  setCachedChainInfo(
    [
      {
        chainId: 'AELF',
        chainName: 'AELF',
        endPoint: 'https://rpc.aelf',
        explorerUrl: '',
        caContractAddress: 'CA_AELF',
        defaultToken: {
          name: 'ELF',
          address: 'TOKEN_AELF',
          imageUrl: '',
          symbol: 'ELF',
          decimals: '8',
        },
      },
    ],
    'mainnet',
  );
}

beforeAll(async () => {
  contractCore = await import('../../src/core/contract.js');
});

beforeEach(() => {
  resetChainCoreMockState();
  seedChainInfo();
  globalThis.fetch = originalFetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('core/contract', () => {
  test('approve success and failure branches', async () => {
    chainCoreMockState.getContractBasicImpl = async () => ({
      callViewMethod: async () => ({ data: {} }),
      callSendMethod: async () => ({ transactionId: 'tx-approve' }),
      encodedTx: async () => ({ data: 'RAW' }),
    });

    const ok = await contractCore.approve(config, {
      privateKey: 'a'.repeat(64),
      chainId: 'AELF',
      spender: 'ELF_spender_AELF',
      symbol: 'ELF',
      amount: '100',
    });
    expect(ok).toEqual({ transactionId: 'tx-approve' });

    chainCoreMockState.getContractBasicImpl = async () => ({
      callViewMethod: async () => ({ data: {} }),
      callSendMethod: async () => ({ error: { message: 'approve failed' } }),
      encodedTx: async () => ({ data: 'RAW' }),
    });

    await expect(
      contractCore.approve(config, {
        privateKey: 'b'.repeat(64),
        chainId: 'AELF',
        spender: 'ELF_spender_AELF',
        symbol: 'ELF',
        amount: '100',
      }),
    ).rejects.toThrow('approve failed');
  });

  test('callViewMethod success and failure branches', async () => {
    chainCoreMockState.getContractBasicImpl = async () => ({
      callViewMethod: async (methodName: string) => ({
        data: { method: methodName, value: 'ok' },
      }),
      callSendMethod: async () => ({ transactionId: 'tx' }),
      encodedTx: async () => ({ data: 'RAW' }),
    });

    const view = await contractCore.callViewMethod(config, {
      chainId: 'AELF',
      contractAddress: 'CONTRACT',
      methodName: 'GetValue',
      params: { key: 'k' },
    });
    expect(view).toEqual({ method: 'GetValue', value: 'ok' });

    chainCoreMockState.getContractBasicImpl = async () => ({
      callViewMethod: async () => ({ error: { message: 'view failed' } }),
      callSendMethod: async () => ({ transactionId: 'tx' }),
      encodedTx: async () => ({ data: 'RAW' }),
    });

    await expect(
      contractCore.callViewMethod(config, {
        chainId: 'AELF',
        contractAddress: 'CONTRACT',
        methodName: 'GetValue',
        params: {},
      }),
    ).rejects.toThrow('view failed');
  });

  test('callSendMethod success and failure branches', async () => {
    chainCoreMockState.getContractBasicImpl = async () => ({
      callViewMethod: async () => ({ data: {} }),
      callSendMethod: async () => ({ transactionId: 'tx-send' }),
      encodedTx: async () => ({ data: 'RAW' }),
    });

    const send = await contractCore.callSendMethod(config, {
      privateKey: 'c'.repeat(64),
      chainId: 'AELF',
      contractAddress: 'CONTRACT',
      methodName: 'DoSomething',
      params: { value: 1 },
    });
    expect(send).toEqual({ transactionId: 'tx-send' });

    chainCoreMockState.getContractBasicImpl = async () => ({
      callViewMethod: async () => ({ data: {} }),
      callSendMethod: async () => ({ error: { message: 'send failed' } }),
      encodedTx: async () => ({ data: 'RAW' }),
    });

    await expect(
      contractCore.callSendMethod(config, {
        privateKey: 'd'.repeat(64),
        chainId: 'AELF',
        contractAddress: 'CONTRACT',
        methodName: 'DoSomething',
        params: { value: 1 },
      }),
    ).rejects.toThrow('send failed');
  });

  test('estimateTransactionFee: encode fail', async () => {
    chainCoreMockState.getContractBasicImpl = async () => ({
      callViewMethod: async () => ({ data: {} }),
      callSendMethod: async () => ({ transactionId: 'tx' }),
      encodedTx: async () => ({ error: { message: 'encode failed' } }),
    });

    await expect(
      contractCore.estimateTransactionFee(config, {
        privateKey: 'e'.repeat(64),
        chainId: 'AELF',
        contractAddress: 'CONTRACT',
        methodName: 'Transfer',
        params: { amount: '1' },
      }),
    ).rejects.toThrow('encode failed');
  });

  test('estimateTransactionFee: rpc not ok and Success=false', async () => {
    chainCoreMockState.getContractBasicImpl = async () => ({
      callViewMethod: async () => ({ data: {} }),
      callSendMethod: async () => ({ transactionId: 'tx' }),
      encodedTx: async () => ({ data: 'RAW_TX' }),
    });

    globalThis.fetch = (async () => ({
      ok: false,
      status: 500,
      statusText: 'Internal Error',
      text: async () => 'rpc down',
    })) as any;

    await expect(
      contractCore.estimateTransactionFee(config, {
        privateKey: 'f'.repeat(64),
        chainId: 'AELF',
        contractAddress: 'CONTRACT',
        methodName: 'Transfer',
        params: { amount: '1' },
      }),
    ).rejects.toThrow('RPC error 500: rpc down');

    globalThis.fetch = (async () => ({
      ok: true,
      json: async () => ({ Success: false }),
    })) as any;

    await expect(
      contractCore.estimateTransactionFee(config, {
        privateKey: '1'.repeat(64),
        chainId: 'AELF',
        contractAddress: 'CONTRACT',
        methodName: 'Transfer',
        params: { amount: '1' },
      }),
    ).rejects.toThrow('Failed to calculate transaction fee');
  });

  test('estimateTransactionFee parses TransactionFee map', async () => {
    chainCoreMockState.getContractBasicImpl = async () => ({
      callViewMethod: async () => ({ data: {} }),
      callSendMethod: async () => ({ transactionId: 'tx' }),
      encodedTx: async () => ({ data: 'RAW_TX' }),
    });

    globalThis.fetch = (async () => ({
      ok: true,
      json: async () => ({
        Success: true,
        TransactionFee: { ELF: '12345', USDT: 67890 },
      }),
    })) as any;

    const result = await contractCore.estimateTransactionFee(config, {
      privateKey: '2'.repeat(64),
      chainId: 'AELF',
      contractAddress: 'CONTRACT',
      methodName: 'Transfer',
      params: { amount: '1' },
    });

    expect(result).toEqual({
      fee: {
        ELF: 12345,
        USDT: 67890,
      },
    });
  });
});
