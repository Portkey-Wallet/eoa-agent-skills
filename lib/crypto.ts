import AElf from 'aelf-sdk';

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
