const te = new TextEncoder();
const td = new TextDecoder();

export const b64u = {
  enc: (a: ArrayBuffer) =>
    btoa(String.fromCharCode(...new Uint8Array(a)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, ""),
  dec: (s: string) => {
    s = s.replace(/-/g, "+").replace(/_/g, "/");
    const pad = s.length % 4 ? 4 - (s.length % 4) : 0;
    const bin = atob(s + "=".repeat(pad));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
  },
};

export function generateRandomKey(): Uint8Array {
  const k = new Uint8Array(32);
  crypto.getRandomValues(k);
  return k;
}

// --- Passphrase KDF (PBKDF2-SHA-256) ---
export async function deriveKeyPBKDF2(
  passphrase: string,
  saltB64u: string,
  iterations: number
) {
  const salt = new Uint8Array(b64u.dec(saltB64u));
  const baseKey = await crypto.subtle.importKey(
    "raw",
    te.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    baseKey,
    256
  );
  return new Uint8Array(bits); // 32 bytes
}

export async function makeNewSaltB64u(len = 16) {
  const s = new Uint8Array(len);
  crypto.getRandomValues(s);
  return b64u.enc(s.buffer);
}

export async function encryptTextAESGCM(plain: string, rawKey: BufferSource) {
  const key = await crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, [
    "encrypt",
  ]);
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    te.encode(plain)
  );
  return {
    iv_b64u: b64u.enc(iv.buffer),
    ct_b64u: b64u.enc(ct),
    alg: "AES-GCM-256",
  };
}

export async function decryptTextAESGCM(
  ct_b64u: string,
  iv_b64u: string,
  rawKey: BufferSource
) {
  const key = await crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, [
    "decrypt",
  ]);
  const iv = new Uint8Array(b64u.dec(iv_b64u));
  const ct = b64u.dec(ct_b64u);
  const plainBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ct
  );
  return td.decode(plainBuf);
}
