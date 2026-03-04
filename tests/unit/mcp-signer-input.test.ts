import { describe, expect, test } from 'bun:test';
import {
  mergeSignerInput,
  signerContextSchema,
} from '../../src/mcp/signer-input.js';

describe('mcp signer input helpers', () => {
  test('mergeSignerInput prefers direct values over nested signer objects', () => {
    const merged = mergeSignerInput({
      privateKey: 'direct-pk',
      address: 'ELF_direct_AELF',
      password: 'direct-pass',
      signerContext: {
        signerMode: 'context',
        privateKey: 'context-pk',
        address: 'ELF_context_AELF',
        password: 'context-pass',
      },
      signer: {
        signerMode: 'env',
        privateKey: 'signer-pk',
      },
    });

    expect(merged.privateKey).toBe('direct-pk');
    expect(merged.address).toBe('ELF_direct_AELF');
    expect(merged.password).toBe('direct-pass');
    expect(merged.signerMode).toBe('context');
  });

  test('mergeSignerInput falls back to signerContext then signer', () => {
    const mergedFromContext = mergeSignerInput({
      signerContext: {
        signerMode: 'explicit',
        privateKey: 'ctx-pk',
      },
      signer: {
        signerMode: 'env',
        privateKey: 'signer-pk',
      },
    });
    expect(mergedFromContext.privateKey).toBe('ctx-pk');
    expect(mergedFromContext.signerMode).toBe('explicit');

    const mergedFromSigner = mergeSignerInput({
      signer: {
        signerMode: 'env',
        privateKey: 'signer-pk',
      },
    });
    expect(mergedFromSigner.privateKey).toBe('signer-pk');
    expect(mergedFromSigner.signerMode).toBe('env');
  });

  test('signerContextSchema accepts valid signer payload', () => {
    const parsed = signerContextSchema.parse({
      signerMode: 'auto',
      walletType: 'EOA',
      address: 'ELF_test_AELF',
      network: 'mainnet',
    });
    expect(parsed?.walletType).toBe('EOA');
    expect(parsed?.signerMode).toBe('auto');
  });

  test('signerContextSchema rejects invalid signerMode and walletType', () => {
    expect(() =>
      signerContextSchema.parse({
        signerMode: 'invalid-mode',
        walletType: 'OTHER',
      }),
    ).toThrow();
  });
});
