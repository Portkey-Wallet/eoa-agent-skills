// SDK Entry — re-export all core functions and types (zero logic)

// Core: Wallet management
export {
  createWallet,
  importWallet,
  getWalletInfo,
  listWallets,
  backupWallet,
  deleteWalletByAddress,
  resolvePrivateKey,
  createSignerFromWallet,
} from './src/core/wallet.js';

// Core: Queries
export {
  getChainInfo,
  ensureChainInfo,
  getTokenList,
  getTokenBalance,
  getTokenPrices,
  getNFTCollections,
  getNFTItems,
  getTransactionHistory,
  getTransactionDetail,
} from './src/core/query.js';

// Core: Transfers
export { transfer, crossChainTransfer } from './src/core/transfer.js';

// Core: Contract interactions
export {
  approve,
  callViewMethod,
  callSendMethod,
  estimateTransactionFee,
} from './src/core/contract.js';

// Core: eBridge
export {
  eBridgeTransfer,
  getEBridgeLimit,
  getEBridgeFee,
} from './src/core/bridge.js';

// Config
export { getConfig } from './lib/config.js';

// Crypto utilities
export { generateStrongPassword } from './lib/crypto.js';

// --- AelfSigner integration (for use with awaken/eforest DApp skills) ---
export type { AelfSigner } from '@portkey/aelf-signer';
export {
  createEoaSigner,
  createSignerFromEnv,
  EoaSigner,
} from '@portkey/aelf-signer';

// Types
export type {
  PortkeyConfig,
  NetworkType,
  ChainInfo,
  StoredWallet,
  WalletPublicInfo,
  CreateWalletParams,
  CreateWalletResult,
  ImportWalletParams,
  ImportWalletResult,
  GetWalletInfoParams,
  GetWalletInfoResult,
  BackupWalletParams,
  BackupWalletResult,
  TokenItem,
  TokenListParams,
  TokenListResult,
  TokenBalanceParams,
  TokenBalanceResult,
  TokenPricesParams,
  TokenPriceItem,
  NFTCollection,
  NFTCollectionsParams,
  NFTCollectionsResult,
  NFTItem,
  NFTItemsParams,
  NFTItemsResult,
  ActivityItem,
  TransactionHistoryParams,
  TransactionHistoryResult,
  TransactionDetailParams,
  TransferParams,
  TransferResult,
  CrossChainTransferParams,
  ApproveParams,
  CallViewMethodParams,
  CallSendMethodParams,
  CallSendMethodResult,
  EstimateFeeParams,
  EstimateFeeResult,
  EBridgeTransferParams,
  EBridgeLimitParams,
  EBridgeLimitResult,
  EBridgeFeeParams,
  EBridgeFeeResult,
} from './lib/types.js';
