import { getActiveKeyPairs } from "@/actions/account/internal/getActiveKeyPairs";
import type { CurvyConfig } from "@/config/types";
import { portalFactoryAbi } from "@/contracts/evm/abi/portal-factory";
import { EvmRpc } from "@/rpc/evm";
import type { MatchedPortalRecord, Network } from "@/types/api";
import type { HexString } from "@/types/helper";
import { deriveAddress } from "@/utils/address/deriveAddress";
import { poseidonHash } from "@/utils/hash/poseidonHash";

/**
 * Enumerate every EVM portal owned by the active account's keys on `network`.
 *
 * Scans the global portal
 * table in batches, re-derives the recovery address + ownerHash from each
 * matched announcement, then re-derives the deterministic portal contract
 * address via a `portalFactory` multicall (`getEntryPortalAddress` /
 * `getExitPortalAddress`). Internal helper: takes `config` as a plain arg.
 */
export async function findOwnedEvmPortals(config: CurvyConfig, network: Network): Promise<MatchedPortalRecord[]> {
  const keyPairs = getActiveKeyPairs(config);

  if (!network.portalFactoryContractAddress) {
    throw new Error(`Provided network ${network.name} does not have PortalFactory contract deployed.`);
  }

  const rpc = config.getRpc().Network(network.id);

  if (!(rpc instanceof EvmRpc)) {
    throw new Error(`Unsupported network ${network.name}`);
  }

  const factoryAddress = network.portalFactoryContractAddress as HexString;

  const BATCH_SIZE = 200;
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;
  const owned: MatchedPortalRecord[] = [];

  while (offset < total) {
    const result = await config.api.portal.getPortalRecords({ offset, size: BATCH_SIZE });
    total = result.total;

    if (result.portals.length === 0) break;

    const scanData = result.portals.map((p) => ({
      ephemeralPublicKey: p.ephemeralKey,
      viewTag: p.viewTag,
    }));

    const { spendingPubKeys } = await config.core.scan(keyPairs.s, keyPairs.v, scanData);

    const [bjjX, bjjY] = keyPairs.babyJubjubPublicKey.split(".");

    const matched: { index: number; spendingPubKey: string; recoveryAddress: HexString; ownerHash: string }[] = [];

    for (let i = 0; i < spendingPubKeys.length; i++) {
      if (spendingPubKeys[i] === "") continue;

      const spendingPubKey = spendingPubKeys[i];
      const recoveryAddress = deriveAddress(spendingPubKey, "evm");

      const sharedSecret = spendingPubKey.split(".")[0];
      const ownerHash = poseidonHash([BigInt(bjjX), BigInt(bjjY), BigInt(sharedSecret)]).toString();

      matched.push({ index: i, spendingPubKey, recoveryAddress, ownerHash });
    }

    if (matched.length === 0) {
      offset += result.portals.length;
      continue;
    }

    const contracts = matched.map(({ index, recoveryAddress, ownerHash }) => {
      const portal = result.portals[index];
      if (portal.type === "entry") {
        return {
          abi: portalFactoryAbi,
          address: factoryAddress,
          functionName: "getEntryPortalAddress" as const,
          args: [BigInt(ownerHash), recoveryAddress],
        };
      }
      return {
        abi: portalFactoryAbi,
        address: factoryAddress,
        functionName: "getExitPortalAddress" as const,
        args: [portal.exitAddress as HexString, BigInt(portal.exitChainId), recoveryAddress],
      };
    });

    const multicallResults = await rpc.provider.multicall({ contracts });

    for (let j = 0; j < multicallResults.length; j++) {
      const { result: derivedAddress, status } = multicallResults[j];
      if (status !== "success" || !derivedAddress) continue;

      const { index, recoveryAddress } = matched[j];
      owned.push({
        ...result.portals[index],
        flavour: "evm",
        contractAddress: derivedAddress as HexString,
        recoveryAddress,
      });
    }

    offset += result.portals.length;
  }

  return owned;
}
