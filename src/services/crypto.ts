/**
 * DocVault Client-Side Cryptographic Service
 * Implements AES-256-GCM with PBKDF2 key derivation using the native Web Crypto API.
 */

const PBKDF2_ITERATIONS = 100000;
const SALT_STORAGE_KEY = 'docvault_user_salt';

// ArrayBuffer to Base64
export function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Base64 to ArrayBuffer
export function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Get or generate per-user encryption salt
export function getUserSalt(): Uint8Array {
  const stored = localStorage.getItem(SALT_STORAGE_KEY);
  if (stored) {
    return new Uint8Array(base64ToBuffer(stored));
  }
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  localStorage.setItem(SALT_STORAGE_KEY, bufferToBase64(salt.buffer));
  return salt;
}

// Derive AES-256 master key from passphrase or PIN using PBKDF2
export async function deriveMasterKey(passphrase: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const salt = getUserSalt();

  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
  );
}

// Generate unique random 256-bit AES-GCM key for an individual document
export async function generateDocumentKey(): Promise<CryptoKey> {
  return await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

// Encrypt plaintext string or base64 file with AES-256-GCM
export async function encryptData(
  plainText: string,
  key: CryptoKey
): Promise<{ cipherText: string; iv: string }> {
  const enc = new TextEncoder();
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit standard IV

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plainText)
  );

  return {
    cipherText: bufferToBase64(encryptedBuffer),
    iv: bufferToBase64(iv.buffer),
  };
}

// Decrypt AES-256-GCM ciphertext
export async function decryptData(
  cipherText: string,
  ivBase64: string,
  key: CryptoKey
): Promise<string> {
  const iv = new Uint8Array(base64ToBuffer(ivBase64));
  const encryptedBuffer = base64ToBuffer(cipherText);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    encryptedBuffer
  );

  const dec = new TextDecoder();
  return dec.decode(decryptedBuffer);
}

// Export raw key to base64
export async function exportKeyRaw(key: CryptoKey): Promise<string> {
  const raw = await window.crypto.subtle.exportKey('raw', key);
  return bufferToBase64(raw);
}

// Import raw base64 key
export async function importKeyRaw(keyBase64: string): Promise<CryptoKey> {
  const buffer = base64ToBuffer(keyBase64);
  return await window.crypto.subtle.importKey(
    'raw',
    buffer,
    { name: 'AES-GCM' },
    true,
    ['encrypt', 'decrypt']
  );
}

// Generate printable master recovery key (Formatted 16-character / 4-segment token)
export function generatePrintableRecoveryKey(): string {
  const randomBytes = window.crypto.getRandomValues(new Uint8Array(16));
  const hex = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
    .join('');
  return `DOCV-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}`;
}
