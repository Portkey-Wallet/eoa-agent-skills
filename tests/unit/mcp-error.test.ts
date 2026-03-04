import { describe, expect, test } from 'bun:test';
import { fail, toMcpError } from '../../src/mcp/error.js';

describe('mcp error helpers', () => {
  test('uses explicit string code when present', () => {
    const parsed = toMcpError({
      code: 'EXTERNAL_SERVICE_ERROR',
      message: 'dependency failed',
      details: { retryable: false },
      traceId: 'trace-1',
    });
    expect(parsed.code).toBe('EXTERNAL_SERVICE_ERROR');
    expect(parsed.message).toBe('dependency failed');
    expect(parsed.traceId).toBe('trace-1');
  });

  test('extracts prefixed code only when in allowlist', () => {
    const parsed = toMcpError(
      new Error('SIGNER_PASSWORD_REQUIRED: wallet password missing'),
    );
    expect(parsed.code).toBe('SIGNER_PASSWORD_REQUIRED');
    expect(parsed.message).toBe('wallet password missing');
  });

  test('does not extract non-whitelisted prefix from message', () => {
    const parsed = toMcpError(new Error('HTTP: connection refused'));
    expect(parsed.code).toBe('UNKNOWN_ERROR');
    expect(parsed.message).toBe('HTTP: connection refused');
  });

  test('supports primitive and nullish errors', () => {
    expect(toMcpError('boom').message).toBe('boom');
    expect(toMcpError(null).code).toBe('UNKNOWN_ERROR');
  });

  test('fail returns legacy text + structured JSON payload', () => {
    const result = fail(new Error('SIGNER_CONTEXT_NOT_FOUND: no signer available'));
    expect(result.isError).toBeTrue();
    expect(result.content.length).toBe(2);
    expect(result.content[0]?.text).toBe(
      '[ERROR] SIGNER_CONTEXT_NOT_FOUND: no signer available',
    );
    const parsed = JSON.parse(result.content[1]?.text || '{}');
    expect(parsed.error.code).toBe('SIGNER_CONTEXT_NOT_FOUND');
    expect(parsed.error.message).toBe('no signer available');
  });
});
