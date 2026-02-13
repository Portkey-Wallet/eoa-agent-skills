#!/usr/bin/env bun
import { Command } from 'commander';
import { getConfig } from './lib/config.js';
import { outputSuccess, outputError } from './cli-helpers.js';

import {
  createWallet,
  importWallet,
  getWalletInfo,
  listWallets,
  backupWallet,
  deleteWalletByAddress,
} from './src/core/wallet.js';
import {
  getChainInfo,
  getTokenList,
  getTokenBalance,
  getTokenPrices,
  getNFTCollections,
  getNFTItems,
  getTransactionHistory,
  getTransactionDetail,
} from './src/core/query.js';
import { transfer, crossChainTransfer } from './src/core/transfer.js';
import {
  approve,
  callViewMethod,
  callSendMethod,
  estimateTransactionFee,
} from './src/core/contract.js';

const program = new Command();

program
  .name('portkey-eoa')
  .version('1.0.0')
  .description('Portkey EOA Wallet Agent Skills CLI')
  .option('--network <network>', 'Network (default: mainnet)', 'mainnet');

// ============================================================
// Wallet commands
// ============================================================

const wallet = program.command('wallet').description('Wallet management');

wallet
  .command('create')
  .description('Create a new wallet')
  .requiredOption('--password <password>', 'Encryption password')
  .option('--name <name>', 'Wallet name')
  .action(async (opts) => {
    try {
      const config = getConfig(program.opts().network);
      const result = await createWallet(config, {
        password: opts.password,
        name: opts.name,
      });
      outputSuccess(result);
    } catch (err: any) {
      outputError(err.message);
    }
  });

wallet
  .command('import')
  .description('Import a wallet from mnemonic or private key')
  .requiredOption('--password <password>', 'Encryption password')
  .option('--mnemonic <mnemonic>', '12-word mnemonic phrase')
  .option('--private-key <key>', '64-char hex private key')
  .option('--name <name>', 'Wallet name')
  .action(async (opts) => {
    try {
      const config = getConfig(program.opts().network);
      const result = await importWallet(config, {
        password: opts.password,
        mnemonic: opts.mnemonic,
        privateKey: opts.privateKey,
        name: opts.name,
      });
      outputSuccess(result);
    } catch (err: any) {
      outputError(err.message);
    }
  });

wallet
  .command('list')
  .description('List all local wallets')
  .action(async () => {
    try {
      const config = getConfig(program.opts().network);
      const result = await listWallets(config);
      outputSuccess(result);
    } catch (err: any) {
      outputError(err.message);
    }
  });

wallet
  .command('info')
  .description('Get wallet info')
  .requiredOption('--address <address>', 'Wallet address')
  .action(async (opts) => {
    try {
      const config = getConfig(program.opts().network);
      const result = await getWalletInfo(config, { address: opts.address });
      outputSuccess(result);
    } catch (err: any) {
      outputError(err.message);
    }
  });

wallet
  .command('backup')
  .description('Export wallet credentials (DANGEROUS)')
  .requiredOption('--address <address>', 'Wallet address')
  .requiredOption('--password <password>', 'Wallet password')
  .action(async (opts) => {
    try {
      const config = getConfig(program.opts().network);
      const result = await backupWallet(config, {
        address: opts.address,
        password: opts.password,
      });
      outputSuccess(result);
    } catch (err: any) {
      outputError(err.message);
    }
  });

wallet
  .command('delete')
  .description('Delete a locally stored wallet (requires password verification)')
  .requiredOption('--address <address>', 'Wallet address to delete')
  .requiredOption('--password <password>', 'Wallet password (for verification)')
  .action(async (opts) => {
    try {
      const config = getConfig(program.opts().network);
      const result = await deleteWalletByAddress(config, {
        address: opts.address,
        password: opts.password,
      });
      outputSuccess(result);
    } catch (err: any) {
      outputError(err.message);
    }
  });

// ============================================================
// Query commands
// ============================================================

const query = program.command('query').description('Asset & transaction queries');

