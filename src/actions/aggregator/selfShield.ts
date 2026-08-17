import { type Address, erc20Abi, parseEventLogs, type TransactionReceipt, type WalletClient } from "viem";
import { getActiveKeyPairs } from "@/actions/account/internal/getActiveKeyPairs";
import { resolveConfig } from "@/config/global";
import type { WithConfig } from "@/config/types";
import { aggregatorAlphaV2Abi } from "@/contracts/evm/abi";
import { AggregatorSubmitError, MissingContractAddressError } from "@/errors";
import type { EvmRpc } from "@/rpc/evm";
import type { HexString } from "@/types/helper";
import type { ChainSubmitResult } from "./types";

// Some established tokens (notably USDT) return no value from approve. Declaring no
// outputs lets Viem simulate both those tokens and standard ERC-20s (whose extra return
// word is safely ignored) while preserving the same approve(address,uint256) selector.
const erc20ApproveAbi = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

export type SelfShieldParameters = WithConfig<{
  /** Network whose aggregator receives the deposit. */
  networkSlug: string;
  /** Gross amount deposited, in token base units (fees are deducted on-chain). */
  amount: bigint;
  /** Vault token id on the selected network. */
  token: bigint;
  /** Viem wallet that owns the funds and pays gas. */
  walletClient: WalletClient;
  /** Curvy account that receives the shielded note; defaults to the active account. */
  accountId?: string;
  /** Override the target aggregator; defaults to the network metadata. */
  contractAddress?: HexString;
  /** Override the vault approved to pull ERC-20s; defaults to the network metadata. */
  vaultContractAddress?: HexString;
}>;

export type SelfShieldPendingNote = {
  noteId: bigint;
  amount: bigint;
  token: bigint;
};

export type SelfShieldResult = ChainSubmitResult & {
  /** Final approval that established the required ERC-20 allowance, when one was needed. */
  approval?: ChainSubmitResult;
  /** Decoded from the aggregator's PendingNotes event when present in the receipt. */
  pendingNote?: SelfShieldPendingNote;
};

/**
 * Shield wallet funds directly into the active (or selected) Curvy account.
 * ERC-20 allowance is checked and, when necessary, an exact approval is sent for
 * the vault before calling the aggregator. A non-zero insufficient allowance is
 * reset first for USDT-style tokens. The vault pulls directly from the wallet;
 * native deposits attach `amount` as `msg.value`.
 */
export async function selfShield(parameters: SelfShieldParameters): Promise<SelfShieldResult> {
  const { walletClient, amount, token } = parameters;
  const config = resolveConfig(parameters.config);

  if (!walletClient.account) {
    throw new AggregatorSubmitError("selfShield: walletClient has no account to send from");
  }
  if (amount <= 0n) {
    throw new AggregatorSubmitError("selfShield: amount must be greater than zero");
  }

  const network = config.state.networks.find((candidate) => candidate.slug === parameters.networkSlug);
  if (!network) {
    throw new AggregatorSubmitError(`selfShield: unknown network "${parameters.networkSlug}"`);
  }
  if (network.flavour !== "evm") {
    throw new AggregatorSubmitError(`selfShield: network "${network.slug}" is not an EVM network`);
  }
  if (walletClient.chain && walletClient.chain.id !== Number(network.chainId)) {
    throw new AggregatorSubmitError(
      `selfShield: wallet chain ${walletClient.chain.id} does not match ${network.slug} (${network.chainId})`,
    );
  }

  const resolvedAddress = parameters.contractAddress ?? (network.aggregatorContractAddress as HexString | undefined);
  if (!resolvedAddress) {
    throw new MissingContractAddressError(`network "${network.slug}" has no aggregatorContractAddress`);
  }
  const address = resolvedAddress as Address;

  const currency = network.currencies.find((candidate) => candidate.vaultTokenId === token.toString());
  if (!currency) {
    throw new AggregatorSubmitError(`selfShield: vault token ${token} is not configured on network "${network.slug}"`);
  }
  const vaultAddress = parameters.vaultContractAddress ?? (network.vaultContractAddress as HexString | undefined);
  if (!currency.nativeCurrency && !vaultAddress) {
    throw new MissingContractAddressError(`network "${network.slug}" has no vaultContractAddress`);
  }

  const recipient = getActiveKeyPairs(config, parameters.accountId);
  if (!recipient.S || !recipient.V || !recipient.babyJubjubPublicKey) {
    throw new AggregatorSubmitError("selfShield: the receiving Curvy account is missing public keys");
  }
  const note = await config.core.sendNote(recipient.S, recipient.V, {
    ownerBabyJubjubPublicKey: recipient.babyJubjubPublicKey,
    amount,
    token,
  });
  if (note.viewTag < 0n || note.viewTag > 65_535n) {
    throw new AggregatorSubmitError("selfShield: generated note viewTag does not fit uint16");
  }

  const rpc = config.getRpc().Network(network.id) as EvmRpc;
  let approval: ChainSubmitResult | undefined;

  try {
    if (!currency.nativeCurrency) {
      const tokenAddress = currency.contractAddress as Address;
      const allowance = await rpc.provider.readContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "allowance",
        args: [walletClient.account.address, vaultAddress as Address],
      });

      if (allowance < amount) {
        const submitApproval = async (approvalAmount: bigint, operation: string): Promise<ChainSubmitResult> => {
          const { request } = await rpc.provider.simulateContract({
            account: walletClient.account,
            address: tokenAddress,
            abi: erc20ApproveAbi,
            functionName: "approve",
            args: [vaultAddress as Address, approvalAmount],
          });
          const transactionHash = (await walletClient.writeContract(request)) as HexString;
          const receipt = await rpc.provider.waitForTransactionReceipt({ hash: transactionHash });
          assertSuccessfulReceipt(operation, transactionHash, receipt);
          return { transactionHash, receipt };
        };

        if (allowance !== 0n) await submitApproval(0n, "ERC-20 allowance reset");
        approval = await submitApproval(amount, "ERC-20 approval");
      }
    }

    const { request } = await rpc.provider.simulateContract({
      account: walletClient.account,
      address,
      abi: aggregatorAlphaV2Abi,
      functionName: "selfShield",
      args: [
        {
          ownerHash: note.ownerHash,
          token,
          amount,
          ephemeralKey: note.ephemeralKey,
          viewTag: Number(note.viewTag),
        },
      ],
      value: currency.nativeCurrency ? amount : undefined,
    });
    const transactionHash = (await walletClient.writeContract(request)) as HexString;
    const receipt = await rpc.provider.waitForTransactionReceipt({ hash: transactionHash });
    assertSuccessfulReceipt("selfShield", transactionHash, receipt);

    const pendingLog = parseEventLogs({
      abi: aggregatorAlphaV2Abi,
      eventName: "PendingNotes",
      logs: receipt.logs,
      strict: true,
    }).find((log) => log.address.toLowerCase() === address.toLowerCase());
    const pendingNote = pendingLog
      ? {
          noteId: pendingLog.args.noteIds[0],
          amount: pendingLog.args.amounts[0],
          token: pendingLog.args.tokens[0],
        }
      : undefined;

    return { transactionHash, receipt, approval, pendingNote };
  } catch (error) {
    if (error instanceof AggregatorSubmitError) throw error;
    throw new AggregatorSubmitError(`selfShield failed: ${(error as Error).message}`, error as Error);
  }
}

function assertSuccessfulReceipt(operation: string, transactionHash: HexString, receipt: TransactionReceipt): void {
  if (receipt.status !== "success") {
    throw new AggregatorSubmitError(`${operation} reverted on-chain (tx ${transactionHash})`);
  }
}
