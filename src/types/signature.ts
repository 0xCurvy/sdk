import type { ArraySignatureType as StarknetSignature, TypedData } from "starknet";
import type { SignTypedDataParameters } from "viem";
import type { HexString } from "@/types/helper";

type StarknetSignTypedDataParameters = TypedData;
type EvmSignTypedDataParameters = Omit<SignTypedDataParameters, "account">;

type CurvySignatureParameters = EvmSignTypedDataParameters | StarknetSignTypedDataParameters;

type SignatureData = {
  signingAddress: HexString;
  signatureParams: CurvySignatureParameters;
  signatureResult: HexString | StarknetSignature;
};

type EvmSignatureData = SignatureData;
type StarknetSignatureData = SignatureData & {
  msgHash: HexString;
  signingWalletId: "argentX" | "braavos" | (string & {});
};
function assertIsStarkentSignatureData(
  signature: EvmSignatureData | StarknetSignatureData,
): asserts signature is StarknetSignatureData {
  if (!("signingPublicKey" in signature) && !("signingWalletId" in signature))
    throw new Error("Signature verification failed - Public key and wallet ID are required for Starknet signatures.");
}

export type {
  StarknetSignTypedDataParameters,
  EvmSignTypedDataParameters,
  CurvySignatureParameters,
  SignatureData,
  EvmSignatureData,
  StarknetSignatureData,
};

export { assertIsStarkentSignatureData };
