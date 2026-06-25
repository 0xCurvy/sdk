import type { CurvyConfig } from "@/config/types";
import { JWT_REFRESH_INTERVAL } from "@/constants/intervals";
import { signMessage } from "@/utils/encryption";
import type { SpendKey } from "@/utils/keys";

/**
 * Acquire a fresh bearer token by TOTP-signing the auth nonce with the
 * spending private key `s`, then push it into the API client.
 *
 * Internal (non-action) helper: `config` is a plain first arg. `s` is a branded
 * {@link SpendKey} — obtain it via `requireSpendKey(keyPairs)` so a missing key
 * fails loudly (typed error) rather than producing a malformed signature.
 */
export async function updateBearerToken(config: CurvyConfig, s: SpendKey): Promise<void> {
  config.api.updateBearerToken(
    await config.api.auth.GetBearerTotp().then((nonce) => {
      return config.api.auth.CreateBearerToken({ nonce, signature: signMessage(nonce, s) });
    }),
  );
}

/**
 * Start the JWT auto-refresh timer (stored in `config._internal.timers.jwtRefresh`).
 * No-op if a timer is already running, or there is no registered (non-partial)
 * active account. An account is registered iff it has a `state.accounts` entry;
 * partials don't.
 */
export function startJwtRefresh(config: CurvyConfig): void {
  const activeId = config.state.activeAccountId;
  const isRegistered = activeId != null && config.state.accounts[activeId] != null;

  if (!config._internal.timers.jwtRefresh && isRegistered) {
    config._internal.timers.jwtRefresh = config._internal.timerProvider.setInterval(() => {
      config.api.auth.RefreshBearerToken().then((token) => {
        config.api.updateBearerToken(token);
      });
    }, JWT_REFRESH_INTERVAL);
  }
}

/**
 * Stop the JWT auto-refresh timer.
 */
export function stopJwtRefresh(config: CurvyConfig): void {
  if (!config._internal.timers.jwtRefresh) {
    return;
  }
  config._internal.timers.jwtRefresh.cancel();
  config._internal.timers.jwtRefresh = undefined;
}