query
  .command('tokens')
  .description('Get token list with balances')
  .requiredOption('--address <address>', 'Wallet address')
  .option('--chain-id <chainId>', 'Filter by chain ID')
  .action(async (opts) => {
    try {
      const config = getConfig(program.opts().network);
      const result = await getTokenList(config, {
        address: opts.address,
        chainId: opts.chainId,
      });
      outputSuccess(result);
    } catch (err: any) {
      outputError(err.message);
    }
  });

query
  .command('balance')
  .description('Get specific token balance')
  .requiredOption('--address <address>', 'Wallet address')
  .requiredOption('--symbol <symbol>', 'Token symbol')
  .requiredOption('--chain-id <chainId>', 'Chain ID')
  .action(async (opts) => {
    try {
      const config = getConfig(program.opts().network);
      const result = await getTokenBalance(config, {
        address: opts.address,
        symbol: opts.symbol,
        chainId: opts.chainId,
      });
      outputSuccess(result);
    } catch (err: any) {
      outputError(err.message);
    }
  });

query
  .command('price')
  .description('Get token prices')
  .requiredOption('--symbols <symbols>', 'Comma-separated token symbols')
  .action(async (opts) => {
    try {
      const config = getConfig(program.opts().network);
      const symbols = opts.symbols.split(',').map((s: string) => s.trim());
      const result = await getTokenPrices(config, { symbols });
      outputSuccess(result);
    } catch (err: any) {
      outputError(err.message);
    }
  });

query
  .command('nft')
  .description('Get NFT collections')
  .requiredOption('--address <address>', 'Wallet address')
  .action(async (opts) => {
    try {
      const config = getConfig(program.opts().network);
      const result = await getNFTCollections(config, {
        address: opts.address,
      });
      outputSuccess(result);
    } catch (err: any) {
      outputError(err.message);
    }
  });

query
  .command('nft-items')
  .description('Get NFT items in a collection')
  .requiredOption('--address <address>', 'Wallet address')
  .requiredOption('--symbol <symbol>', 'Collection symbol')
  .action(async (opts) => {
    try {
      const config = getConfig(program.opts().network);
      const result = await getNFTItems(config, {
        address: opts.address,
        symbol: opts.symbol,
      });
      outputSuccess(result);
    } catch (err: any) {
      outputError(err.message);
    }
  });

query
  .command('history')
  .description('Get transaction history')
  .requiredOption('--address <address>', 'Wallet address')
  .option('--chain-id <chainId>', 'Filter by chain ID')
  .option('--symbol <symbol>', 'Filter by token symbol')
  .option('--skip <n>', 'Skip count', '0')
  .option('--limit <n>', 'Max results', '20')
  .action(async (opts) => {
    try {
      const config = getConfig(program.opts().network);
      const result = await getTransactionHistory(config, {
        address: opts.address,
        chainId: opts.chainId,
        symbol: opts.symbol,
        skipCount: parseInt(opts.skip, 10),
        maxResultCount: parseInt(opts.limit, 10),
      });
      outputSuccess(result);
    } catch (err: any) {
      outputError(err.message);
    }
  });

query
  .command('chains')
  .description('Get chain info (RPC URLs, token contracts)')
  .action(async () => {
    try {
      const config = getConfig(program.opts().network);
      const result = await getChainInfo(config);
      outputSuccess(result);
    } catch (err: any) {
      outputError(err.message);
    }
  });

// ============================================================
// Transfer commands
// ============================================================

program
  .command('transfer')
  .description('Send a token transfer')
  .requiredOption('--to <address>', 'Recipient address')
  .requiredOption('--symbol <symbol>', 'Token symbol')
  .requiredOption('--amount <amount>', 'Amount in base units')
  .requiredOption('--chain-id <chainId>', 'Chain ID')
  .option('--memo <memo>', 'Transfer memo')
  .option('--cross-chain', 'Cross-chain transfer (auto-detect target chain from address)')
  .option('--private-key <key>', 'Private key')
  .option('--address <address>', 'Local wallet address')
  .option('--password <password>', 'Wallet password')
  .action(async (opts) => {
    try {
      const config = getConfig(program.opts().network);
      if (opts.crossChain) {
        const result = await crossChainTransfer(config, {
          to: opts.to,
          symbol: opts.symbol,
          amount: opts.amount,
          memo: opts.memo,
          fromChainId: opts.chainId,
          privateKey: opts.privateKey,
          address: opts.address,
          password: opts.password,
        });
        outputSuccess(result);
      } else {
        const result = await transfer(config, {
          to: opts.to,
          symbol: opts.symbol,
          amount: opts.amount,
          memo: opts.memo,
          chainId: opts.chainId,
          privateKey: opts.privateKey,
          address: opts.address,
          password: opts.password,
        });
        outputSuccess(result);
      }
    } catch (err: any) {
      outputError(err.message);
    }
  });

