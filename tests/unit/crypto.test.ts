import { describe, test, expect } from 'bun:test';
import { encrypt, decrypt } from '../../lib/crypto.js';

describe('crypto', () => {
  const password = 'test_password_123';
  const plaintext = 'hello world secret data';

  test('encrypt returns a non-empty string', () => {
    const ciphertext = encrypt(plaintext, password);
    expect(typeof ciphertext).toBe('string');
    expect(ciphertext.length).toBeGreaterThan(0);
    expect(ciphertext).not.toBe(plaintext);
  });

  test('decrypt returns the original plaintext', () => {
    const ciphertext = encrypt(plaintext, password);
    const result = decrypt(ciphertext, password);
    expect(result).toBe(plaintext);
  });

  test('decrypt with wrong password throws', () => {
    const ciphertext = encrypt(plaintext, password);
    expect(() => decrypt(ciphertext, 'wrong_password')).toThrow();
  });

  test('round-trip with private key format', () => {
    const privateKey =
      'f6e512a3c259e5f9af981d7f99d245aa5bc52fe448495e0b0dd56e8406be6f71';
    const ciphertext = encrypt(privateKey, password);
    const result = decrypt(ciphertext, password);
    expect(result).toBe(privateKey);
  });
});
