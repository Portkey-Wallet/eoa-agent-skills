import { mock } from 'bun:test';
import AElf from 'aelf-sdk';

const DEFAULT_READONLY_PRIVATE_KEY =
  'f6e512a3c259e5f9af981d7f99d245aa5bc52fe448495e0b0dd56e8406be6f71';

type ContractBasicParams = {
  contractAddress: string;
  rpcUrl: string;
  privateKey?: string;
};

type MockContract = {
  callViewMethod: (methodName: string, params?: any) => Promise<any>;
  callSendMethod: (
    methodName: string,
    account: string,
    params?: any,
    sendOptions?: any,
  ) => Promise<any>;
  encodedTx: (methodName: string, params?: any) => Promise<any>;
};

type ChainCoreMockState = {
  getContractBasicCalls: ContractBasicParams[];
  getContractBasicImpl: (params: ContractBasicParams) => Promise<MockContract>;
  getWalletImpl: (privateKey?: string) => { address: string; privateKey?: string };
  getChainNumberImpl: (chainId: string) => number;
  getAelfAddressImpl: (value: string) => string;
  getChainIdFromAddressImpl: (value: string) => string | undefined;
  getAelfInstanceImpl: (rpcUrl: string) => any;
  getTxResultImpl: (...args: any[]) => Promise<any>;
};

const defaultState = (): ChainCoreMockState => ({
  getContractBasicCalls: [],
  getContractBasicImpl: async () => ({
    callViewMethod: async () => ({ data: {} }),
    callSendMethod: async () => ({
      transactionId: 'tx-mock',
      data: { Status: 'MINED' },
    }),
    encodedTx: async () => ({ data: 'RAW_TX' }),
  }),
  getWalletImpl: (privateKey?: string) =>
    AElf.wallet.getWalletByPrivateKey(privateKey || DEFAULT_READONLY_PRIVATE_KEY),
  getChainNumberImpl: (chainId: string) => {
    if (chainId === 'AELF') return 9992731;
    if (chainId === 'tDVV') return 1866392;
    if (chainId === 'tDVW') return 1931928;
    return 0;
  },
  getAelfAddressImpl: (value: string) => value.replace(/^ELF_/, '').split('_')[0] || value,
  getChainIdFromAddressImpl: (value: string) => {
    const parts = value.split('_');
    return parts.length === 3 ? parts[2] : undefined;
  },
  getAelfInstanceImpl: () => ({}),
  getTxResultImpl: async () => ({ Status: 'MINED' }),
});

const g = globalThis as any;
export const chainCoreMockState: ChainCoreMockState =
  g.__EOA_CHAIN_CORE_MOCK_STATE || (g.__EOA_CHAIN_CORE_MOCK_STATE = defaultState());

export function resetChainCoreMockState(): void {
  const d = defaultState();
  chainCoreMockState.getContractBasicCalls = d.getContractBasicCalls;
  chainCoreMockState.getContractBasicImpl = d.getContractBasicImpl;
  chainCoreMockState.getWalletImpl = d.getWalletImpl;
  chainCoreMockState.getChainNumberImpl = d.getChainNumberImpl;
  chainCoreMockState.getAelfAddressImpl = d.getAelfAddressImpl;
  chainCoreMockState.getChainIdFromAddressImpl = d.getChainIdFromAddressImpl;
  chainCoreMockState.getAelfInstanceImpl = d.getAelfInstanceImpl;
  chainCoreMockState.getTxResultImpl = d.getTxResultImpl;
}

export function installChainCoreModuleMocks(): void {
  if (g.__EOA_CHAIN_CORE_MOCKS_INSTALLED) return;
  g.__EOA_CHAIN_CORE_MOCKS_INSTALLED = true;

  mock.module('../../lib/aelf.js', () => ({
    getContractBasic: async (params: ContractBasicParams) => {
      chainCoreMockState.getContractBasicCalls.push(params);
      return chainCoreMockState.getContractBasicImpl(params);
    },
    getWallet: (privateKey?: string) =>
      chainCoreMockState.getWalletImpl(privateKey),
    createNewWallet: () => AElf.wallet.createNewWallet(),
    getWalletByMnemonic: (mnemonic: string) =>
      AElf.wallet.getWalletByMnemonic(mnemonic),
    getChainNumber: (chainId: string) =>
      chainCoreMockState.getChainNumberImpl(chainId),
    getAelfAddress: (value: string) =>
      chainCoreMockState.getAelfAddressImpl(value),
    getChainIdFromAddress: (value: string) =>
      chainCoreMockState.getChainIdFromAddressImpl(value),
    getAelfInstance: (rpcUrl: string) =>
      chainCoreMockState.getAelfInstanceImpl(rpcUrl),
    getTxResult: (...args: any[]) =>
      chainCoreMockState.getTxResultImpl(...args),
    isAelfAddress: (value?: string) => {
      if (!value) return false;
      try {
        AElf.utils.decodeAddressRep(value);
        return true;
      } catch {
        return false;
      }
    },
    isCrossChain: (toAddress: string, fromChainId: string) => {
      const toChainId = chainCoreMockState.getChainIdFromAddressImpl(toAddress);
      if (!toChainId) return false;
      return toChainId !== fromChainId;
    },
  }));
}
