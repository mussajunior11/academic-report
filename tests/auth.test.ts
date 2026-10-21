import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSessionToken, verifySessionToken } from "@/lib/auth/session";

describe("password hashing", () => {
  it("verifies a correct password", async () => {
    const hash = await hashPassword("Admin@12345");
    expect(hash.startsWith("scrypt:")).toBe(true);
    expect(await verifyPassword("Admin@12345", hash)).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("Admin@12345");
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("produces a different hash each time (random salt)", async () => {
    const a = await hashPassword("same-password");
    const b = await hashPassword("same-password");
    expect(a).not.toBe(b);
  });

  it("rejects a malformed stored value", async () => {
    expect(await verifyPassword("x", "not-a-valid-hash")).toBe(false);
  });
});

describe("session tokens", () => {
  const user = { uid: "user-1", email: "admin@example.com", name: "Admin", role: "ADMIN" };

  it("round-trips a valid token", async () => {
    const token = await createSessionToken(user);
    const payload = await verifySessionToken(token);
    expect(payload?.uid).toBe("user-1");
    expect(payload?.email).toBe("admin@example.com");
  });

  it("rejects a tampered token", async () => {
    const token = await createSessionToken(user);
    const [body, signature] = token.split(".");
    const tampered = `${body}.${signature.slice(0, -1)}${signature.endsWith("A") ? "B" : "A"}`;
    expect(await verifySessionToken(tampered)).toBeNull();
  });

  it("rejects a token with a modified payload", async () => {
    const token = await createSessionToken(user);
    const [, signature] = token.split(".");
    const forgedBody = btoa(JSON.stringify({ ...user, uid: "attacker", exp: 9999999999 }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(await verifySessionToken(`${forgedBody}.${signature}`)).toBeNull();
  });

  it("rejects an expired token", async () => {
    const token = await createSessionToken(user, -10);
    expect(await verifySessionToken(token)).toBeNull();
  });

  it("rejects missing tokens", async () => {
    expect(await verifySessionToken(undefined)).toBeNull();
    expect(await verifySessionToken(null)).toBeNull();
    expect(await verifySessionToken("garbage")).toBeNull();
  });
});
