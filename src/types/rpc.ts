import type { HexString } from "@/types/helper";
import type { EstimateFee } from "starknet";

type StarknetFeeEstimate = {
  deployFee: EstimateFee | undefined;
  transactionFee: EstimateFee;
};

type CurvyFeeEstimate = {
  raw: bigint;
  fiat: number;
  tokenMeta: {
    symbol: string;
    decimals: number;
  };
  estimation: StarknetFeeEstimate | bigint;
};

type RecipientData = {
  address: HexString;
  addressId?: string;
  pubKey?: string;
};

export type { StarknetFeeEstimate, CurvyFeeEstimate, RecipientData };
