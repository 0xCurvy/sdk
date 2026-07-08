import { isAddress as isSolanaAddress, type Address as SolanaAddress, address as toSolanaAddress } from "@solana/kit";
import { getActiveKeyPairs } from "@/actions/account/internal/getActiveKeyPairs";
import type { CurvyConfig } from "@/config/types";
import { deriveRecoveryIdentifier, deriveVaultPda, ownerHashToBytes } from "@/solana";
import type { MatchedPortalRecord, Network } from "@/types/api";

/**
 * Locate a Solana entry-portal vault PDA among the user's portal records.
 *
 * Shares the same `core.scan`
 * pass as EVM — the recovery key is the derived secp256k1 private key. The
 * difference is the on-chain identity: Solana derives a `recoveryIdentifier`
 * (hash of the compressed secp256k1 pubkey) and builds the vault address via
 * `[PORTAL_SEED, ownerHash, recoveryIdentifier]`.
 *
 * Solana only supports entry portals today — exit-portal rows are skipped.
 * Internal helper: takes `config` as a plain first arg.
 */
export async function findSolanaPortal(
  config: CurvyConfig,
  targetBase58: string,
  network: Network,
): Promise<MatchedPortalRecord | null> {
  if (!network.portalProgramAddress) {
    throw new Error(`Network ${network.name} does not have a Solana portal program address configured.`);
  }

  if (!isSolanaAddress(targetBase58)) {
    throw new Error(`Invalid Solana address: ${targetBase58}`);
  }

  const keyPairs = getActiveKeyPairs(config);
  const programAddress: SolanaAddress = toSolanaAddress(network.portalProgramAddress);
  const targetVault: SolanaAddress = targetBase58;

  const BATCH_SIZE = 200;
  let cursor: string | undefined;

  while (true) {
    const result = await config.api.portal.GetPortalRecords({ cursor, limit: BATCH_SIZE });
    if (result.portals.length === 0) break;
    cursor = result.nextCursor ?? undefined;

    const scanData = result.portals.map((p) => ({
      ephemeralPublicKey: p.ephemeralKey,
      viewTag: p.viewTag,
    }));

    const { spendingPrivKeys } = await config.core.scan(keyPairs.s, keyPairs.v, scanData);

    for (let i = 0; i < spendingPrivKeys.length; i++) {
      const privKey = spendingPrivKeys[i];
      if (!privKey) continue;

      const portal = result.portals[i];
      // Solana supports entry-portal recovery only. Exit portals have no
      // ownerHash and their PDA derivation doesn't apply.
      if (portal.type !== "entry") continue;

      const { recoveryIdentifier } = await deriveRecoveryIdentifier(privKey);
      const ownerHashBytes = ownerHashToBytes(portal.ownerHash);
      const [vaultPda] = await deriveVaultPda(programAddress, ownerHashBytes, recoveryIdentifier);

      if (vaultPda !== targetVault) continue;

      return {
        ...portal,
        flavour: "solana",
        contractAddress: vaultPda,
        recoveryPubKey: recoveryIdentifier,
      };
    }

    if (!cursor) break;
  }

  return null;
}
