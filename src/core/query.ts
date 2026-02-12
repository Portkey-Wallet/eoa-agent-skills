import type {
  PortkeyConfig,
  ChainInfo,
  TokenListParams,
  TokenListResult,
  TokenBalanceParams,
  TokenBalanceResult,
  TokenPricesParams,
  TokenPriceItem,
  NFTCollectionsParams,
  NFTCollectionsResult,
  NFTItemsParams,
  NFTItemsResult,
  TransactionHistoryParams,
  TransactionHistoryResult,
  TransactionDetailParams,
  ActivityItem,
} from '../../lib/types.js';
import {
  fetchTokenList,
  fetchTokenBalance,
  fetchTokenPrices,
  fetchNFTCollections,
  fetchNFTItems,
  fetchActivities,
  fetchActivity,
  fetchChainInfo as fetchChainInfoApi,
} from '../../lib/api.js';
import { setCachedChainInfo, isCacheValid } from '../../lib/config.js';

// ============================================================
// getChainInfo — Fetch chain list (RPC URLs, token contract, etc.)
// ============================================================

export async function getChainInfo(
  config: PortkeyConfig,
): Promise<ChainInfo[]> {
  const raw = await fetchChainInfoApi(config);
  const items: ChainInfo[] = Array.isArray(raw) ? raw : raw?.items || [];
  setCachedChainInfo(items, config.network);
  return items;
}

/**
 * Ensure chain info is loaded and cached.
 * Call this before any operation that needs RPC URLs.
 */
export async function ensureChainInfo(config: PortkeyConfig): Promise<void> {
  if (!isCacheValid(config.network)) {
    await getChainInfo(config);
  }
}

// ============================================================
// Token queries
// ============================================================

export async function getTokenList(
  config: PortkeyConfig,
  params: TokenListParams,
): Promise<TokenListResult> {
  const data = await fetchTokenList(config, params);
  return {
    data: data?.data || data || [],
    totalRecordCount: data?.totalRecordCount ?? 0,
    totalBalanceInUsd: data?.totalBalanceInUsd ?? '0',
  };
}

export async function getTokenBalance(
  config: PortkeyConfig,
  params: TokenBalanceParams,
): Promise<TokenBalanceResult> {
  const data = await fetchTokenBalance(config, params);
  return {
    balance: data?.balance ?? '0',
    balanceInUsd: data?.balanceInUsd ?? '0',
    decimals: data?.decimals ?? '8',
  };
}

export async function getTokenPrices(
  config: PortkeyConfig,
  params: TokenPricesParams,
): Promise<TokenPriceItem[]> {
  const data = await fetchTokenPrices(config, params);
  return data?.items || [];
}

// ============================================================
// NFT queries
// ============================================================

export async function getNFTCollections(
  config: PortkeyConfig,
  params: NFTCollectionsParams,
): Promise<NFTCollectionsResult> {
  const data = await fetchNFTCollections(config, params);
  return {
    data: data?.data || [],
    totalRecordCount: data?.totalRecordCount ?? 0,
  };
}

export async function getNFTItems(
  config: PortkeyConfig,
  params: NFTItemsParams,
): Promise<NFTItemsResult> {
  const data = await fetchNFTItems(config, params);
  return {
    data: data?.data || [],
    totalRecordCount: data?.totalRecordCount ?? 0,
  };
}

// ============================================================
// Transaction / Activity queries
// ============================================================

export async function getTransactionHistory(
  config: PortkeyConfig,
  params: TransactionHistoryParams,
): Promise<TransactionHistoryResult> {
  const data = await fetchActivities(config, params);
  return {
    data: data?.data || [],
    totalRecordCount: data?.totalRecordCount ?? 0,
    hasNextPage: data?.hasNextPage,
  };
}

export async function getTransactionDetail(
  config: PortkeyConfig,
  params: TransactionDetailParams,
): Promise<ActivityItem> {
  const data = await fetchActivity(config, params);
  if (!data) throw new Error('Transaction not found');
  return data;
}
