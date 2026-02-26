import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import {
  fetchChainInfo,
  fetchTokenBalance,
  fetchTokenList,
  fetchTokenPrices,
} from '../../lib/api.js';

const originalFetch = globalThis.fetch;
const config = { network: 'mainnet' as const, apiUrl: 'https://api.mock' };

beforeEach(() => {
  globalThis.fetch = originalFetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('lib/api request helpers', () => {
  test('GET request builds query string and no body', async () => {
    const calls: any[] = [];
    globalThis.fetch = (async (url: string, init: any) => {
      calls.push({ url: String(url), init });
      return {
        ok: true,
        json: async () => ({ data: { balance: '100', balanceInUsd: '12' } }),
      } as any;
    }) as any;

    const result = await fetchTokenBalance(config, {
      address: 'ELF_address_AELF',
      symbol: 'ELF',
      chainId: 'AELF',
    });

    expect(result).toEqual({ balance: '100', balanceInUsd: '12' });
    expect(calls.length).toBe(1);
    expect(calls[0]?.init?.method).toBe('GET');
    expect(calls[0]?.init?.body).toBeUndefined();
    expect(calls[0]?.url).toContain('/api/app/user/assets/tokenBalance?');
    expect(calls[0]?.url).toContain('symbol=ELF');
    expect(calls[0]?.url).toContain('chainId=AELF');
    expect(calls[0]?.url).toContain('address=ELF_address_AELF');
  });

  test('POST request sends json body and unwraps { data: ... }', async () => {
    const calls: any[] = [];
    globalThis.fetch = (async (url: string, init: any) => {
      calls.push({ url: String(url), init });
      return {
        ok: true,
        json: async () => ({
          data: { data: [{ symbol: 'ELF' }], totalRecordCount: 1 },
        }),
      } as any;
    }) as any;

    const result = await fetchTokenList(config, {
      address: 'ELF_myAddress_AELF',
      chainId: 'AELF',
      skipCount: 1,
      maxResultCount: 2,
    });

    expect(result).toEqual({
      data: [{ symbol: 'ELF' }],
      totalRecordCount: 1,
    });
    expect(calls.length).toBe(1);
    expect(calls[0]?.init?.method).toBe('POST');

    const payload = JSON.parse(calls[0]?.init?.body || '{}');
    expect(payload).toMatchObject({
      skipCount: 1,
      maxResultCount: 2,
      addressInfos: [{ chainId: 'AELF', address: 'myAddress' }],
    });
  });

  test('request returns raw json when backend does not wrap by data', async () => {
    globalThis.fetch = (async (_url: string, init: any) => {
      expect(init.method).toBe('GET');
      return {
        ok: true,
        json: async () => ({ items: [{ chainId: 'AELF' }] }),
      } as any;
    }) as any;

    const result = await fetchChainInfo(config);
    expect(result).toEqual({ items: [{ chainId: 'AELF' }] });
  });

  test('request throws on non-2xx response and supports array query params', async () => {
    const calls: any[] = [];
    globalThis.fetch = (async (url: string) => {
      calls.push(String(url));
      return {
        ok: false,
        status: 502,
        statusText: 'Bad Gateway',
        text: async () => 'upstream down',
      } as any;
    }) as any;

    await expect(
      fetchTokenPrices(config, { symbols: ['ELF', 'USDT'] }),
    ).rejects.toThrow('API error 502: upstream down');

    expect(calls[0]).toContain('symbols=ELF%2CUSDT');
  });
});
