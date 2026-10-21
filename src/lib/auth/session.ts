/**
 * Stateless session tokens signed with HMAC-SHA256. Implemented with the Web
 * Crypto API so the same module works in the Node.js server runtime and in
 * middleware (edge runtime).
 */

export const SESSION_COOKIE = "ar_session";
export const SESSION_MAX_AGE = 60 * 60 * 8; // 8 hours

export type SessionPayload = {
  uid: string;
  email: string;
  name: string;
  role: string;
  /** Expiry, seconds since the epoch. */
  exp: number;
};

function getSecret(): string | null {
  const secret = process.env.AUTH_SECRET;
  return secret && secret.length > 0 ? secret : null;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function sign(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return bytesToBase64Url(new Uint8Array(signature));
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

export async function createSessionToken(
  input: Omit<SessionPayload, "exp">,
  maxAgeSeconds: number = SESSION_MAX_AGE,
): Promise<string> {
  const secret = getSecret();
  if (!secret) throw new Error("AUTH_SECRET is not set. Add it to your .env file.");

  const payload: SessionPayload = {
    ...input,
    exp: Math.floor(Date.now() / 1000) + maxAgeSeconds,
  };
  const body = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await sign(body, secret);
  return `${body}.${signature}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  const secret = getSecret();
  if (!secret || !token) return null;

  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = await sign(body, secret);
  if (!constantTimeEqual(signature, expected)) return null;

  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(body))) as SessionPayload;
    if (!payload?.uid || typeof payload.exp !== "number") return null;
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
