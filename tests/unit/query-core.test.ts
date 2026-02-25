import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { getCachedChainInfo, setCachedChainInfo } from '../../lib/config.js';
import {
  ensureChainInfo,
  getTokenList,
  getTokenBalance,
  getTokenPrices,
  getNFTCollections,
  getNFTItems,
  getTransactionHistory,
  getTransactionDetail,
} from '../../src/core/query.js';

const originalFetch = globalThis.fetch;
const config = { network: 'mainnet' as const, apiUrl: 'https://api.mock' };

beforeEach(() => {
  globalThis.fetch = originalFetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('core/query', () => {
  test('ensureChainInfo fetches on cache miss and skips on cache hit', async () => {
    const calls: string[] = [];
    setCachedChainInfo([], 'unknown-network');

    globalThis.fetch = (async (url: string) => {
      calls.push(String(url));
      return {
        ok: true,
        json: async () => ({
          data: {
            items: [
              {
                chainId: 'AELF',
                chainName: 'AELF',
                endPoint: 'https://rpc.aelf',
                explorerUrl: '',
                caContractAddress: 'CA',
                defaultToken: {
                  name: 'ELF',
                  address: 'TOKEN',
                  imageUrl: '',
                  symbol: 'ELF',
                  decimals: '8',
                },
              },
            ],
          },
        }),
      } as any;
    }) as any;

    await ensureChainInfo(config);
    expect(calls.length).toBe(1);
    expect(getCachedChainInfo()?.[0]?.chainId).toBe('AELF');

    await ensureChainInfo(config);
    expect(calls.length).toBe(1);
  });

  test('normalizes token/nft/history responses', async () => {
    globalThis.fetch = (async (url: string) => {
      const path = new URL(String(url)).pathname;

      if (path.endsWith('/api/app/user/assets/token')) {
        return {
          ok: true,
          json: async () => ({
            data: {
              data: [{ symbol: 'ELF' }],
              totalRecordCount: 1,
              totalBalanceInUsd: '12.34',
            },
          }),
        } as any;
      }

      if (path.endsWith('/api/app/user/assets/tokenBalance')) {
        return {
          ok: true,
          json: async () => ({ data: {} }),
        } as any;
      }

      if (path.endsWith('/api/app/tokens/prices')) {
        return {
          ok: true,
          json: async () => ({ data: { items: [{ symbol: 'ELF', priceInUsd: 1.2 }] } }),
        } as any;
      }

      if (path.endsWith('/api/app/user/assets/nftCollections')) {
        return {
          ok: true,
          json: async () => ({ data: { data: [{ symbol: 'NFT-1' }], totalRecordCount: 1 } }),
        } as any;
      }

      if (path.endsWith('/api/app/user/assets/nftItems')) {
        return {
          ok: true,
          json: async () => ({ data: { data: [{ symbol: 'NFT-ITEM' }], totalRecordCount: 2 } }),
        } as any;
      }

      if (path.endsWith('/api/app/user/activities/activities')) {
        return {
          ok: true,
          json: async () => ({
            data: {
              data: [{ transactionId: 'tx1' }],
              totalRecordCount: 1,
              hasNextPage: true,
            },
          }),
        } as any;
      }

      return {
        ok: true,
        json: async () => ({ data: {} }),
      } as any;
    }) as any;

    const tokenList = await getTokenList(config, { address: 'ELF_addr_AELF' });
    expect(tokenList).toEqual({
      data: [{ symbol: 'ELF' }],
      totalRecordCount: 1,
      totalBalanceInUsd: '12.34',
    });

    const tokenBalance = await getTokenBalance(config, {
      address: 'ELF_addr_AELF',
      symbol: 'ELF',
      chainId: 'AELF',
    });
    expect(tokenBalance).toEqual({
      balance: '0',
      balanceInUsd: '0',
      decimals: '8',
    });

    const prices = await getTokenPrices(config, { symbols: ['ELF'] });
    expect(prices).toEqual([{ symbol: 'ELF', priceInUsd: 1.2 }]);

    const collections = await getNFTCollections(config, { address: 'ELF_addr_AELF' });
    expect(collections).toEqual({
      data: [{ symbol: 'NFT-1' }],
      totalRecordCount: 1,
    });

    const items = await getNFTItems(config, {
      address: 'ELF_addr_AELF',
      symbol: 'NFT',
    });
    expect(items).toEqual({
      data: [{ symbol: 'NFT-ITEM' }],
      totalRecordCount: 2,
    });

    const history = await getTransactionHistory(config, { address: 'ELF_addr_AELF' });
    expect(history).toEqual({
      data: [{ transactionId: 'tx1' }],
      totalRecordCount: 1,
      hasNextPage: true,
    });
  });

  test('getTransactionDetail throws when activity not found', async () => {
    globalThis.fetch = (async () =>
      ({
        ok: true,
        json: async () => ({ data: null }),
      }) as any) as any;

    await expect(
      getTransactionDetail(config, {
        transactionId: 'tx-not-found',
        blockHash: 'block',
        chainId: 'AELF',
        address: 'ELF_addr_AELF',
      }),
    ).rejects.toThrow('Transaction not found');
  });
});