program
  .command('approve')
  .description('Approve token spending')
  .requiredOption('--spender <address>', 'Spender contract address')
  .requiredOption('--symbol <symbol>', 'Token symbol')
  .requiredOption('--amount <amount>', 'Approval amount')
  .requiredOption('--chain-id <chainId>', 'Chain ID')
  .option('--private-key <key>', 'Private key')
  .option('--address <address>', 'Local wallet address')
  .option('--password <password>', 'Wallet password')
  .action(async (opts) => {
    try {
      const config = getConfig(program.opts().network);
      const result = await approve(config, {
        spender: opts.spender,
        symbol: opts.symbol,
        amount: opts.amount,
        chainId: opts.chainId,
        privateKey: opts.privateKey,
        address: opts.address,
        password: opts.password,
      });
      outputSuccess(result);
    } catch (err: any) {
      outputError(err.message);
    }
  });

// ============================================================
// Contract commands
// ============================================================

const contract = program.command('contract').description('Generic contract calls');

contract
  .command('view')
  .description('Call a read-only contract method')
  .requiredOption('--contract-address <address>', 'Contract address')
  .requiredOption('--method <name>', 'Method name')
  .option('--params <json>', 'Method params as JSON string')
  .requiredOption('--chain-id <chainId>', 'Chain ID')
  .action(async (opts) => {
    try {
      const config = getConfig(program.opts().network);
      const params = opts.params ? JSON.parse(opts.params) : undefined;
      const result = await callViewMethod(config, {
        contractAddress: opts.contractAddress,
        methodName: opts.method,
        params,
        chainId: opts.chainId,
      });
      outputSuccess(result);
    } catch (err: any) {
      outputError(err.message);
    }
  });

contract
  .command('send')
  .description('Call a state-changing contract method')
  .requiredOption('--contract-address <address>', 'Contract address')
  .requiredOption('--method <name>', 'Method name')
  .option('--params <json>', 'Method params as JSON string')
  .requiredOption('--chain-id <chainId>', 'Chain ID')
  .option('--private-key <key>', 'Private key')
  .option('--address <address>', 'Local wallet address')
  .option('--password <password>', 'Wallet password')
  .action(async (opts) => {
    try {
      const config = getConfig(program.opts().network);
      const params = opts.params ? JSON.parse(opts.params) : undefined;
      const result = await callSendMethod(config, {
        contractAddress: opts.contractAddress,
        methodName: opts.method,
        params,
        chainId: opts.chainId,
        privateKey: opts.privateKey,
        address: opts.address,
        password: opts.password,
      });
      outputSuccess(result);
    } catch (err: any) {
      outputError(err.message);
    }
  });

contract
  .command('fee')
  .description('Estimate transaction fee')
  .requiredOption('--contract-address <address>', 'Contract address')
  .requiredOption('--method <name>', 'Method name')
  .option('--params <json>', 'Method params as JSON string')
  .requiredOption('--chain-id <chainId>', 'Chain ID')
  .option('--private-key <key>', 'Private key')
  .option('--address <address>', 'Local wallet address')
  .option('--password <password>', 'Wallet password')
  .action(async (opts) => {
    try {
      const config = getConfig(program.opts().network);
      const params = opts.params ? JSON.parse(opts.params) : undefined;
      const result = await estimateTransactionFee(config, {
        contractAddress: opts.contractAddress,
        methodName: opts.method,
        params,
        chainId: opts.chainId,
        privateKey: opts.privateKey,
        address: opts.address,
        password: opts.password,
      });
      outputSuccess(result);
    } catch (err: any) {
      outputError(err.message);
    }
  });

program.parse();
