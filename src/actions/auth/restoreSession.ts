import { CurvyAccount } from "@/account";
import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import type { CurvyKeyPairs, HexString } from "@/types";
import { addAccount } from "../account/addAccount";

/**
 * Rehydrate accounts from the browser keystore after a page refresh.
 *
 * If the keystore holds entries, the persisted JWT (under `__jwt__`) is
 * restored first so adding accounts can skip the re-auth round trip (TOTP sign +
 * POST /auth). Each remaining key is a account whose keypairs come from the
 * keystore and whose metadata comes from storage; they are rebuilt into a
 * `CurvyAccount` and added. Per-account failures (missing metadata, corrupt data)
 * are swallowed — the user can re-authenticate to re-derive keypairs.
 *
 * No-op in Node (`config.keystore` is `null`).
 *
 * @example
 * await restoreSession();
 */
export async function restoreSession(parameters: WithConfig = {}): Promise<void> {
  const config = resolveConfig(parameters.config);

  if (!config.keystore || config.keystore.size === 0) return;

  // Restore JWT first — if available, we can skip the re-auth round trip
  // (TOTP sign + POST /auth) when adding accounts.
  const persistedJwt = config.keystore.get("__jwt__");
  const hasValidJwt = !!persistedJwt;
  if (hasValidJwt) {
    config.api.updateBearerToken(persistedJwt ?? undefined);
  }

  for (const accountId of config.keystore.keys()) {
    if (accountId === "__jwt__") continue; // skip the JWT entry
    try {
      const raw = config.keystore.get(accountId);
      if (!raw) continue;
      const keyPairs = JSON.parse(raw) as CurvyKeyPairs;
      const accountData = await config.storage.getCurvyAccountDataById(accountId);
      if (!accountData) continue;

      const account = new CurvyAccount(
        keyPairs,
        accountData.curvyHandle,
        accountData.ownerAddress as HexString,
        accountData.createdAt,
      );
      // Skip bearer token update if we already restored the JWT from keystore.
      // This avoids a full re-auth round trip (TOTP + signature).
      await addAccount({ config, account: account, skipBearerTokenUpdate: hasValidJwt });
    } catch {
      // Account restore failed (metadata missing, corrupt data, etc.) — skip silently.
      // The user can re-authenticate to re-derive keypairs.
    }
  }
}
