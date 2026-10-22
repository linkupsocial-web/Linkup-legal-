import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const TOKEN_BYTES = 32;
export const CHECKOUT_TOKEN_TTL_MS = 30 * 60 * 1000;

export type CheckoutToken = {
  value: string;
  hash: string;
  expiresAt: string;
};

export function createCheckoutToken(now = Date.now()): CheckoutToken {
  const value = randomBytes(TOKEN_BYTES).toString("base64url");
  return {
    value,
    hash: hashCheckoutToken(value),
    expiresAt: new Date(now + CHECKOUT_TOKEN_TTL_MS).toISOString(),
  };
}

export function hashCheckoutToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function matchesCheckoutToken(token: string, expectedHash: string | null | undefined): boolean {
  if (!token || !expectedHash || !/^[a-f0-9]{64}$/i.test(expectedHash)) return false;

  const provided = Buffer.from(hashCheckoutToken(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}
