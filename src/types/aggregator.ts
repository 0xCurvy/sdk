import type { ExtractValues, HexString } from "@/types/helper";
import type { Signature } from "./core";
import type { InputNote, OutputNote } from "./note";

type DepositRequest = {
  networkSlug: string;
  outputNotes: OutputNote[];
  fromAddress: HexString;
  networkId: number;
};

type AggregationRequest = {
  inputNotes: InputNote[];
  outputNotes: OutputNote[];
  signature: Signature;
  networkId: number;
};

type WithdrawRequest = {
  inputNotes: InputNote[];
  signature: Signature;
  destinationAddress: HexString;
  networkId: number;
};

export type { DepositRequest, AggregationRequest, WithdrawRequest };

const AGGREGATOR_ACTIONS = {
  DEPOSIT: "deposit",
  AGGREGATION: "aggregation",
  WITHDRAWAL: "withdrawal",
} as const;
type AGGREGATOR_ACTIONS = typeof AGGREGATOR_ACTIONS;
export { AGGREGATOR_ACTIONS };
export type AggregatorAction = ExtractValues<AGGREGATOR_ACTIONS>;

export type AggregatorRequestStatus = "pending" | "success";
