import AElf from 'aelf-sdk';

// ============================================================
// Types
// ============================================================

export interface AElfWallet {
  address: string;
  privateKey: string;
  keyPair: any;
  mnemonic?: string;
  childWallet?: any;
  BIP44Path?: string;
}

interface ContractInstance {
  callViewMethod(methodName: string, params?: any): Promise<{ data?: any; error?: any }>;
  callSendMethod(
    methodName: string,
    account: string,
    params?: any,
    sendOptions?: SendOptions,
  ): Promise<{ data?: any; error?: any; transactionId?: string }>;
  encodedTx(methodName: string, params?: any): Promise<{ data?: any; error?: any }>;
}

interface SendOptions {
  onMethod?: 'receipt' | 'transactionHash';
}

// ============================================================
// Wallet helpers
// ============================================================

/** A common read-only private key used for view-only contract calls. */
const COMMON_PRIVATE =
  'f6e512a3c259e5f9af981d7f99d245aa5bc52fe448495e0b0dd56e8406be6f71';

/**
 * Create an aelf wallet object from a private key.
 * If no key is provided, uses a common read-only key (for view calls).
 */
export function getWallet(privateKey?: string): AElfWallet {
  return AElf.wallet.getWalletByPrivateKey(privateKey || COMMON_PRIVATE);
}

/**
 * Create a brand-new aelf wallet (mnemonic + privateKey + address).
 */
export function createNewWallet(): AElfWallet {
  return AElf.wallet.createNewWallet();
}

/**
 * Restore a wallet from a mnemonic phrase.
 */
export function getWalletByMnemonic(mnemonic: string): AElfWallet {
  return AElf.wallet.getWalletByMnemonic(mnemonic);
}

// ============================================================
// AElf instance (HTTP provider)
// ============================================================

const instanceCache: Record<string, any> = {};

/**
 * Get or create a cached AElf instance for a given RPC URL.
 */
export function getAelfInstance(rpcUrl: string): any {
  if (!instanceCache[rpcUrl]) {
    instanceCache[rpcUrl] = new AElf(
      new AElf.providers.HttpProvider(rpcUrl, 20000),
    );
  }
  return instanceCache[rpcUrl];
}

// ============================================================
// Contract helpers
// ============================================================

const contractCache: Record<string, ContractInstance> = {};

/**
 * Get or create a cached contract instance.
 */
export async function getContractBasic(params: {
  contractAddress: string;
  rpcUrl: string;
  privateKey?: string;
}): Promise<ContractInstance> {
  const { contractAddress, rpcUrl, privateKey } = params;
  const wallet = getWallet(privateKey);
  const cacheKey = `${rpcUrl}:${contractAddress}:${wallet.address}`;

  if (!contractCache[cacheKey]) {
    const instance = getAelfInstance(rpcUrl);
    const aelfContract = await instance.chain.contractAt(
      contractAddress,
      wallet,
    );
    contractCache[cacheKey] = wrapContract(aelfContract, instance);
  }
  return contractCache[cacheKey];
}

/**
 * Wrap the raw aelf-sdk contract object into our ContractInstance interface.
 */
function wrapContract(aelfContract: any, aelfInstance: any): ContractInstance {
  return {
    async callViewMethod(methodName: string, params?: any) {
      try {
        const fn = aelfContract[capitalize(methodName)];
        if (!fn) throw new Error(`Method ${methodName} not found on contract`);
        const req = await fn.call(params);
        if (!req?.error && (req?.result || req?.result === null)) {
          return { data: req.result };
        }
        return { data: req };
      } catch (error: any) {
        return { error: formatContractError(error) };
      }
    },

    async callSendMethod(
      methodName: string,
      account: string,
      params?: any,
      sendOptions?: SendOptions,
    ) {
      try {
        const { onMethod = 'receipt' } = sendOptions || {};
        const fn = aelfContract[capitalize(methodName)];
        if (!fn) throw new Error(`Method ${methodName} not found on contract`);
        const req = await fn(params);
        const transactionId = req?.result?.TransactionId || req?.TransactionId;

        if (req?.error) {
          return {
            error: formatContractError(undefined, req),
            transactionId,
          };
        }

        if (onMethod === 'receipt' && transactionId) {
          await sleep(1000);
          const txResult = await getTxResult(aelfInstance, transactionId);
          return { data: txResult, transactionId };
        }

        return { transactionId };
      } catch (error: any) {
        return { error: formatContractError(error) };
      }
    },

    async encodedTx(methodName: string, params?: any) {
      try {
        const fn = aelfContract[capitalize(methodName)];
        if (!fn) throw new Error(`Method ${methodName} not found on contract`);
        const chainStatus = await aelfInstance.chain.getChainStatus();
        const raw = await fn.getSignedTx(params, {
          height: chainStatus.BestChainHeight,
          hash: chainStatus.BestChainHash,
        });
        return { data: raw };
      } catch (error: any) {
        return { error: formatContractError(error) };
      }
    },
  };
}

