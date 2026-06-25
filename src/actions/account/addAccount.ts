import type { CurvyAccount } from "@/account";
import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import type { CurvyAccountData } from "@/types/account";
import { setActiveAccount } from "./setActiveAccount";

export type AddAccountParameters = WithConfig<{
  account: CurvyAccount;
  skipBearerTokenUpdate?: boolean;
}>;

/**
 * Decompose a `CurvyAccount` DTO into the runtime stores, make it active, and
 * persist it.
 *
 * The raw keypairs go into `config.keyring` (never `state`). For non-partial
 * (registered) accounts the serializable `CurvyAccountData` is published to
 * `state.accounts` so `watch*` fire, the metadata is written to durable storage,
 * and the keypairs are stashed in the browser keystore for refresh survival.
 * A partial account lives only in the keyring.
 *
 * @example
 * await addAccount({ account });
 */
export async function addAccount(parameters: AddAccountParameters): Promise<void> {
  const config = resolveConfig(parameters.config);
  const { account, skipBearerTokenUpdate = false } = parameters;

  // Keys → keyring (the sole runtime home of key material), even for partials.
  config.keyring.set(account.id, account.keyPairs);

  // `serialize()` throws for partials; a non-null result is the "registered" flag.
  const serialized = account.isPartial ? null : account.serialize();

  if (serialized) {
    const metadata: CurvyAccountData = {
      ...serialized,
      scanCursors: { latest: undefined, oldest: undefined },
    };
    config.setState((state) => ({ accounts: { ...state.accounts, [account.id]: metadata } }));
  }

  await setActiveAccount({ config, accountId: account.id, skipBearerTokenUpdate });

  if (serialized) {
    // Idempotent: a repeat login / session restore re-adds the same account
    // (the id is derived deterministically from the keypairs) — upsert instead
    // of insert so it updates the metadata rather than throwing "already exists".
    await config.storage.upsertCurvyAccount(serialized);
    config.keystore?.set(account.id, JSON.stringify(account.keyPairs));
  }
}
