import type { SignTypedDataParameters } from "viem";
import type { HexString } from "@/types/helper";

type EvmSignTypedDataParameters = Omit<SignTypedDataParameters, "account">;

type CurvySignatureParameters = EvmSignTypedDataParameters;

type SignatureData = {
  signingAddress: HexString;
  signatureParams: CurvySignatureParameters;
  signatureResult: HexString;
};

type EvmSignatureData = SignatureData;
type StarknetSignatureData = SignatureData & {
  msgHash: HexString;
  signingAccountId: "argentX" | "braavos" | (string & {});
};
function assertIsStarkentSignatureData(
  signature: EvmSignatureData | StarknetSignatureData,
): asserts signature is StarknetSignatureData {
  if (!("signingPublicKey" in signature) && !("signingAccountId" in signature))
    throw new Error("Signature verification failed - Public key and account ID are required for Starknet signatures.");
}

export type {
  EvmSignTypedDataParameters,
  CurvySignatureParameters,
  SignatureData,
  EvmSignatureData,
  StarknetSignatureData,
};

export { assertIsStarkentSignatureData };
