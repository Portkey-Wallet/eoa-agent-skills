import type { NetworkType, PortkeyConfig, ChainInfo } from './types.js';

// ============================================================
// Network Defaults
// ============================================================

const NETWORK_DEFAULTS: Record<NetworkType, { apiUrl: string }> = {
  mainnet: {
    apiUrl: 'https://eoa-portkey.portkey.finance',
  },
};

// ============================================================
// Config Factory
// ============================================================

/**
 * Build a PortkeyConfig with the following priority:
 *   function param > env var > code default
 */
export function getConfig(networkOverride?: string): PortkeyConfig {
  const network = (networkOverride ||
    process.env.PORTKEY_NETWORK ||
    'mainnet') as NetworkType;

  const defaults = NETWORK_DEFAULTS[network];
  if (!defaults) {
    throw new Error(
      `Unknown network "${network}". Supported: mainnet`,
    );
  }

  return {
    network,
    apiUrl: process.env.PORTKEY_API_URL || defaults.apiUrl,
  };
}

// ============================================================
// Chain Info Cache
// ============================================================

let chainInfoCache: ChainInfo[] | null = null;
let chainInfoCacheNetwork: string | null = null;

export function getCachedChainInfo(): ChainInfo[] | null {
  return chainInfoCache;
}

export function setCachedChainInfo(
  info: ChainInfo[],
  network: string,
): void {
  chainInfoCache = info;
  chainInfoCacheNetwork = network;
}

export function isCacheValid(network: string): boolean {
  return chainInfoCacheNetwork === network && chainInfoCache !== null;
}

/**
 * Get RPC URL for a given chainId.
 * Requires chain info to be cached first (call getChainInfo from core/query).
 */
export function getRpcUrl(chainId: string): string {
  if (!chainInfoCache) {
    throw new Error(
      'Chain info not loaded. Call getChainInfo() first to populate the cache.',
    );
  }
  const chain = chainInfoCache.find((c) => c.chainId === chainId);
  if (!chain) {
    throw new Error(
      `Chain "${chainId}" not found. Available: ${chainInfoCache.map((c) => c.chainId).join(', ')}`,
    );
  }
  return chain.endPoint;
}

/**
 * Get token contract address for a given chainId (the default token contract).
 */
export function getTokenContractAddress(chainId: string): string {
  if (!chainInfoCache) {
    throw new Error(
      'Chain info not loaded. Call getChainInfo() first to populate the cache.',
    );
  }
  const chain = chainInfoCache.find((c) => c.chainId === chainId);
  if (!chain) {
    throw new Error(`Chain "${chainId}" not found.`);
  }
  return chain.defaultToken.address;
}
