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

export type { EvmSignTypedDataParameters, CurvySignatureParameters, SignatureData, EvmSignatureData };
