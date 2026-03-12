import { customAlphabet } from 'nanoid';

// URL-safe alphabet, 12 chars
const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const generate = customAlphabet(alphabet, 12);

export function generateToken(): string {
  return generate();
}

// 6-digit numeric PIN
const digits = '0123456789';
const generatePin = customAlphabet(digits, 6);

export function generatePIN(): string {
  return generatePin();
}