// ============================================================
// Transaction result polling
// ============================================================

/**
 * Poll for a transaction result until mined, with retry logic.
 * - notexisted: retry up to 5 times
 * - pending / pending_validation: retry up to 20 times
 */
export async function getTxResult(
  instance: any,
  transactionId: string,
  reGetCount = 0,
  notExistedReGetCount = 0,
): Promise<any> {
  let txResult: any;
  try {
    txResult = await instance.chain.getTxResult(transactionId);
  } catch (error: any) {
    throw new Error(
      `getTxResult error: ${error?.message || error?.Error || error}`,
    );
  }

  if (txResult?.error && txResult?.errorMessage) {
    throw new Error(
      txResult.errorMessage.message || txResult.errorMessage.Message,
    );
  }

  const result = txResult?.result || txResult;
  if (!result) throw new Error('Cannot get transaction result.');

  const status = result.Status?.toLowerCase();

  if (status === 'notexisted') {
    if (notExistedReGetCount > 5) {
      throw new Error(result.Error || `Transaction: ${result.Status}`);
    }
    await sleep(1000);
    return getTxResult(
      instance,
      transactionId,
      reGetCount + 1,
      notExistedReGetCount + 1,
    );
  }

  if (status === 'pending' || status === 'pending_validation') {
    if (reGetCount > 20) {
      throw new Error(result.Error || `Transaction: ${result.Status}`);
    }
    await sleep(1000);
    return getTxResult(instance, transactionId, reGetCount + 1, notExistedReGetCount);
  }

  if (status === 'mined') return result;

  throw new Error(result.Error || `Transaction: ${result.Status}`);
}

// ============================================================
// Address utilities
// ============================================================

/**
 * Validate that a string is a valid aelf address.
 */
export function isAelfAddress(value?: string): boolean {
  if (!value) return false;
  try {
    AElf.utils.decodeAddressRep(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract the raw aelf address from a cross-chain DID-format address.
 * Format: "ELF_address_chainId" → "address"
 */
export function getAelfAddress(value: string): string {
  const parts = value.replace(/^ELF_/, '').split('_');
  return parts[0];
}

/**
 * Extract chainId from a DID-format address.
 * Format: "ELF_address_chainId" → "chainId"
 */
export function getChainIdFromAddress(value: string): string | undefined {
  const parts = value.split('_');
  if (parts.length === 3) return parts[2];
  return undefined;
}

/**
 * Convert a base58 chainId string to a numeric chain number.
 */
export function getChainNumber(chainId: string): number {
  return AElf.utils.chainIdConvertor.base58ToChainId(chainId);
}

/**
 * Check if a transfer is cross-chain.
 */
export function isCrossChain(
  toAddress: string,
  fromChainId: string,
): boolean {
  const toChainId = getChainIdFromAddress(toAddress);
  if (!toChainId) return false;
  return toChainId !== fromChainId;
}

// ============================================================
// Helpers
// ============================================================

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatContractError(error?: any, req?: any): { message: string; code?: any } {
  if (typeof error === 'string') return { message: error };
  if (error?.message) return { message: error.message };
  if (error?.Error) {
    return {
      message: error.Error.Details || error.Error.Message || error.Error,
      code: error.Error.Code,
    };
  }
  if (req?.error) {
    return {
      code: req.error?.message?.Code || req.error,
      message: req.errorMessage?.message || req.error?.message?.Message || 'Unknown error',
    };
  }
  return { message: 'Unknown contract error' };
}
