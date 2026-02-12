import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { getConfig } from '../../lib/config.js';

describe('config', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  test('returns mainnet config by default', () => {
    delete process.env.PORTKEY_NETWORK;
    const config = getConfig();
    expect(config.network).toBe('mainnet');
    expect(config.apiUrl).toBe('https://eoa-portkey.portkey.finance');
  });

  test('env var overrides default API URL', () => {
    process.env.PORTKEY_NETWORK = 'mainnet';
    const config = getConfig();
    expect(config.network).toBe('mainnet');
  });

  test('function param overrides env var', () => {
    process.env.PORTKEY_NETWORK = 'mainnet';
    const config = getConfig('mainnet');
    expect(config.network).toBe('mainnet');
  });

  test('env API URL overrides default', () => {
    process.env.PORTKEY_API_URL = 'https://custom.api.com';
    const config = getConfig('mainnet');
    expect(config.apiUrl).toBe('https://custom.api.com');
  });

  test('throws on unknown network', () => {
    expect(() => getConfig('invalid_network')).toThrow('Unknown network');
  });
});
