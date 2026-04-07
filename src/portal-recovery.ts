import { type Address, createWalletClient, getContract, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getBalance } from "viem/actions";
import { portalAbi } from "@/contracts/evm/abi/portal";
import type { IApiClient } from "@/interfaces/api";
import type { ICore } from "@/interfaces/core";
import type { MultiRpc } from "@/rpc/multi";
import type { Network, RecoverablePortal, RecoveryStage } from "@/types/api";
import type { HexString } from "@/types/helper";
import { generateViemChainFromNetwork } from "@/utils/rpc";

const NATIVE_ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as const;

class PortalRecovery {
  readonly #core: ICore;
  readonly #apiClient: IApiClient;
  readonly #rpcClient: MultiRpc;
  readonly #networks: Network[];

  constructor(core: ICore, apiClient: IApiClient, rpcClient: MultiRpc, networks: Network[]) {
    this.#core = core;
    this.#apiClient = apiClient;
    this.#rpcClient = rpcClient;
    this.#networks = networks;
  }

  async recoverPortal(args: {
    portal: RecoverablePortal;
    destinationAddress: HexString;
    spendingPrivateKey: string;
    viewingPrivateKey: string;
    onProgress?: (stage: RecoveryStage) => void;
  }): Promise<HexString> {
    const { portal, destinationAddress, spendingPrivateKey, viewingPrivateKey, onProgress } = args;

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
    const network = this.#networks.find((n) => n.id === portal.fundedNetworkId);
    if (!network) {
      throw new Error(`Network with id ${portal.fundedNetworkId} not found.`);
    }

    const rpc = this.#rpcClient.Network(network.id);
    const publicClient = rpc.provider;

    // Step 2: Ensure the Portal contract is deployed at the expected address
    const bytecode = await publicClient.getCode({ address: portal.contractAddress as Address });
    const isDeployed = !!bytecode && bytecode !== "0x";

    if (!isDeployed) {
      const deployResult: DeployPortalForRecoveryReturnType["data"] = await this.#apiClient.portal.deployForRecovery(
        portal.id,
      );
      onProgress?.({ step: "deploying_portal", txHash: deployResult.transactionHash });

      // Wait for the deployment transaction to be confirmed
      await publicClient.waitForTransactionReceipt({ hash: deployResult.transactionHash });
    }

    // Step 3: Ensure the recovery account has gas
    const recoveryBalance = await getBalance(publicClient, { address: recoveryAccount.address });
    if (recoveryBalance === 0n) {
      const fundResult: FundRecoveryGasReturnType["data"] = await this.#apiClient.portal.fundRecoveryGas(
        portal.id,
        recoveryAccount.address as HexString,
      );
      onProgress?.({ step: "funding_gas", txHash: fundResult.transactionHash });

      // Wait for the funding transaction to be confirmed
      await publicClient.waitForTransactionReceipt({ hash: fundResult.transactionHash });
    }

    // Step 4: Submit the portal.recover() transaction signed by the derived recovery account
    const chain = generateViemChainFromNetwork(network);
    const recoveryWalletClient = createWalletClient({
      account: recoveryAccount,
      transport: http(network.rpcUrl),
      chain,
    });

    const portalContract = getContract({
      address: portal.contractAddress as Address,
      abi: portalAbi,
      client: recoveryWalletClient,
    });

    const txHash = await portalContract.write.recover([portal.tokenAddress as Address, destinationAddress as Address]);

    onProgress?.({ step: "submitting_recovery", txHash: txHash as HexString });

    // Wait for confirmation
    await publicClient.waitForTransactionReceipt({ hash: txHash });

    onProgress?.({ step: "complete", txHash: txHash as HexString });

    return txHash as HexString;
  }

  /** Convenience: resolve native-ETH token address to the canonical constant */
  static isNativeEth(tokenAddress: string): boolean {
    return tokenAddress.toLowerCase() === NATIVE_ETH_ADDRESS.toLowerCase();
  }
}

export { PortalRecovery };
