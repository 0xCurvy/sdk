import {
  type Address,
  address,
  appendTransactionMessageInstruction,
  type Base64EncodedWireTransaction,
  compileTransaction,
  createSolanaRpc,
  createTransactionMessage,
  getBase64Decoder,
  type Instruction,
  pipe,
  type Signature,
  type SolanaRpcApi,
  type Rpc as SolanaRpcClient,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
} from "@solana/kit";
import { findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import { Buffer } from "buffer";
import { NETWORK_ENVIRONMENT } from "@/constants/networks";
import { NATIVE_SOL_MINT } from "@/constants/solana";
import { Rpc } from "@/rpc/abstract";
import type { Currency, Network } from "@/types/api";
import type { HexString } from "@/types/helper";
import { toSlug } from "@/utils/format";
import type { RpcBalance, RpcBalances } from "./types";

/**
 * Minimal Solana signer shape used by `sendTransactionWithSigner`.
 *
 * Intentionally kit-agnostic *and* account-adapter-agnostic: the SDK compiles
 * a transaction message to raw bytes and hands those bytes to the caller's
 * `signTransaction`, expecting the fully-signed wire-format bytes back. The
 * frontend is responsible for whatever ceremony is needed to get the account
 * to sign (it can deserialize into a `VersionedTransaction`, hand it to
 * `@solana/account-adapter-react`, and serialize the result).
 *
 * This keeps `@solana/web3.js` out of the SDK bundle entirely — kit handles
 * every tx-building concern on this side of the boundary.
 */
type SolanaSigner = {
  /** Base58 Solana address that will be the fee payer. */
  readonly address: string;
  /**
   * Sign a compiled transaction message. Input is the raw kit-compiled
   * `messageBytes`. Output must be the full serialized signed wire
   * transaction (signatures || message), ready for `sendTransaction`.
   */
  signTransaction(messageBytes: Uint8Array): Promise<Uint8Array>;
};

/**
 * Solana RPC adapter — the Solana counterpart of `EvmRpc`.
 *
 * Implements the same `Rpc` interface so `MultiRpc` can route transparently
 * based on the network filter. The internal client is `@solana/kit`'s functional
 * RPC (`createSolanaRpc(rpcUrl)`), bound to whatever cluster `network.rpcUrl`
 * points at (mainnet-beta / devnet / localnet — same client API for all three).
 *
 * Address handling: Solana addresses are base58 32-byte values, NOT hex. The
 * `Rpc` abstract widens `stealthAddress` to `string` for this reason; consumers
 * pass the appropriate format for the network they are targeting.
 */
class SolanaRpc extends Rpc {
  readonly #rpc: SolanaRpcClient<SolanaRpcApi>;

  constructor(network: Network) {
    super(network);
    this.#rpc = createSolanaRpc(network.rpcUrl);
  }

  /** Underlying `@solana/kit` RPC client — the Solana equivalent of viem's PublicClient. */
  get provider() {
    return this.#rpc;
  }

  /**
   * Build, hand off for signing, submit, and confirm a single-instruction tx.
   * Returns the transaction signature (base58).
   *
   * The full transaction lifecycle lives here in `@solana/kit` — only the
   * signing step is delegated out to `signer.signTransaction`, which receives
   * raw compiled-message bytes and returns the serialized signed wire tx.
   */
  async sendTransactionWithSigner(instruction: Instruction, signer: SolanaSigner): Promise<Signature> {
    const payerAddress = address(signer.address);

    const { value: latestBlockhash } = await this.#rpc.getLatestBlockhash({ commitment: "confirmed" }).send();

    const txMessage = pipe(
      createTransactionMessage({ version: 0 }),
      (m) => setTransactionMessageFeePayer(payerAddress, m),
      (m) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, m),
      (m) => appendTransactionMessageInstruction(instruction, m),
    );

    const compiled = compileTransaction(txMessage);
    const signedWireBytes = await signer.signTransaction(compiled.messageBytes as unknown as Uint8Array);

    // `@solana/kit` speaks base64 when encoding wire transactions for
    // `sendTransaction`; we decode the signer's raw bytes into a base64
    // string via the kit codec to keep everything kit-typed.
    const base64Wire = getBase64Decoder().decode(signedWireBytes) as Base64EncodedWireTransaction;
    const signature = await this.#rpc
      .sendTransaction(base64Wire, { encoding: "base64", preflightCommitment: "confirmed" })
      .send();

    await this.#waitForSignatureConfirmation(signature, latestBlockhash.lastValidBlockHeight);
    return signature;
  }

  /**
   * Poll until the signature is confirmed or the blockhash expires. Cheaper
   * than wiring up `sendAndConfirmTransactionFactory` (which needs a WS
   * subscription) and fine for the low-throughput recovery path.
   */
  async #waitForSignatureConfirmation(signature: Signature, lastValidBlockHeight: bigint): Promise<void> {
    const pollIntervalMs = 1_000;
    for (;;) {
      const { value } = await this.#rpc.getSignatureStatuses([signature]).send();
      const status = value[0];
      if (status) {
        if (status.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
        }
        if (status.confirmationStatus === "confirmed" || status.confirmationStatus === "finalized") {
          return;
        }
      }
      const currentHeight = await this.#rpc.getBlockHeight({ commitment: "confirmed" }).send();
      if (currentHeight > lastValidBlockHeight) {
        throw new Error("Transaction blockhash expired before confirmation");
      }
      await new Promise((r) => setTimeout(r, pollIntervalMs));
    }
  }

  /**
   * Fetch balances for every supported currency on this Solana network in a
   * single multicall-equivalent batch.
   *
   * Implementation notes:
   *   - Native SOL balance comes from `getBalance` (account lamports).
   *   - SPL balances live in per-(owner, mint) Associated Token Accounts (ATAs)
   *     so we derive every ATA up front (pure crypto, no I/O), then fetch all
   *     of them in one `getMultipleAccounts` call.
   *   - We also fetch `getMinimumBalanceForRentExemption(0)` so the SOL balance
   *     reported here is rent-adjusted: the rent floor is subtracted because the
   *     vault must keep at least that many lamports or the runtime deletes it.
   *     (EVM has no equivalent — this is a Solana-specific rent model.)
   *
   * Total RPC round-trips: 3, regardless of the number of supported SPL mints.
   */
  async getBalances(stealthAddress: string): Promise<RpcBalances> {
    const owner = address(stealthAddress);

    const solCurrency = this.network.currencies.find((c: Currency) => c.nativeCurrency);
    const splCurrencies = this.network.currencies.filter((c: Currency) => !c.nativeCurrency);

    // Derive all ATAs in parallel — purely local crypto, no rate-limit concerns.
    const splAtas = await Promise.all(
      splCurrencies.map(async (c) => {
        const [ata] = await findAssociatedTokenPda({
          mint: address(c.contractAddress),
          owner,
          tokenProgram: TOKEN_PROGRAM_ADDRESS,
        });
        return ata;
      }),
    );

    // Batch every RPC call in one Promise.all — the Solana equivalent of an EVM
    // multicall: getBalance + getMinimumBalanceForRentExemption + getMultipleAccounts.
    const [solBalanceRes, rentExempt, splAccountsRes] = await Promise.all([
      this.#rpc.getBalance(owner).send(),
      this.#rpc.getMinimumBalanceForRentExemption(0n).send(),
      splAtas.length > 0
        ? this.#rpc.getMultipleAccounts(splAtas, { encoding: "base64" }).send()
        : Promise.resolve({ value: [] as null[] }),
    ]);

    const networkSlug = toSlug(this.network.name);
    const environment = this.network.testnet ? NETWORK_ENVIRONMENT.TESTNET : NETWORK_ENVIRONMENT.MAINNET;
    const acc: RpcBalances = {};

    // Native SOL — subtract the rent-exempt floor so callers don't try to drain
    // the account below the runtime-required minimum.
    if (solCurrency) {
      const solBalance = solBalanceRes.value;
      const bridgeable = solBalance > rentExempt ? solBalance - rentExempt : 0n;
      acc[networkSlug] ??= {};
      acc[networkSlug]![solCurrency.contractAddress] = {
        id: solCurrency.id,
        balance: bridgeable,
        // Solana mint addresses are base58, not hex — cast for type compatibility.
        currencyAddress: solCurrency.contractAddress as HexString,
        vaultTokenId: solCurrency.vaultTokenId ? BigInt(solCurrency.vaultTokenId) : null,
        symbol: solCurrency.symbol,
        decimals: solCurrency.decimals,
        environment,
      };
    }

    // SPL balances — `null` entries mean the ATA hasn't been initialized yet
    // (no balance ever deposited for that mint).
    const splAccounts = splAccountsRes.value;
    for (let i = 0; i < splCurrencies.length; i++) {
      const account = splAccounts[i];
      if (!account) continue;

      // SPL Token account layout: [mint(32)][owner(32)][amount(u64 LE @ 64)]...
      // We read the amount directly from the raw bytes — faster than full struct
      // deserialization. Base64 data comes back as a [string, "base64"] tuple.
      const data = Buffer.from(account.data[0], "base64");
      const amount = data.readBigUInt64LE(64);

      const currency = splCurrencies[i];
      acc[networkSlug] ??= {};
      acc[networkSlug]![currency.contractAddress] = {
        id: currency.id,
        balance: amount,
        currencyAddress: currency.contractAddress as HexString,
        vaultTokenId: currency.vaultTokenId ? BigInt(currency.vaultTokenId) : null,
        symbol: currency.symbol,
        decimals: currency.decimals,
        environment,
      };
    }

    return acc;
  }

  /**
   * Single-token balance lookup. Mirrors `EvmRpc.getBalance` shape so callers
   * can swap providers based only on the network's flavour.
   */
  async getBalance(stealthAddress: string, symbol: string): Promise<RpcBalance> {
    const token = this.network.currencies.find((c: Currency) => c.symbol === symbol);
    if (!token) throw new Error(`Token ${symbol} not found.`);

    const owner = address(stealthAddress);
    const isNative = token.nativeCurrency || (token.contractAddress as string) === NATIVE_SOL_MINT;
    let balance: bigint;

    if (isNative) {
      const [{ value: lamports }, rentExempt] = await Promise.all([
        this.#rpc.getBalance(owner).send(),
        this.#rpc.getMinimumBalanceForRentExemption(0n).send(),
      ]);
      balance = lamports > rentExempt ? lamports - rentExempt : 0n;
    } else {
      const [ata] = await findAssociatedTokenPda({
        mint: address(token.contractAddress),
        owner,
        tokenProgram: TOKEN_PROGRAM_ADDRESS,
      });
      const { value: account } = await this.#rpc.getAccountInfo(ata as Address, { encoding: "base64" }).send();
      if (!account) {
        balance = 0n;
      } else {
        const data = Buffer.from(account.data[0], "base64");
        balance = data.readBigUInt64LE(64);
      }
    }

    return {
      id: token.id,
      balance,
      currencyAddress: token.contractAddress as HexString,
      vaultTokenId: token.vaultTokenId ? BigInt(token.vaultTokenId) : null,
      symbol,
      decimals: token.decimals,
      environment: this.network.testnet ? NETWORK_ENVIRONMENT.TESTNET : NETWORK_ENVIRONMENT.MAINNET,
    } satisfies RpcBalance;
  }
}

export { SolanaRpc, type SolanaSigner };
