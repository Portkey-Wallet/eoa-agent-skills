#!/usr/bin/env bun
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { getConfig } from '../../lib/config.js';

// Core imports
import {
  createWallet,
  importWallet,
  getWalletInfo,
  listWallets,
  backupWallet,
  deleteWalletByAddress,
} from '../core/wallet.js';
import {
  getChainInfo,
  getTokenList,
  getTokenBalance,
  getTokenPrices,
  getNFTCollections,
  getNFTItems,
  getTransactionHistory,
  getTransactionDetail,
} from '../core/query.js';
import { transfer, crossChainTransfer } from '../core/transfer.js';
import {
  approve,
  callViewMethod,
  callSendMethod,
  estimateTransactionFee,
} from '../core/contract.js';
import {
  eBridgeTransfer,
  getEBridgeLimit,
  getEBridgeFee,
} from '../core/bridge.js';

// ============================================================
// Server setup
// ============================================================

const server = new McpServer({
  name: 'portkey-eoa-agent-skills',
  version: '1.0.0',
});

function ok(data: any) {
  return {
    content: [
      { type: 'text' as const, text: JSON.stringify(data, null, 2) },
    ],
  };
}

function fail(err: any) {
  return {
    content: [
      {
        type: 'text' as const,
        text: `[ERROR] ${err?.message || String(err)}`,
      },
    ],
    isError: true as const,
  };
}

// ============================================================
// Wallet Management Tools (6)
// ============================================================

