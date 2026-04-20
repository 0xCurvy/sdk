/**
 * Solana-specific types shared across the SDK and backend Solana modules.
 *
 * These live in the SDK so backend code can import them directly alongside
 * the encoding helpers and PDA derivations that consume them — one source of
 * truth for every Solana-related shape.
 */

/**
 * Flattened balance record for a single Solana token at a vault address.
 *
 * Used by the backend portal broadcaster after resolving currency metadata
 * from the cached `Network[]` list. The contractAddress field holds an SPL
 * mint address, or the `NATIVE_SOL_MINT` sentinel for native SOL balances.
 */
export type SolanaPortalBalance = {
  networkId: number;
  currencyId: number;
  decimals: number;
  balance: bigint;
  symbol: string;
  /** The SPL mint address (or `NATIVE_SOL_MINT` placeholder for native SOL). */
  contractAddress: string;
};

/**
 * Across V4 deposit parameters — the Solana-side equivalent of calling
 * `SpokePool.depositV3(...)` on the EVM Across contract.
 *
 * All 32-byte address fields encode EVM addresses left-padded with zeros
 * into 32 bytes, because Across's Solana program uses fixed-size byte arrays
 * for cross-chain address compatibility.
 */
export type AcrossQuoteParams = {
  /** EVM recipient address as 32-byte left-padded array (like abi.encode(address)). */
  recipient: Uint8Array;
  /** EVM output token address as 32-byte left-padded array. */
  outputToken: Uint8Array;
  /** Output amount as 32-byte big-endian uint256 (matching EVM's uint256 encoding). */
  outputAmount: Uint8Array;
  destinationChainId: bigint;
  /** Set to 32 zero bytes (PublicKey.default) for no exclusive relayer. */
  exclusiveRelayer: Uint8Array;
  /** Unix timestamp (seconds) — when the quote was generated. Must be within a recent window. */
  quoteTimestamp: number;
  /** Unix timestamp (seconds) — after this, the fill will revert on the destination chain. */
  fillDeadline: number;
  /** 0 = no exclusivity. Otherwise adds seconds to current time for exclusive fill window. */
  exclusivityParameter: number;
  /** Arbitrary message for the recipient contract (empty for EOA recipients). */
  message: Uint8Array;
};
