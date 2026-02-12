import type {
  PortkeyConfig,
  TransferParams,
  TransferResult,
  CrossChainTransferParams,
} from '../../lib/types.js';
import {
  getContractBasic,
  getWallet,
  getChainNumber,
  getAelfAddress,
  getChainIdFromAddress,
  getAelfInstance,
} from '../../lib/aelf.js';
import { getRpcUrl, getTokenContractAddress } from '../../lib/config.js';
import { resolvePrivateKey } from './wallet.js';
import { ensureChainInfo } from './query.js';

// ============================================================
// transfer — Same-chain token transfer
// ============================================================

export async function transfer(
  config: PortkeyConfig,
  params: TransferParams,
): Promise<TransferResult> {
  await ensureChainInfo(config);

  const privateKey = resolvePrivateKey(params);
  const wallet = getWallet(privateKey);
  const rpcUrl = getRpcUrl(params.chainId);
  const tokenAddress = getTokenContractAddress(params.chainId);

  const contract = await getContractBasic({
    contractAddress: tokenAddress,
    rpcUrl,
    privateKey,
  });

  const result = await contract.callSendMethod(
    'Transfer',
    wallet.address,
    {
      symbol: params.symbol,
      to: getAelfAddress(params.to),
      amount: params.amount,
      memo: params.memo || '',
    },
    { onMethod: 'receipt' },
  );

  if (result.error) {
    throw new Error(result.error.message || 'Transfer failed');
  }

  return {
    transactionId: result.transactionId || result.data?.TransactionId || '',
    status: result.data?.Status || 'MINED',
  };
}

// ============================================================
// crossChainTransfer — Cross-chain token transfer within aelf
// ============================================================

export async function crossChainTransfer(
  config: PortkeyConfig,
  params: CrossChainTransferParams,
): Promise<TransferResult> {
  await ensureChainInfo(config);

  const privateKey = resolvePrivateKey(params);
  const wallet = getWallet(privateKey);
  const rpcUrl = getRpcUrl(params.fromChainId);
  const tokenAddress = getTokenContractAddress(params.fromChainId);

  // Determine the target chain from the address
  const toChainId =
    getChainIdFromAddress(params.to) || params.fromChainId;

  // Get issueChainId from the token info
  const contract = await getContractBasic({
    contractAddress: tokenAddress,
    rpcUrl,
    privateKey,
  });

  const tokenInfoResult = await contract.callViewMethod('GetTokenInfo', {
    symbol: params.symbol,
  });

  if (tokenInfoResult.error) {
    throw new Error(
      `Failed to get token info: ${tokenInfoResult.error.message}`,
    );
  }

  const issueChainId =
    tokenInfoResult.data?.issueChainId ??
    tokenInfoResult.data?.IssueChainId ??
    getChainNumber(params.fromChainId);

  // Execute cross-chain transfer
  const result = await contract.callSendMethod(
    'CrossChainTransfer',
    wallet.address,
    {
      issueChainId,
      toChainId: getChainNumber(toChainId),
      symbol: params.symbol,
      to: getAelfAddress(params.to),
      amount: params.amount,
      memo: params.memo || '',
    },
    { onMethod: 'receipt' },
  );

  if (result.error) {
    throw new Error(result.error.message || 'Cross-chain transfer failed');
  }

  return {
    transactionId: result.transactionId || result.data?.TransactionId || '',
    status: result.data?.Status || 'MINED',
  };
}
