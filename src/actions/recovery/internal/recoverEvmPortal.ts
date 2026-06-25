import type { Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { CurvyConfig } from "@/config/types";
import { portalFactoryAbi } from "@/contracts/evm/abi/portal-factory";
import type { EvmRpc } from "@/rpc/evm";
import type { MatchedPortalRecord, Network } from "@/types/api";
import type { HexString } from "@/types/helper";

/**
 * Submit a `deployRecoveryEntryPortal` / `deployRecoveryExitPortal` tx that
 * sweeps the portal's funds to `destinationAddress`.
 *
 * The recovery account (derived
 * from the announcement's spending private key) is the tx sender; the
 * factory deploys a one-shot recovery portal that forwards the funds.
 * Internal helper: takes `config` as a plain first arg.
 */
export async function recoverEvmPortal(
  config: CurvyConfig,
  args: {
    network: Network;
    portalRecord: Extract<MatchedPortalRecord, { flavour: "evm" }>;
    recoveryPrivateKey: HexString;
    tokenAddress: HexString;
    destinationAddress: HexString;
  },
): Promise<HexString> {
  const { network, portalRecord, recoveryPrivateKey, tokenAddress, destinationAddress } = args;

  const recoveryAccount = privateKeyToAccount(recoveryPrivateKey);
  const rpc = config.getRpc().Network(network.id) as EvmRpc;
  const publicClient = rpc.provider;

  if (!network.portalFactoryContractAddress) {
    throw new Error(`Network ${network.name} does not have PortalFactory contract deployed.`);
  }

  let deployRecoveryTxHash: HexString;
  if (portalRecord.type === "entry") {
    deployRecoveryTxHash = await rpc.walletClient.writeContract({
      account: recoveryAccount,
      abi: portalFactoryAbi,
      address: network.portalFactoryContractAddress as HexString,
      functionName: "deployRecoveryEntryPortal",
      args: [
        BigInt(portalRecord.ownerHash),
        portalRecord.recoveryAddress as Address,
        tokenAddress as Address,
        destinationAddress as Address,
      ],
    });
  } else {
    deployRecoveryTxHash = await rpc.walletClient.writeContract({
      abi: portalFactoryAbi,
      account: recoveryAccount,
      address: network.portalFactoryContractAddress as HexString,
      functionName: "deployRecoveryExitPortal",
      args: [
        portalRecord.exitAddress as Address,
        BigInt(portalRecord.exitChainId),
        portalRecord.recoveryAddress as Address,
        tokenAddress as Address,
        destinationAddress as Address,
      ],
    });
  }

  await publicClient.waitForTransactionReceipt({ hash: deployRecoveryTxHash });

  return deployRecoveryTxHash;
}
