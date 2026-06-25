import { getActiveKeyPairs } from "@/actions/account/internal/getActiveKeyPairs";
import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import type { SolanaSigner } from "@/rpc/solana";
import type { MatchedPortalRecord } from "@/types/api";
import type { HexString } from "@/types/helper";
import { recoverEvmPortal } from "./internal/recoverEvmPortal";
import { recoverSolanaPortal } from "./internal/recoverSolanaPortal";

export type RecoverPortalParameters = WithConfig<{
  networkId: number;
  tokenAddress: HexString | (string & {});
  portalRecord: MatchedPortalRecord;
  destinationAddress: HexString | (string & {});
  solanaSigner?: SolanaSigner;
}>;

/**
 * Recover (sweep) the funds held in a portal to `destinationAddress`.
 *
 * Re-derives the recovery private
 * key from the announcement via `core.scan`, then dispatches to the EVM or
 * Solana recovery flow based on the matched portal's flavour.
 *
 * @example
 * await recoverPortal({ networkId, tokenAddress, portalRecord, destinationAddress });
 *
 * @throws when the active account has no private keys, no matching recovery key
 * is found, the network id is unknown, or a Solana recovery is requested
 * without a signer.
 */
export async function recoverPortal(parameters: RecoverPortalParameters): Promise<string> {
  const config = resolveConfig(parameters.config);

  const { s, v } = getActiveKeyPairs(config);
  if (!s || !v) {
    throw new Error("Active account has no private keys available for recovery.");
  }

  const { portalRecord, networkId } = parameters;

  const { spendingPrivKeys } = await config.core.scan(s, v, [
    {
      ephemeralPublicKey: portalRecord.ephemeralKey,
      viewTag: portalRecord.viewTag,
    },
  ]);

  const recoveryPrivateKey = spendingPrivKeys[0];
  if (!recoveryPrivateKey) {
    throw new Error("Failed to derive recovery private key: no matching key found for the given announcement.");
  }

  const network = config.state.networks.find((n) => n.id === networkId);
  if (!network) {
    throw new Error(`Network with id ${networkId} not found.`);
  }

  if (portalRecord.flavour === "solana") {
    if (!parameters.solanaSigner) {
      throw new Error("Solana recovery requires a connected Solana account signer.");
    }
    return recoverSolanaPortal(config, {
      network,
      portalRecord,
      recoveryPrivateKey,
      mintAddress: parameters.tokenAddress,
      destinationAddress: parameters.destinationAddress,
      signer: parameters.solanaSigner,
    });
  }

  return recoverEvmPortal(config, {
    network,
    portalRecord,
    recoveryPrivateKey,
    tokenAddress: parameters.tokenAddress as HexString,
    destinationAddress: parameters.destinationAddress as HexString,
  });
}