server.registerTool(
  'portkey_create_wallet',
  {
    description:
      'Create a new EOA wallet on aelf blockchain. Generates a mnemonic and private key, encrypts them with the provided password, and stores the wallet locally. Use when a user needs a fresh wallet. Returns address and mnemonic (save the mnemonic — it cannot be recovered).',
    inputSchema: {
      name: z.string().optional().describe('Human-readable wallet name'),
      password: z
        .string()
        .describe('Password to encrypt the wallet private key and mnemonic'),
      network: z
        .enum(['mainnet'])
        .default('mainnet')
        .describe('Network (mainnet)'),
    },
  },
  async ({ name, password, network }) => {
    try {
      const config = getConfig(network);
      return ok(await createWallet(config, { name, password }));
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'portkey_import_wallet',
  {
    description:
      'Import an existing wallet using a 12-word mnemonic phrase or a 64-character hex private key. Encrypts and stores the wallet locally. Use when a user wants to use an existing wallet.',
    inputSchema: {
      mnemonic: z
        .string()
        .optional()
        .describe('12-word mnemonic phrase (space-separated)'),
      privateKey: z
        .string()
        .optional()
        .describe('64-character hex private key (with or without 0x prefix)'),
      password: z
        .string()
        .describe('Password to encrypt the wallet'),
      name: z.string().optional().describe('Human-readable wallet name'),
      network: z
        .enum(['mainnet'])
        .default('mainnet')
        .describe('Network (mainnet)'),
    },
  },
  async ({ mnemonic, privateKey, password, name, network }) => {
    try {
      const config = getConfig(network);
      return ok(
        await importWallet(config, { mnemonic, privateKey, password, name }),
      );
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'portkey_get_wallet_info',
  {
    description:
      'Get public information about a locally stored wallet (address, public key, name, network). Does not expose any secrets. Use to verify a wallet exists and see its details.',
    inputSchema: {
      address: z.string().describe('Wallet address to look up'),
      network: z
        .enum(['mainnet'])
        .default('mainnet')
        .describe('Network (mainnet)'),
    },
  },
  async ({ address, network }) => {
    try {
      const config = getConfig(network);
      return ok(await getWalletInfo(config, { address }));
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'portkey_list_wallets',
  {
    description:
      'List all locally stored wallets with their public info (address, name, network, creation date). Does not expose private keys or mnemonics. Use to see what wallets are available.',
    inputSchema: {
      network: z
        .enum(['mainnet'])
        .default('mainnet')
        .describe('Network (mainnet)'),
    },
  },
  async ({ network }) => {
    try {
      const config = getConfig(network);
      return ok(await listWallets(config));
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'portkey_backup_wallet',
  {
    description:
      'Export the mnemonic and/or private key of a locally stored wallet. DANGEROUS: reveals secret credentials. Use only when the user explicitly requests a backup. Requires the wallet password.',
    inputSchema: {
      address: z.string().describe('Wallet address to backup'),
      password: z.string().describe('Wallet encryption password'),
      network: z
        .enum(['mainnet'])
        .default('mainnet')
        .describe('Network (mainnet)'),
    },
  },
  async ({ address, password, network }) => {
    try {
      const config = getConfig(network);
      return ok(await backupWallet(config, { address, password }));
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'portkey_delete_wallet',
  {
    description:
      'Delete a locally stored wallet file. Requires the wallet password for verification — the password must be correct before the wallet is removed. Use when a user explicitly wants to remove a wallet from local storage.',
    inputSchema: {
      address: z.string().describe('Wallet address to delete'),
      password: z
        .string()
        .describe('Wallet password (must be correct to authorize deletion)'),
      network: z
        .enum(['mainnet'])
        .default('mainnet')
        .describe('Network (mainnet)'),
    },
  },
  async ({ address, password, network }) => {
    try {
      const config = getConfig(network);
      return ok(
        await deleteWalletByAddress(config, { address, password }),
      );
    } catch (err) {
      return fail(err);
    }
  },
);

// ============================================================
// Asset Query Tools (7)
// ============================================================

server.registerTool(
  'portkey_get_token_list',
  {
    description:
      'Get the full token list with balances and USD values for a wallet address. Returns all tokens the address holds across chains. Use to show a portfolio overview.',
    inputSchema: {
      address: z.string().describe('Wallet address'),
      chainId: z
        .string()
        .optional()
        .describe('Filter by chain ID (e.g. AELF, tDVV). Omit for all chains'),
      network: z
        .enum(['mainnet'])
        .default('mainnet')
        .describe('Network (mainnet)'),
    },
  },
  async ({ address, chainId, network }) => {
    try {
      const config = getConfig(network);
      return ok(await getTokenList(config, { address, chainId }));
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'portkey_get_token_balance',
  {
    description:
      'Get the balance of a specific token for a wallet address on a specific chain. Returns balance, USD value, and decimals. Use when checking a single token balance.',
    inputSchema: {
      address: z.string().describe('Wallet address'),
      symbol: z.string().describe('Token symbol (e.g. ELF, USDT)'),
      chainId: z.string().describe('Chain ID (e.g. AELF, tDVV)'),
      network: z
        .enum(['mainnet'])
        .default('mainnet')
        .describe('Network (mainnet)'),
    },
  },
  async ({ address, symbol, chainId, network }) => {
    try {
      const config = getConfig(network);
      return ok(
        await getTokenBalance(config, { address, symbol, chainId }),
      );
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'portkey_get_token_prices',
  {
    description:
      'Get current USD prices for one or more token symbols. Returns an array of {symbol, priceInUsd}. Use for price checks or portfolio valuation.',
    inputSchema: {
      symbols: z
        .array(z.string())
        .describe('Array of token symbols (e.g. ["ELF", "USDT"])'),
      network: z
        .enum(['mainnet'])
        .default('mainnet')
        .describe('Network (mainnet)'),
    },
  },
  async ({ symbols, network }) => {
    try {
      const config = getConfig(network);
      return ok(await getTokenPrices(config, { symbols }));
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'portkey_get_nft_collections',
  {
    description:
      'Get NFT collections owned by a wallet address. Returns collection name, image, item count, and symbol. Use to browse NFT holdings at the collection level.',
    inputSchema: {
      address: z.string().describe('Wallet address'),
      network: z
        .enum(['mainnet'])
        .default('mainnet')
        .describe('Network (mainnet)'),
    },
  },
  async ({ address, network }) => {
    try {
      const config = getConfig(network);
      return ok(await getNFTCollections(config, { address }));
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'portkey_get_nft_items',
  {
    description:
      'Get individual NFT items within a specific collection for a wallet address. Returns token ID, image, balance, and metadata. Use after getting collections to drill into a specific one.',
    inputSchema: {
      address: z.string().describe('Wallet address'),
      symbol: z
        .string()
        .describe('Collection symbol (from portkey_get_nft_collections)'),
      network: z
        .enum(['mainnet'])
        .default('mainnet')
        .describe('Network (mainnet)'),
    },
  },
  async ({ address, symbol, network }) => {
    try {
      const config = getConfig(network);
      return ok(await getNFTItems(config, { address, symbol }));
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'portkey_get_transaction_history',
  {
    description:
      'Get the transaction history for a wallet address with optional filters. Returns a paginated list of transactions with amount, type, status, and timestamps. Use to review past activity.',
    inputSchema: {
      address: z.string().describe('Wallet address'),
      chainId: z.string().optional().describe('Filter by chain ID'),
      symbol: z.string().optional().describe('Filter by token symbol'),
      skipCount: z.number().optional().describe('Pagination offset (default 0)'),
      maxResultCount: z
        .number()
        .optional()
        .describe('Page size (default 20)'),
      network: z
        .enum(['mainnet'])
        .default('mainnet')
        .describe('Network (mainnet)'),
    },
  },
  async ({ address, chainId, symbol, skipCount, maxResultCount, network }) => {
    try {
      const config = getConfig(network);
      return ok(
        await getTransactionHistory(config, {
          address,
          chainId,
          symbol,
          skipCount,
          maxResultCount,
        }),
      );
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'portkey_get_transaction_detail',
  {
    description:
      'Get full details of a specific transaction by its ID. Returns from/to addresses, amount, status, fee, and other metadata. Use when a user asks about a specific transaction.',
    inputSchema: {
      transactionId: z.string().describe('Transaction ID / hash'),
      blockHash: z.string().describe('Block hash containing the transaction'),
      chainId: z.string().describe('Chain ID where the transaction occurred'),
      address: z.string().describe('Wallet address (for context)'),
      network: z
        .enum(['mainnet'])
        .default('mainnet')
        .describe('Network (mainnet)'),
    },
  },
  async ({ transactionId, blockHash, chainId, address, network }) => {
    try {
      const config = getConfig(network);
      return ok(
        await getTransactionDetail(config, {
          transactionId,
          blockHash,
          chainId,
          address,
        }),
      );
    } catch (err) {
      return fail(err);
    }
  },
);

// ============================================================
// Transfer Tools (2)
// ============================================================

server.registerTool(
  'portkey_transfer',
  {
    description:
      'Send a same-chain token transfer on aelf. Transfers tokens from the signer wallet to a target address on the same chain. Use for regular token sends within one aelf sidechain.',
    inputSchema: {
      to: z
        .string()
        .describe('Recipient address (raw or ELF_address_chainId format)'),
      symbol: z.string().describe('Token symbol (e.g. ELF, USDT)'),
      amount: z
        .string()
        .describe('Amount in base units (smallest denomination)'),
      memo: z.string().optional().describe('Optional transfer memo'),
      chainId: z.string().describe('Chain ID (e.g. AELF, tDVV)'),
      privateKey: z
        .string()
        .optional()
        .describe(
          'Private key (hex). If omitted, uses PORTKEY_PRIVATE_KEY env or local wallet',
        ),
      address: z
        .string()
        .optional()
        .describe(
          'Local wallet address (used with password to decrypt private key)',
        ),
      password: z
        .string()
        .optional()
        .describe('Password for local wallet decryption'),
      network: z
        .enum(['mainnet'])
        .default('mainnet')
        .describe('Network (mainnet)'),
    },
  },
  async ({
    to,
    symbol,
    amount,
    memo,
    chainId,
    privateKey,
    address,
    password,
    network,
  }) => {
    try {
      const config = getConfig(network);
      return ok(
        await transfer(config, {
          to,
          symbol,
          amount,
          memo,
          chainId,
          privateKey,
          address,
          password,
        }),
      );
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'portkey_cross_chain_transfer',
  {
    description:
      'Send a cross-chain token transfer between aelf chains (e.g. AELF -> tDVV). The target chain is derived from the recipient address format (ELF_address_chainId). Use when transferring tokens between different aelf sidechains.',
    inputSchema: {
      to: z
        .string()
        .describe(
          'Recipient address in ELF_address_chainId format (chainId determines target chain)',
        ),
      symbol: z.string().describe('Token symbol (e.g. ELF)'),
      amount: z
        .string()
        .describe('Amount in base units'),
      memo: z.string().optional().describe('Optional transfer memo'),
      fromChainId: z.string().describe('Source chain ID (e.g. AELF)'),
      privateKey: z.string().optional().describe('Private key (hex)'),
      address: z.string().optional().describe('Local wallet address'),
      password: z.string().optional().describe('Wallet password'),
      network: z
        .enum(['mainnet'])
        .default('mainnet')
        .describe('Network (mainnet)'),
    },
  },
  async ({
    to,
    symbol,
    amount,
    memo,
    fromChainId,
    privateKey,
    address,
    password,
    network,
  }) => {
    try {
      const config = getConfig(network);
      return ok(
        await crossChainTransfer(config, {
          to,
          symbol,
          amount,
          memo,
          fromChainId,
          privateKey,
          address,
          password,
        }),
      );
    } catch (err) {
      return fail(err);
    }
  },
);

// ============================================================
// Contract Tools (4)
// ============================================================

server.registerTool(
  'portkey_approve',
  {
    description:
      'Approve a spender contract to spend tokens on behalf of the wallet owner (similar to ERC20 approve). Use before interacting with DeFi protocols or bridges that need token allowance.',
    inputSchema: {
      spender: z.string().describe('Spender contract address'),
      symbol: z.string().describe('Token symbol to approve'),
      amount: z
        .string()
        .describe('Approval amount in base units'),
      chainId: z.string().describe('Chain ID'),
      privateKey: z.string().optional().describe('Private key (hex)'),
      address: z.string().optional().describe('Local wallet address'),
      password: z.string().optional().describe('Wallet password'),
      network: z
        .enum(['mainnet'])
        .default('mainnet')
        .describe('Network (mainnet)'),
    },
  },
  async ({
    spender,
    symbol,
    amount,
    chainId,
    privateKey,
    address,
    password,
    network,
  }) => {
    try {
      const config = getConfig(network);
      return ok(
        await approve(config, {
          spender,
          symbol,
          amount,
          chainId,
          privateKey,
          address,
          password,
        }),
      );
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'portkey_call_view_method',
  {
    description:
      'Call a read-only (view) method on any aelf smart contract. Does not require a private key. Returns the method result. Use when querying on-chain state like GetBalance, GetTokenInfo, etc.',
    inputSchema: {
      contractAddress: z.string().describe('Smart contract address'),
      methodName: z.string().describe('Contract method name (e.g. GetBalance)'),
      params: z
        .any()
        .optional()
        .describe('Method parameters as a JSON object'),
      chainId: z.string().describe('Chain ID'),
      network: z
        .enum(['mainnet'])
        .default('mainnet')
        .describe('Network (mainnet)'),
    },
  },
  async ({ contractAddress, methodName, params, chainId, network }) => {
    try {
      const config = getConfig(network);
      return ok(
        await callViewMethod(config, {
          contractAddress,
          methodName,
          params,
          chainId,
        }),
      );
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'portkey_call_send_method',
  {
    description:
      'Call a state-changing (send) method on any aelf smart contract. Requires a private key for signing. Waits for the transaction to be mined and returns the transaction ID. Use for any on-chain write operation.',
    inputSchema: {
      contractAddress: z.string().describe('Smart contract address'),
      methodName: z.string().describe('Contract method name'),
      params: z.any().optional().describe('Method parameters as a JSON object'),
      chainId: z.string().describe('Chain ID'),
      privateKey: z.string().optional().describe('Private key (hex)'),
      address: z.string().optional().describe('Local wallet address'),
      password: z.string().optional().describe('Wallet password'),
      network: z
        .enum(['mainnet'])
        .default('mainnet')
        .describe('Network (mainnet)'),
    },
  },
  async ({
    contractAddress,
    methodName,
    params,
    chainId,
    privateKey,
    address,
    password,
    network,
  }) => {
    try {
      const config = getConfig(network);
      return ok(
        await callSendMethod(config, {
          contractAddress,
          methodName,
          params,
          chainId,
          privateKey,
          address,
          password,
        }),
      );
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'portkey_estimate_fee',
  {
    description:
      'Estimate the transaction fee for a contract call without actually executing it. Returns fee amounts by token symbol. Use before sending a transaction to show the user expected costs.',
    inputSchema: {
      contractAddress: z.string().describe('Smart contract address'),
      methodName: z.string().describe('Contract method name'),
      params: z.any().optional().describe('Method parameters as a JSON object'),
      chainId: z.string().describe('Chain ID'),
      privateKey: z.string().optional().describe('Private key (hex)'),
      address: z.string().optional().describe('Local wallet address'),
      password: z.string().optional().describe('Wallet password'),
      network: z
        .enum(['mainnet'])
        .default('mainnet')
        .describe('Network (mainnet)'),
    },
  },
  async ({
    contractAddress,
    methodName,
    params,
    chainId,
    privateKey,
    address,
    password,
    network,
  }) => {
    try {
      const config = getConfig(network);
      return ok(
        await estimateTransactionFee(config, {
          contractAddress,
          methodName,
          params,
          chainId,
          privateKey,
          address,
          password,
        }),
      );
    } catch (err) {
      return fail(err);
    }
  },
);

// ============================================================
// eBridge Tools (2)
// ============================================================

server.registerTool(
  'portkey_ebridge_transfer',
  {
    description:
      'Execute a cross-chain transfer via eBridge (aelf to/from EVM chains). Automatically handles allowance approval and receipt creation. Use when transferring tokens between aelf and Ethereum/BSC/etc.',
    inputSchema: {
      targetAddress: z
        .string()
        .describe('Recipient address on the target chain'),
      symbol: z.string().describe('Token symbol'),
      amount: z.string().describe('Amount in base units'),
      fromChainId: z.string().describe('Source aelf chain ID (e.g. AELF)'),
      toChainId: z
        .string()
        .describe('Target chain ID (e.g. Ethereum, BSC, or another aelf chain)'),
      bridgeContractAddress: z
        .string()
        .describe('eBridge contract address on the source chain'),
      privateKey: z.string().optional().describe('Private key (hex)'),
      address: z.string().optional().describe('Local wallet address'),
      password: z.string().optional().describe('Wallet password'),
      network: z
        .enum(['mainnet'])
        .default('mainnet')
        .describe('Network (mainnet)'),
    },
  },
  async ({
    targetAddress,
    symbol,
    amount,
    fromChainId,
    toChainId,
    bridgeContractAddress,
    privateKey,
    address,
    password,
    network,
  }) => {
    try {
      const config = getConfig(network);
      return ok(
        await eBridgeTransfer(config, {
          targetAddress,
          symbol,
          amount,
          fromChainId,
          toChainId,
          bridgeContractAddress,
          privateKey,
          address,
          password,
        }),
      );
    } catch (err) {
      return fail(err);
    }
  },
);

server.registerTool(
  'portkey_ebridge_info',
  {
    description:
      'Query eBridge transfer limits and fees for a cross-chain route. Returns daily limit, current remaining limit, and ELF fee. Use before an eBridge transfer to check if the amount is within limits.',
    inputSchema: {
      fromChainId: z.string().describe('Source chain ID'),
      toChainId: z.string().describe('Target chain ID'),
      symbol: z.string().describe('Token symbol'),
      bridgeContractAddress: z
        .string()
        .describe('eBridge contract address'),
      network: z
        .enum(['mainnet'])
        .default('mainnet')
        .describe('Network (mainnet)'),
    },
  },
  async ({
    fromChainId,
    toChainId,
    symbol,
    bridgeContractAddress,
    network,
  }) => {
    try {
      const config = getConfig(network);
      const [limit, fee] = await Promise.all([
        getEBridgeLimit(config, {
          fromChainId,
          toChainId,
          symbol,
          bridgeContractAddress,
        }),
        getEBridgeFee(config, {
          fromChainId,
          toChainId,
          bridgeContractAddress,
        }),
      ]);
      return ok({ ...limit, ...fee });
    } catch (err) {
      return fail(err);
    }
  },
);

// ============================================================
// Start server
// ============================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Portkey EOA Agent Skills MCP Server running on stdio');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
