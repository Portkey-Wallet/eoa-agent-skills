// ============================================================
// Network & Config Types
// ============================================================

export type NetworkType = 'mainnet';

export interface PortkeyConfig {
  network: NetworkType;
  apiUrl: string;
}

export interface ChainInfo {
  chainId: string;
  chainName: string;
  endPoint: string; // RPC URL
  explorerUrl: string;
  caContractAddress: string;
  defaultToken: {
    name: string;
    address: string;
    imageUrl: string;
    symbol: string;
    decimals: string;
  };
}

// ============================================================
// Wallet Types
// ============================================================

export interface StoredWallet {
  name: string;
  address: string;
  publicKey: { x: string; y: string };
  AESEncryptPrivateKey: string;
  AESEncryptMnemonic: string; // empty string for private-key-only imports
  createdAt: string;
  network: string;
}

/**
 * Public-facing wallet info (no secrets).
 * Used by listWallets and getWalletInfo to avoid leaking encrypted credentials.
 */
export interface WalletPublicInfo {
  address: string;
  publicKey: { x: string; y: string };
  name: string;
  network: string;
  createdAt: string;
}

export interface CreateWalletParams {
  name?: string;
  password?: string; // optional — auto-generated if omitted
  redactMnemonic?: boolean; // if true, mnemonic is NOT returned (already encrypted in wallet file, recoverable via wallet backup)
}

export interface CreateWalletResult {
  address: string;
  mnemonic?: string; // omitted when redactMnemonic is true
  mnemonicHint?: string; // recovery guidance when mnemonic is redacted
  passwordGenerated?: boolean; // true if password was auto-generated
  password?: string; // included only when auto-generated
}

export interface ImportWalletParams {
  password?: string; // optional — auto-generated if omitted
  mnemonic?: string;
  privateKey?: string;
  name?: string;
}

export interface ImportWalletResult {
  address: string;
  passwordGenerated?: boolean; // true if password was auto-generated
  password?: string; // included only when auto-generated
}

export interface GetWalletInfoParams {
  address: string;
}

export interface GetWalletInfoResult {
  address: string;
  publicKey: { x: string; y: string };
  name: string;
  network: string;
  createdAt: string;
}

export interface BackupWalletParams {
  address: string;
  password: string;
}

export interface BackupWalletResult {
  mnemonic?: string;
  privateKey: string;
}

// ============================================================
// Token / Asset Types
// ============================================================

export interface AddressInfo {
  chainId: string;
  address: string;
}

export interface TokenItem {
  chainId: string;
  symbol: string;
  price: number;
  balance: string;
  decimals: number;
  balanceInUsd: string;
  tokenContractAddress: string;
  imageUrl: string;
  label?: string;
}

export interface TokenListParams {
  address: string;
  chainId?: string;
  skipCount?: number;
  maxResultCount?: number;
}

export interface TokenListResult {
  data: TokenItem[];
  totalRecordCount: number;
  totalBalanceInUsd: string;
}

export interface TokenBalanceParams {
  address: string;
  symbol: string;
  chainId: string;
}

export interface TokenBalanceResult {
  balance: string;
  balanceInUsd: string;
  decimals: string;
}

export interface TokenPriceItem {
  symbol: string;
  priceInUsd: number;
}

export interface TokenPricesParams {
  symbols: string[];
}

// ============================================================
// NFT Types
// ============================================================

export interface NFTCollection {
  chainId: string;
  collectionName: string;
  imageUrl: string;
  itemCount: number;
  symbol: string;
}

export interface NFTCollectionsParams {
  address: string;
  skipCount?: number;
  maxResultCount?: number;
}

export interface NFTCollectionsResult {
  data: NFTCollection[];
  totalRecordCount: number;
}

export interface NFTItem {
  alias: string;
  balance: string;
  chainId: string;
  imageLargeUrl: string;
  imageUrl: string;
  symbol: string;
  tokenContractAddress: string;
  tokenId: string;
  totalSupply: string;
}

export interface NFTItemsParams {
  address: string;
  symbol: string;
  skipCount?: number;
  maxResultCount?: number;
}

export interface NFTItemsResult {
  data: NFTItem[];
  totalRecordCount: number;
}

// ============================================================
// Activity / Transaction Types
// ============================================================

export interface ActivityItem {
  transactionId: string;
  blockHash: string;
  transactionType: string;
  transactionName: string;
  from: string;
  to: string;
  fromAddress: string;
  toAddress: string;
  fromChainId: string;
  toChainId: string;
  amount: string;
  symbol: string;
  decimals: string;
  status: string;
  timestamp: string;
  nftInfo?: {
    nftId: string;
    imageUrl: string;
    alias: string;
  };
  priceInUsd?: string;
  isReceived?: boolean;
}

export interface TransactionHistoryParams {
  address: string;
  chainId?: string;
  symbol?: string;
  skipCount?: number;
  maxResultCount?: number;
}

export interface TransactionHistoryResult {
  data: ActivityItem[];
  totalRecordCount: number;
  hasNextPage?: boolean;
}

export interface TransactionDetailParams {
  transactionId: string;
  blockHash: string;
  chainId: string;
  address: string;
}

// ============================================================
// Transfer Types
// ============================================================

export interface TransferParams {
  privateKey?: string;
  address?: string;
  password?: string;
  to: string;
  symbol: string;
  amount: string;
  memo?: string;
  chainId: string;
}

export interface TransferResult {
  transactionId: string;
  status: string;
}

export interface CrossChainTransferParams {
  privateKey?: string;
  address?: string;
  password?: string;
  to: string;
  symbol: string;
  amount: string;
  memo?: string;
  fromChainId: string;
}

// ============================================================
// Contract Interaction Types
// ============================================================

export interface ApproveParams {
  privateKey?: string;
  address?: string;
  password?: string;
  spender: string;
  symbol: string;
  amount: string;
  chainId: string;
}

export interface CallViewMethodParams {
  contractAddress: string;
  methodName: string;
  params?: any;
  chainId: string;
}

export interface CallSendMethodParams {
  privateKey?: string;
  address?: string;
  password?: string;
  contractAddress: string;
  methodName: string;
  params?: any;
  chainId: string;
}

export interface CallSendMethodResult {
  transactionId: string;
}

export interface EstimateFeeParams {
  privateKey?: string;
  address?: string;
  password?: string;
  contractAddress: string;
  methodName: string;
  params?: any;
  chainId: string;
}

export interface EstimateFeeResult {
  fee: Record<string, number>;
}

// ============================================================
// eBridge Types
// ============================================================

export interface EBridgeTransferParams {
  privateKey?: string;
  address?: string;
  password?: string;
  targetAddress: string;
  symbol: string;
  amount: string;
  fromChainId: string;
  toChainId: string;
  bridgeContractAddress: string;
}

export interface EBridgeLimitParams {
  fromChainId: string;
  toChainId: string;
  symbol: string;
  bridgeContractAddress: string;
}

export interface EBridgeLimitResult {
  dailyLimit: string;
  currentLimit: string;
}

export interface EBridgeFeeParams {
  fromChainId: string;
  toChainId: string;
  bridgeContractAddress: string;
}

export interface EBridgeFeeResult {
  fee: string;
}
