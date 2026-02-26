import { beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { setCachedChainInfo } from '../../lib/config.js';
import {
  chainCoreMockState,
  installChainCoreModuleMocks,
  resetChainCoreMockState,
} from './chain-core-mock-state';

installChainCoreModuleMocks();

let bridgeCore: typeof import('../../src/core/bridge.js');

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
  bridgeCore = await import('../../src/core/bridge.js');
});

beforeEach(() => {
  resetChainCoreMockState();
  seedChainInfo();
});

describe('core/bridge', () => {
  test('eBridgeTransfer skips approve when allowance is enough', async () => {
    const tokenSendCalls: any[] = [];
    const bridgeSendCalls: any[] = [];

    chainCoreMockState.getContractBasicImpl = async ({ contractAddress }) => {
      if (contractAddress === 'TOKEN_AELF') {
        return {
          callViewMethod: async () => ({ data: { allowance: '1000' } }),
          callSendMethod: async (...args: any[]) => {
            tokenSendCalls.push(args);
            return { transactionId: 'approve-tx' };
          },
          encodedTx: async () => ({ data: 'RAW' }),
        };
      }
      return {
        callViewMethod: async () => ({ data: {} }),
        callSendMethod: async (...args: any[]) => {
          bridgeSendCalls.push(args);
          return { transactionId: 'receipt-tx', data: { Status: 'MINED' } };
        },
        encodedTx: async () => ({ data: 'RAW' }),
      };
    };

    const result = await bridgeCore.eBridgeTransfer(config, {
      privateKey: 'a'.repeat(64),
      symbol: 'ELF',
      amount: '100',
      fromChainId: 'AELF',
      toChainId: 'Ethereum',
      targetAddress: '0xabc',
      bridgeContractAddress: 'BRIDGE_CONTRACT',
    });

    expect(result.transactionId).toBe('receipt-tx');
    expect(tokenSendCalls.length).toBe(0);
    expect(bridgeSendCalls.length).toBe(1);
    expect(bridgeSendCalls[0]?.[0]).toBe('CreateReceipt');
  });

  test('eBridgeTransfer approves when allowance is insufficient', async () => {
    const tokenSendCalls: any[] = [];
    const bridgeSendCalls: any[] = [];

    chainCoreMockState.getContractBasicImpl = async ({ contractAddress }) => {
      if (contractAddress === 'TOKEN_AELF') {
        return {
          callViewMethod: async () => ({ data: { allowance: '10' } }),
          callSendMethod: async (...args: any[]) => {
            tokenSendCalls.push(args);
            return { transactionId: 'approve-tx', data: { Status: 'MINED' } };
          },
          encodedTx: async () => ({ data: 'RAW' }),
        };
      }
      return {
        callViewMethod: async () => ({ data: {} }),
        callSendMethod: async (...args: any[]) => {
          bridgeSendCalls.push(args);
          return { transactionId: 'receipt-tx', data: { Status: 'MINED' } };
        },
        encodedTx: async () => ({ data: 'RAW' }),
      };
    };

    await bridgeCore.eBridgeTransfer(config, {
      privateKey: 'b'.repeat(64),
      symbol: 'ELF',
      amount: '100',
      fromChainId: 'AELF',
      toChainId: 'Ethereum',
      targetAddress: '0xdef',
      bridgeContractAddress: 'BRIDGE_CONTRACT',
    });

    expect(tokenSendCalls.length).toBe(1);
    expect(tokenSendCalls[0]?.[0]).toBe('Approve');
    expect(tokenSendCalls[0]?.[2]).toMatchObject({
      spender: 'BRIDGE_CONTRACT',
      symbol: 'ELF',
      amount: '1000090',
    });
    expect(bridgeSendCalls.length).toBe(1);
  });

  test('eBridgeTransfer throws when CreateReceipt fails', async () => {
    chainCoreMockState.getContractBasicImpl = async ({ contractAddress }) => {
      if (contractAddress === 'TOKEN_AELF') {
        return {
          callViewMethod: async () => ({ data: { allowance: '999999' } }),
          callSendMethod: async () => ({ transactionId: 'approve-tx' }),
          encodedTx: async () => ({ data: 'RAW' }),
        };
      }
      return {
        callViewMethod: async () => ({ data: {} }),
        callSendMethod: async () => ({ error: { message: 'receipt failed' } }),
        encodedTx: async () => ({ data: 'RAW' }),
      };
    };

    await expect(
      bridgeCore.eBridgeTransfer(config, {
        privateKey: 'c'.repeat(64),
        symbol: 'ELF',
        amount: '100',
        fromChainId: 'AELF',
        toChainId: 'Ethereum',
        targetAddress: '0xghi',
        bridgeContractAddress: 'BRIDGE_CONTRACT',
      }),
    ).rejects.toThrow('eBridge CreateReceipt failed: receipt failed');
  });

  test('getEBridgeLimit maps DailyLimit/CurrentLimit', async () => {
    chainCoreMockState.getContractBasicImpl = async () => ({
      callViewMethod: async () => ({
        data: { DailyLimit: '1000', CurrentLimit: '200' },
      }),
      callSendMethod: async () => ({ transactionId: 'tx' }),
      encodedTx: async () => ({ data: 'RAW' }),
    });

    const result = await bridgeCore.getEBridgeLimit(config, {
      fromChainId: 'AELF',
      toChainId: 'Ethereum',
      symbol: 'ELF',
      bridgeContractAddress: 'BRIDGE_CONTRACT',
    });

    expect(result).toEqual({
      dailyLimit: '1000',
      currentLimit: '200',
    });
  });

  test('getEBridgeFee maps Value and throws on error', async () => {
    chainCoreMockState.getContractBasicImpl = async () => ({
      callViewMethod: async () => ({ data: { Value: '0.001' } }),
      callSendMethod: async () => ({ transactionId: 'tx' }),
      encodedTx: async () => ({ data: 'RAW' }),
    });

    const ok = await bridgeCore.getEBridgeFee(config, {
      fromChainId: 'AELF',
      toChainId: 'Ethereum',
      bridgeContractAddress: 'BRIDGE_CONTRACT',
    });
    expect(ok).toEqual({ fee: '0.001' });

    chainCoreMockState.getContractBasicImpl = async () => ({
      callViewMethod: async () => ({ error: { message: 'fee failed' } }),
      callSendMethod: async () => ({ transactionId: 'tx' }),
      encodedTx: async () => ({ data: 'RAW' }),
    });

    await expect(
      bridgeCore.getEBridgeFee(config, {
        fromChainId: 'AELF',
        toChainId: 'Ethereum',
        bridgeContractAddress: 'BRIDGE_CONTRACT',
      }),
    ).rejects.toThrow('GetFeeByChainId failed: fee failed');
  });
});
