import { decryptAmountToken as rustDecryptAmountToken, encryptAmountToken as rustEncryptAmountToken } from "./rustCore";

export type EncryptedAmountToken = { encryptedAmount: bigint; encryptedToken: bigint };

/** Rust-backed v2 AES-256-CTR additive field codec. */
export async function encryptAmountToken(params: {
  amount: bigint;
  token: bigint;
  sharedSecret: bigint;
  ephemeralKey: readonly [bigint, bigint];
}): Promise<EncryptedAmountToken> {
  return rustEncryptAmountToken(params.amount, params.token, params.sharedSecret, params.ephemeralKey);
}

/** Inverse of `encryptAmountToken`. The caller must verify the recomputed noteId. */
export async function decryptAmountToken(params: {
  encryptedAmount: bigint;
  encryptedToken: bigint;
  sharedSecret: bigint;
  ephemeralKey: readonly [bigint, bigint];
}): Promise<{ amount: bigint; token: bigint }> {
  return rustDecryptAmountToken(
    params.encryptedAmount,
    params.encryptedToken,
    params.sharedSecret,
    params.ephemeralKey,
  );
}
