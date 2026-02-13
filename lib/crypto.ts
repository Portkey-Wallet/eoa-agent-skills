import AElf from 'aelf-sdk';
import { randomBytes } from 'crypto';

const PASSWORD_LENGTH = 24;
const PASSWORD_CHARSET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*_+-=';

/**
 * Generate a cryptographically strong random password.
 * 24 chars from a 74-char alphabet ≈ 148 bits of entropy.
 */
export function generateStrongPassword(): string {
  const bytes = randomBytes(PASSWORD_LENGTH);
  let password = '';
  for (let i = 0; i < PASSWORD_LENGTH; i++) {
    password += PASSWORD_CHARSET[bytes[i] % PASSWORD_CHARSET.length];
  }
  return password;
}

/**
 * AES encrypt a string using aelf-sdk's built-in AES.
 * Used for encrypting private keys and mnemonics before local storage.
 */
export function encrypt(plaintext: string, password: string): string {
  return AElf.wallet.AESEncrypt(plaintext, password);
}

/**
 * AES decrypt a string using aelf-sdk's built-in AES.
 * Returns the decrypted string, or throws on failure.
 */
export function decrypt(ciphertext: string, password: string): string {
  try {
    const result = AElf.wallet.AESDecrypt(ciphertext, password);
    if (!result) {
      throw new Error('Decryption failed — wrong password or corrupted data');
    }
    return result;
  } catch {
    throw new Error('Decryption failed — wrong password or corrupted data');
  }
}
