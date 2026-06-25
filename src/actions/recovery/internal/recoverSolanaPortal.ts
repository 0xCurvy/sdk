import { type Instruction, type Address as SolanaAddress, address as toSolanaAddress } from "@solana/kit";
import type { CurvyConfig } from "@/config/types";
import { SolanaRpc, type SolanaSigner } from "@/rpc/solana";
import {
  buildRecoverSolInstruction,
  buildRecoverSplInstruction,
  deriveAssociatedTokenAddress,
  derivePortalMetaPda,
  deriveRecoveryIdentifier,
  deriveVaultPda,
  NATIVE_SOL_MINT,
  ownerHashToBytes,
  signSolRecovery,
  signSplRecovery,
} from "@/solana";
import type { MatchedPortalRecord, Network } from "@/types/api";
import type { HexString } from "@/types/helper";

/**
 * Submit a `recover_sol` or `recover_spl` transaction.
 *
 * Unlike EVM recovery, the
 * fee payer is the user's connected Solana account (there is no per-portal
 * recovery address that needs its own gas). The secp256k1 signature embedded
 * in the instruction data is what authorizes the funds to move to
 * `destinationAddress`. Internal helper: takes `config` as a plain first arg.
 */
export async function recoverSolanaPortal(
  config: CurvyConfig,
  args: {
    network: Network;
    portalRecord: Extract<MatchedPortalRecord, { flavour: "solana" }>;
    recoveryPrivateKey: HexString;
    mintAddress: string;
    destinationAddress: string;
    signer: SolanaSigner;
  },
): Promise<string> {
  const { network, portalRecord, recoveryPrivateKey, mintAddress, destinationAddress, signer } = args;

  if (!network.portalProgramAddress) {
    throw new Error(`Network ${network.name} does not have a Solana portal program address configured.`);
  }
  if (portalRecord.type !== "entry") {
    throw new Error("Solana recovery supports entry portals only.");
  }

  const rpc = config.getRpc().Network(network.id);
  if (!(rpc instanceof SolanaRpc)) {
    throw new Error(`Network ${network.name} is not a Solana RPC — got ${rpc.constructor.name}.`);
  }

  const programAddress: SolanaAddress = toSolanaAddress(network.portalProgramAddress);
  const recipient: SolanaAddress = toSolanaAddress(destinationAddress);
  const payer: SolanaAddress = toSolanaAddress(signer.address);
  const { recoveryIdentifier } = await deriveRecoveryIdentifier(recoveryPrivateKey);
  const ownerHashBytes = ownerHashToBytes(portalRecord.ownerHash);
  const [vaultPda] = await deriveVaultPda(programAddress, ownerHashBytes, recoveryIdentifier);
  const [portalMetaPda] = await derivePortalMetaPda(programAddress, ownerHashBytes, recoveryIdentifier);

  const isNativeSol = mintAddress === NATIVE_SOL_MINT;

  let instruction: Instruction | undefined;
  if (isNativeSol) {
    const { signature, recoveryId } = await signSolRecovery({
      secpPrivKey: recoveryPrivateKey.slice(2),
      programAddress,
      ownerHash: ownerHashBytes,
      recoveryIdentifier,
      recipient,
    });
    instruction = buildRecoverSolInstruction({
      programAddress,
      payer,
      vault: vaultPda,
      recipient,
      portalMeta: portalMetaPda,
      ownerHash: ownerHashBytes,
      recoveryIdentifier,
      recoveryId,
      signature,
    });
  } else {
    const mint: SolanaAddress = toSolanaAddress(mintAddress);
    const { signature, recoveryId } = await signSplRecovery({
      secpPrivKey: recoveryPrivateKey.slice(2),
      programAddress,
      ownerHash: ownerHashBytes,
      recoveryIdentifier,
      recipient,
      mint,
    });
    const vaultTokenAccount = await deriveAssociatedTokenAddress(mint, vaultPda);
    const recipientTokenAccount = await deriveAssociatedTokenAddress(mint, recipient);
    instruction = buildRecoverSplInstruction({
      programAddress,
      payer,
      vault: vaultPda,
      vaultTokenAccount,
      recipientTokenAccount,
      recipient,
      mint,
      portalMeta: portalMetaPda,
      ownerHash: ownerHashBytes,
      recoveryIdentifier,
      recoveryId,
      signature,
    });
  }

  return rpc.sendTransactionWithSigner(instruction, signer);
}
