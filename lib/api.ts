import type { PortkeyConfig, AddressInfo } from './types.js';
import { getAelfAddress, getChainIdFromAddress } from './aelf.js';
import {
  ACTIVITY_IMAGE_SIZE,
  CHAIN_IDS,
  DEFAULT_TIMEOUT_MS,
  NFT_IMAGE_SIZE,
} from './constants.js';
import { SkillError } from './errors.js';

// ============================================================
// Generic HTTP helpers
// ============================================================

async function request<T>(
  baseUrl: string,
  path: string,
  options: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    params?: Record<string, any>;
    body?: any;
    timeout?: number;
  },
): Promise<T> {
  const { method, params, body, timeout = DEFAULT_TIMEOUT_MS } = options;

  let url = `${baseUrl}${path}`;
  if (method === 'GET' && params) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) {
        qs.set(k, Array.isArray(v) ? v.join(',') : String(v));
      }
    }
    const qsStr = qs.toString();
    if (qsStr) url += `?${qsStr}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/plain;v=1.0',
      },
      body: method !== 'GET' ? JSON.stringify(body ?? params) : undefined,
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new SkillError('UPSTREAM_ERROR', `API error ${res.status}: ${text || res.statusText}`);
    }

    const json = await res.json();
    // Backend wraps responses in { data: ... }
    return (json?.data !== undefined ? json.data : json) as T;
  } finally {
    clearTimeout(timer);
  }
}

// ============================================================
// Helper to build addressInfos from a single address
// ============================================================

function buildAddressInfos(
  rawAddress: string,
  chainId?: string,
): AddressInfo[] {
  // Strip ELF_xxx_ChainId format → raw address, and extract chainId if embedded
  const address = getAelfAddress(rawAddress);
  const resolvedChainId = chainId ?? getChainIdFromAddress(rawAddress);

  if (resolvedChainId) {
    return [{ chainId: resolvedChainId, address }];
  }
  // If no specific chainId, include common aelf chains
  return [
    { chainId: CHAIN_IDS.AELF, address },
    { chainId: CHAIN_IDS.TDVV, address },
    { chainId: CHAIN_IDS.TDVW, address },
  ];
}

// ============================================================
// Token / Asset APIs
// ============================================================

export async function fetchTokenList(
  config: PortkeyConfig,
  params: {
    address: string;
    chainId?: string;
    skipCount?: number;
    maxResultCount?: number;
  },
) {
  const addressInfos = buildAddressInfos(params.address, params.chainId);
  return request<any>(config.apiUrl, '/api/app/user/assets/token', {
    method: 'POST',
    body: {
      addressInfos,
      skipCount: params.skipCount ?? 0,
      maxResultCount: params.maxResultCount ?? 100,
    },
  });
}

export async function fetchTokenBalance(
  config: PortkeyConfig,
  params: { address: string; symbol: string; chainId: string },
) {
  return request<any>(config.apiUrl, '/api/app/user/assets/tokenBalance', {
    method: 'GET',
    params: {
      symbol: params.symbol,
      chainId: params.chainId,
      address: params.address,
    },
  });
}

export async function fetchTokenPrices(
  config: PortkeyConfig,
  params: { symbols: string[] },
) {
  return request<any>(config.apiUrl, '/api/app/tokens/prices', {
    method: 'GET',
    params: { symbols: params.symbols.join(',') },
  });
}

// ============================================================
// NFT APIs
// ============================================================

export async function fetchNFTCollections(
  config: PortkeyConfig,
  params: {
    address: string;
    skipCount?: number;
    maxResultCount?: number;
  },
) {
  const addressInfos = buildAddressInfos(params.address);
  return request<any>(config.apiUrl, '/api/app/user/assets/nftCollections', {
    method: 'POST',
    body: {
      addressInfos,
      skipCount: params.skipCount ?? 0,
      maxResultCount: params.maxResultCount ?? 50,
      ...NFT_IMAGE_SIZE,
    },
  });
}

export async function fetchNFTItems(
  config: PortkeyConfig,
  params: {
    address: string;
    symbol: string;
    skipCount?: number;
    maxResultCount?: number;
  },
) {
  const addressInfos = buildAddressInfos(params.address);
  return request<any>(config.apiUrl, '/api/app/user/assets/nftItems', {
    method: 'POST',
    body: {
      addressInfos,
      symbol: params.symbol,
      skipCount: params.skipCount ?? 0,
      maxResultCount: params.maxResultCount ?? 50,
      ...NFT_IMAGE_SIZE,
    },
  });
}

export async function fetchNFTItem(
  config: PortkeyConfig,
  params: { address: string; symbol: string },
) {
  const addressInfos = buildAddressInfos(params.address);
  return request<any>(config.apiUrl, '/api/app/user/assets/nftItem', {
    method: 'POST',
    body: { addressInfos, symbol: params.symbol, ...NFT_IMAGE_SIZE },
  });
}

// ============================================================
// Activity / Transaction APIs
// ============================================================

export async function fetchActivities(
  config: PortkeyConfig,
  params: {
    address: string;
    chainId?: string;
    symbol?: string;
    skipCount?: number;
    maxResultCount?: number;
  },
) {
  const addressInfos = buildAddressInfos(params.address, params.chainId);
  return request<any>(config.apiUrl, '/api/app/user/activities/activities', {
    method: 'POST',
    body: {
      addressInfos,
      chainId: params.chainId ?? '',
      symbol: params.symbol ?? '',
      skipCount: params.skipCount ?? 0,
      maxResultCount: params.maxResultCount ?? 20,
      ...ACTIVITY_IMAGE_SIZE,
    },
  });
}

export async function fetchActivity(
  config: PortkeyConfig,
  params: {
    transactionId: string;
    blockHash: string;
    chainId: string;
    address: string;
  },
) {
  const addressInfos = buildAddressInfos(params.address, params.chainId);
  return request<any>(config.apiUrl, '/api/app/user/activities/activity', {
    method: 'POST',
    body: {
      transactionId: params.transactionId,
      blockHash: params.blockHash,
      addressInfos,
      chainId: params.chainId,
      ...ACTIVITY_IMAGE_SIZE,
    },
  });
}

// ============================================================
// Chain Info API
// ============================================================

export async function fetchChainInfo(config: PortkeyConfig) {
  return request<any>(config.apiUrl, '/api/app/search/chainsinfoindex', {
    method: 'GET',
  });
}

// ============================================================
// Token Management API
// ============================================================

export async function displayUserToken(
  config: PortkeyConfig,
  params: {
    id?: string;
    chainId: string;
    symbol: string;
    isDisplay: boolean;
    address: string;
  },
) {
  return request<any>(config.apiUrl, '/api/app/v2/userTokens', {
    method: 'PUT',
    body: params,
  });
}

export async function fetchPopularTokens(
  config: PortkeyConfig,
  params: {
    chainIds?: string[];
    keyword?: string;
    skipCount?: number;
    maxResultCount?: number;
  },
) {
  return request<any>(config.apiUrl, '/api/app/v2/userTokens', {
    method: 'GET',
    params: {
      chainIds: params.chainIds?.join(','),
      keyword: params.keyword,
      skipCount: params.skipCount ?? 0,
      maxResultCount: params.maxResultCount ?? 50,
    },
  });
}
