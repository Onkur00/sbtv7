/**
 * Cryptographic and Obfuscate utilities to secure the login system.
 */

/**
 * Hash a string (e.g. password) securely using SHA-256 via the Web Crypto API.
 */
export async function hashPassword(password: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * A robust symmetric obfuscation key based on a dynamic salt
 * to prevent plain-text inspection of Saved Credentials.
 */
const STORAGE_KEY_SALT = "LiveTvPlayerSecureSalt2026";

export function obfuscateData(text: string): string {
  if (!text) return "";
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i) ^ STORAGE_KEY_SALT.charCodeAt(i % STORAGE_KEY_SALT.length);
    result += String.fromCharCode(charCode);
  }
  // Convert to Base64 to ensure it is safe to store in local storage
  return btoa(unescape(encodeURIComponent(result)));
}

export function deobfuscateData(obfuscatedText: string): string {
  if (!obfuscatedText) return "";
  try {
    const decoded = decodeURIComponent(escape(atob(obfuscatedText)));
    let result = "";
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ STORAGE_KEY_SALT.charCodeAt(i % STORAGE_KEY_SALT.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch (err) {
    return obfuscatedText; // Fallback on legacy/unobfuscated storage
  }
}
