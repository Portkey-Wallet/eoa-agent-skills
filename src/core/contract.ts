import type {
  PortkeyConfig,
  ApproveParams,
  CallViewMethodParams,
  CallSendMethodParams,
  CallSendMethodResult,
  EstimateFeeParams,
  EstimateFeeResult,
} from '../../lib/types.js';
import {
  getContractBasic,
  getWallet,
  getAelfInstance,
} from '../../lib/aelf.js';
import { getRpcUrl, getTokenContractAddress } from '../../lib/config.js';
import { resolvePrivateKey } from './wallet.js';
import { ensureChainInfo } from './query.js';

// ============================================================
// approve — Token approval (ERC20-style Approve)
// ============================================================

export async function approve(
  config: PortkeyConfig,
  params: ApproveParams,
): Promise<CallSendMethodResult> {
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
    'Approve',
    wallet.address,
    {
      spender: params.spender,
      symbol: params.symbol,
      amount: params.amount,
    },
    { onMethod: 'transactionHash' },
  );

  if (result.error) {
    throw new Error(result.error.message || 'Approve failed');
  }

  return {
    transactionId: result.transactionId || '',
  };
}

// ============================================================
// callViewMethod — Generic contract read call
// ============================================================

export async function callViewMethod(
  config: PortkeyConfig,
  params: CallViewMethodParams,
): Promise<any> {
  await ensureChainInfo(config);

  const rpcUrl = getRpcUrl(params.chainId);

  const contract = await getContractBasic({
    contractAddress: params.contractAddress,
    rpcUrl,
  });

  const result = await contract.callViewMethod(
    params.methodName,
    params.params,
  );

  if (result.error) {
    throw new Error(
      result.error.message || `callViewMethod ${params.methodName} failed`,
    );
  }

  return result.data;
}

// ============================================================
// callSendMethod — Generic contract write call
// ============================================================

export async function callSendMethod(
  config: PortkeyConfig,
  params: CallSendMethodParams,
): Promise<CallSendMethodResult> {
  await ensureChainInfo(config);

  const privateKey = resolvePrivateKey(params);
  const wallet = getWallet(privateKey);
  const rpcUrl = getRpcUrl(params.chainId);

  const contract = await getContractBasic({
    contractAddress: params.contractAddress,
    rpcUrl,
    privateKey,
  });

  const result = await contract.callSendMethod(
    params.methodName,
    wallet.address,
    params.params,
    { onMethod: 'receipt' },
  );

  if (result.error) {
    throw new Error(
      result.error.message || `callSendMethod ${params.methodName} failed`,
    );
  }

  return {
    transactionId: result.transactionId || '',
  };
}

// ============================================================
// estimateTransactionFee — Estimate fee for a contract call
// ============================================================

export async function estimateTransactionFee(
  config: PortkeyConfig,
  params: EstimateFeeParams,
): Promise<EstimateFeeResult> {
  await ensureChainInfo(config);

  const privateKey = resolvePrivateKey(params);
  const rpcUrl = getRpcUrl(params.chainId);

  const contract = await getContractBasic({
    contractAddress: params.contractAddress,
    rpcUrl,
    privateKey,
  });

  const rawResult = await contract.encodedTx(params.methodName, params.params);
  if (rawResult.error) {
    throw new Error(
      rawResult.error.message || 'Failed to encode transaction',
    );
  }

  // Calculate fee via RPC
  const res = await fetch(
    `${rpcUrl}/api/blockChain/calculateTransactionFee`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ RawTransaction: rawResult.data }),
    },
  );

  const txFee = await res.json();
  if (!txFee?.Success) {
    throw new Error('Failed to calculate transaction fee');
  }

  // Parse fee object: { ELF: 12345, ... } (in base units)
  const fee: Record<string, number> = {};
  if (txFee.TransactionFee) {
    for (const [symbol, amount] of Object.entries(txFee.TransactionFee)) {
      fee[symbol] = Number(amount);
    }
  }

  return { fee };
}
