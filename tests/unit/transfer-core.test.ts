import { beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import { setCachedChainInfo } from '../../lib/config.js';
import {
  chainCoreMockState,
  installChainCoreModuleMocks,
  resetChainCoreMockState,
} from './chain-core-mock-state';

installChainCoreModuleMocks();

let transferCore: typeof import('../../src/core/transfer.js');

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
      {
        chainId: 'tDVV',
        chainName: 'tDVV',
        endPoint: 'https://rpc.tdvv',
        explorerUrl: '',
        caContractAddress: 'CA_tDVV',
        defaultToken: {
          name: 'ELF',
          address: 'TOKEN_tDVV',
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
  transferCore = await import('../../src/core/transfer.js');
});

beforeEach(() => {
  resetChainCoreMockState();
  seedChainInfo();
});

describe('core/transfer', () => {
  test('transfer handles same-chain happy path', async () => {
    const sendCalls: any[] = [];
    chainCoreMockState.getContractBasicImpl = async () => ({
      callViewMethod: async () => ({ data: {} }),
      callSendMethod: async (...args: any[]) => {
        sendCalls.push(args);
        return {
          transactionId: 'tx-same-chain',
          data: { Status: 'MINED' },
        };
      },
      encodedTx: async () => ({ data: 'RAW_TX' }),
    });

    const result = await transferCore.transfer(config, {
      privateKey: 'a'.repeat(64),
      to: 'ELF_receiver_AELF',
      symbol: 'ELF',
      amount: '100000000',
      memo: 'hi',
      chainId: 'AELF',
    });

    expect(result).toEqual({
      transactionId: 'tx-same-chain',
      status: 'MINED',
    });
    expect(sendCalls.length).toBe(1);
    expect(sendCalls[0]?.[0]).toBe('Transfer');
    expect(sendCalls[0]?.[2]).toEqual({
      symbol: 'ELF',
      to: 'receiver',
      amount: '100000000',
      memo: 'hi',
    });
  });

  test('crossChainTransfer uses token issueChainId and succeeds', async () => {
    const sendCalls: any[] = [];
    chainCoreMockState.getContractBasicImpl = async () => ({
      callViewMethod: async () => ({ data: { issueChainId: 8888888 } }),
      callSendMethod: async (...args: any[]) => {
        sendCalls.push(args);
        return {
          transactionId: 'tx-cross-chain',
          data: { Status: 'MINED' },
        };
      },
      encodedTx: async () => ({ data: 'RAW_TX' }),
    });
    chainCoreMockState.getChainNumberImpl = (chainId: string) => {
      if (chainId === 'AELF') return 9992731;
      if (chainId === 'tDVV') return 1866392;
      return 0;
    };

    const result = await transferCore.crossChainTransfer(config, {
      privateKey: 'b'.repeat(64),
      to: 'ELF_receiver_tDVV',
      symbol: 'ELF',
      amount: '200',
      memo: 'x',
      fromChainId: 'AELF',
    });

    expect(result.transactionId).toBe('tx-cross-chain');
    expect(sendCalls[0]?.[0]).toBe('CrossChainTransfer');
    expect(sendCalls[0]?.[2]).toEqual({
      issueChainId: 8888888,
      toChainId: 1866392,
      symbol: 'ELF',
      to: 'receiver',
      amount: '200',
      memo: 'x',
    });
  });

  test('crossChainTransfer falls back to getChainNumber when token issueChainId missing', async () => {
    const sendCalls: any[] = [];
    chainCoreMockState.getContractBasicImpl = async () => ({
      callViewMethod: async () => ({ data: {} }),
      callSendMethod: async (...args: any[]) => {
        sendCalls.push(args);
        return { transactionId: 'tx-fallback', data: { Status: 'MINED' } };
      },
      encodedTx: async () => ({ data: 'RAW_TX' }),
    });
    chainCoreMockState.getChainNumberImpl = (chainId: string) => {
      if (chainId === 'AELF') return 111;
      if (chainId === 'tDVV') return 222;
      return 0;
    };

    await transferCore.crossChainTransfer(config, {
      privateKey: 'c'.repeat(64),
      to: 'ELF_receiver_tDVV',
      symbol: 'USDT',
      amount: '1000',
      fromChainId: 'AELF',
    });

    expect(sendCalls[0]?.[2]?.issueChainId).toBe(111);
    expect(sendCalls[0]?.[2]?.toChainId).toBe(222);
  });

  test('crossChainTransfer throws when GetTokenInfo fails', async () => {
    chainCoreMockState.getContractBasicImpl = async () => ({
      callViewMethod: async () => ({ error: { message: 'boom-view' } }),
      callSendMethod: async () => ({ transactionId: 'tx' }),
      encodedTx: async () => ({ data: 'RAW_TX' }),
    });

    await expect(
      transferCore.crossChainTransfer(config, {
        privateKey: 'd'.repeat(64),
        to: 'ELF_receiver_tDVV',
        symbol: 'ELF',
        amount: '1',
        fromChainId: 'AELF',
      }),
    ).rejects.toThrow('Failed to get token info: boom-view');
  });

  test('crossChainTransfer throws when CrossChainTransfer send fails', async () => {
    chainCoreMockState.getContractBasicImpl = async () => ({
      callViewMethod: async () => ({ data: { issueChainId: 1 } }),
      callSendMethod: async () => ({ error: { message: 'boom-send' } }),
      encodedTx: async () => ({ data: 'RAW_TX' }),
    });

    await expect(
      transferCore.crossChainTransfer(config, {
        privateKey: 'e'.repeat(64),
        to: 'ELF_receiver_tDVV',
        symbol: 'ELF',
        amount: '2',
        fromChainId: 'AELF',
      }),
    ).rejects.toThrow('boom-send');
  });
});
