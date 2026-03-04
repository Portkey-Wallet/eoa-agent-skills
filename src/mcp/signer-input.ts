import { z } from 'zod';

export const signerContextSchema = z
  .object({
    signerMode: z.enum(['auto', 'explicit', 'context', 'env', 'daemon']).optional(),
    walletType: z.enum(['EOA', 'CA']).optional(),
    address: z.string().optional(),
    password: z.string().optional(),
    privateKey: z.string().optional(),
    caHash: z.string().optional(),
    caAddress: z.string().optional(),
    network: z.enum(['mainnet', 'testnet']).optional(),
  })
  .optional()
  .describe('Optional signer context. auto tries explicit → active context → env.');

type SignerInputShape = {
  privateKey?: string;
  address?: string;
  password?: string;
  signer?: {
    signerMode?: 'auto' | 'explicit' | 'context' | 'env' | 'daemon';
    privateKey?: string;
    address?: string;
    password?: string;
  };
  signerContext?: {
    signerMode?: 'auto' | 'explicit' | 'context' | 'env' | 'daemon';
    privateKey?: string;
    address?: string;
    password?: string;
  };
};

export function mergeSignerInput(input: SignerInputShape) {
  const override = input.signerContext || input.signer;
  return {
    privateKey: input.privateKey || override?.privateKey,
    address: input.address || override?.address,
    password: input.password || override?.password,
    signerMode: override?.signerMode,
  };
}
