import { type Address, createWalletClient, getContract, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getBalance } from "viem/actions";
import { portalFactoryAbi } from "@/contracts/evm/abi/portal-factory";
import type { ICore } from "@/interfaces/core";
import type { MultiRpc } from "@/rpc/multi";
import type { MatchedPortalRecord, Network, RecoveryStage } from "@/types/api";
import type { HexString } from "@/types/helper";
import { generateViemChainFromNetwork } from "@/utils/rpc";

const NATIVE_ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as const;

class PortalRecovery {
  readonly #core: ICore;
  readonly #rpcClient: MultiRpc;
  readonly #networks: Network[];

  constructor(core: ICore, rpcClient: MultiRpc, networks: Network[]) {
    this.#core = core;
    this.#rpcClient = rpcClient;
    this.#networks = networks;
  }

  async recoverPortal(args: {
    portal: MatchedPortalRecord;
    destinationAddress: HexString;
    networkId: number;
    tokenAddress: HexString;
    spendingPrivateKey: string;
    viewingPrivateKey: string;
    onProgress?: (stage: RecoveryStage) => void;
  }): Promise<HexString> {
    const { portal, destinationAddress, networkId, tokenAddress, spendingPrivateKey, viewingPrivateKey, onProgress } =
      args;

    // Step 1: Derive the recovery private key client-side
    onProgress?.({ step: "deriving_key" });

    const { spendingPrivKeys } = await this.#core.scan(spendingPrivateKey, viewingPrivateKey, [
      {
        ephemeralPublicKey: portal.ephemeralKey,
        viewTag: portal.viewTag,
      },
    ]);

    const recoveryPrivateKey = spendingPrivKeys[0];
    if (!recoveryPrivateKey) {
      throw new Error("Failed to derive recovery private key: no matching key found for the given announcement.");
    }

    const recoveryAccount = privateKeyToAccount(recoveryPrivateKey);

    // Resolve the network on which the portal is deployed
    const network = this.#networks.find((n) => n.id === networkId);
    if (!network) {
      throw new Error(`Network with id ${networkId} not found.`);
    }

    const rpc = this.#rpcClient.Network(network.id);
    const publicClient = rpc.provider;

    // Step 2: Check gas balance and emit waiting_for_gas stage
    onProgress?.({ step: "waiting_for_gas", recoveryAddress: recoveryAccount.address as HexString });

    const recoveryBalance = await getBalance(publicClient, { address: recoveryAccount.address });
    if (recoveryBalance === 0n) {
      throw new Error("Recovery account has no gas. Please fund the recovery account with gas.");
    }

    // Step 3: Deploy portal and recover funds
    onProgress?.({ step: "deploying_recovery_portal" });
    const chain = generateViemChainFromNetwork(network);
    const recoveryWalletClient = createWalletClient({
      account: recoveryAccount,
      transport: http(network.rpcUrl),
      chain,
    });

    if (!network.portalFactoryContractAddress) {
      throw new Error(`Network ${network.name} does not have PortalFactory contract deployed.`);
    }

    const portalFactory = getContract({
      address: network.portalFactoryContractAddress as Address,
      abi: portalFactoryAbi,
      client: recoveryWalletClient,
    });

    let deployRecoveryTxHash: HexString;
    if (portal.type === "entry") {
      deployRecoveryTxHash = await portalFactory.write.deployRecoveryEntryPortal([
        BigInt(portal.ownerHash),
        recoveryAccount.address as Address,
        tokenAddress as Address,
        destinationAddress as Address,
      ]);
    } else {
      deployRecoveryTxHash = await portalFactory.write.deployRecoveryExitPortal([
        portal.exitAddress as Address,
        BigInt(portal.exitChainId),
        recoveryAccount.address as Address,
        tokenAddress as Address,
        destinationAddress as Address,
      ]);
    }

    onProgress?.({ step: "submitting_transaction" });

    // Wait for confirmation
    await publicClient.waitForTransactionReceipt({ hash: deployRecoveryTxHash });

    onProgress?.({ step: "complete", txHash: deployRecoveryTxHash as HexString });

    return deployRecoveryTxHash as HexString;
  }

  /** Convenience: resolve native-ETH token address to the canonical constant */
  static isNativeEth(tokenAddress: string): boolean {
    return tokenAddress.toLowerCase() === NATIVE_ETH_ADDRESS.toLowerCase();
  }
}

export { PortalRecovery };
