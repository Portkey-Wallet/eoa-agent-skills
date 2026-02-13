import type {
  PortkeyConfig,
  EBridgeTransferParams,
  EBridgeLimitParams,
  EBridgeLimitResult,
  EBridgeFeeParams,
  EBridgeFeeResult,
  TransferResult,
} from '../../lib/types.js';
import {
  getContractBasic,
  getWallet,
  getAelfInstance,
  getTxResult,
} from '../../lib/aelf.js';
import { getRpcUrl, getTokenContractAddress } from '../../lib/config.js';
import { resolvePrivateKey } from './wallet.js';
import { ensureChainInfo } from './query.js';

// ============================================================
// eBridgeTransfer — Cross-chain transfer via eBridge (aelf <-> EVM)
// ============================================================

export async function eBridgeTransfer(
  config: PortkeyConfig,
  params: EBridgeTransferParams,
): Promise<TransferResult> {
  await ensureChainInfo(config);

  const privateKey = resolvePrivateKey(params);
  const wallet = getWallet(privateKey);
  const rpcUrl = getRpcUrl(params.fromChainId);
  const tokenAddress = getTokenContractAddress(params.fromChainId);

  // Step 1: Check allowance and approve if needed
  const tokenContract = await getContractBasic({
    contractAddress: tokenAddress,
    rpcUrl,
    privateKey,
  });

  const allowanceResult = await tokenContract.callViewMethod('GetAllowance', {
    symbol: params.symbol,
    owner: wallet.address,
    spender: params.bridgeContractAddress,
  });

  if (allowanceResult.error) {
    throw new Error(
      `GetAllowance failed: ${allowanceResult.error.message || 'Unknown error'}`,
    );
  }

  const currentAllowance = BigInt(
    allowanceResult.data?.allowance || allowanceResult.data?.Allowance || '0',
  );
  const transferAmount = BigInt(params.amount);

  if (currentAllowance < transferAmount) {
    // Approve the bridge contract to spend tokens
    const approveResult = await tokenContract.callSendMethod(
      'Approve',
      wallet.address,
      {
        spender: params.bridgeContractAddress,
        symbol: params.symbol,
        amount: String(transferAmount - currentAllowance + BigInt(1000000)),
      },
      { onMethod: 'receipt' },
    );

    if (approveResult.error) {
      throw new Error(
        `Approve failed: ${approveResult.error.message}`,
      );
    }
  }

  // Step 2: Create receipt on bridge contract
  const bridgeContract = await getContractBasic({
    contractAddress: params.bridgeContractAddress,
    rpcUrl,
    privateKey,
  });

  const receiptResult = await bridgeContract.callSendMethod(
    'CreateReceipt',
    wallet.address,
    {
      symbol: params.symbol,
      owner: wallet.address,
      targetAddress: params.targetAddress,
      amount: params.amount,
      targetChainId: params.toChainId,
    },
    { onMethod: 'receipt' },
  );

  if (receiptResult.error) {
    throw new Error(
      `eBridge CreateReceipt failed: ${receiptResult.error.message}`,
    );
  }

  return {
    transactionId:
      receiptResult.transactionId ||
      receiptResult.data?.TransactionId ||
      '',
    status: receiptResult.data?.Status || 'MINED',
  };
}

// ============================================================
// getEBridgeLimit — Query eBridge transfer limits
// ============================================================

export async function getEBridgeLimit(
  config: PortkeyConfig,
  params: EBridgeLimitParams,
): Promise<EBridgeLimitResult> {
  await ensureChainInfo(config);

  const rpcUrl = getRpcUrl(params.fromChainId);

  const bridgeContract = await getContractBasic({
    contractAddress: params.bridgeContractAddress,
    rpcUrl,
  });

  const result = await bridgeContract.callViewMethod('GetReceiptLimit', {
    symbol: params.symbol,
    targetChainId: params.toChainId,
  });

  if (result.error) {
    throw new Error(
      `GetReceiptLimit failed: ${result.error.message}`,
    );
  }

  return {
    dailyLimit: result.data?.dailyLimit || result.data?.DailyLimit || '0',
    currentLimit:
      result.data?.currentLimit || result.data?.CurrentLimit || '0',
  };
}

// ============================================================
// getEBridgeFee — Query eBridge transfer fee
// ============================================================

export async function getEBridgeFee(
  config: PortkeyConfig,
  params: EBridgeFeeParams,
): Promise<EBridgeFeeResult> {
  await ensureChainInfo(config);

  const rpcUrl = getRpcUrl(params.fromChainId);

  const bridgeContract = await getContractBasic({
    contractAddress: params.bridgeContractAddress,
    rpcUrl,
  });

  const result = await bridgeContract.callViewMethod('GetFeeByChainId', {
    value: params.toChainId,
  });

  if (result.error) {
    throw new Error(
      `GetFeeByChainId failed: ${result.error.message}`,
    );
  }

  return {
    fee: result.data?.value || result.data?.Value || '0',
  };
}
