import type { ExtractValues } from "@/types/helper";
import type { Signature } from "./core";
import type { InputNote, OutputNote } from "./note";

type DepositRequest = {
  outputNotes: OutputNote[];
  fromAddress: string;
};

type AggregationRequest = {
  inputNotes: InputNote[];
  outputNotes: OutputNote[];
  signatures: Signature[];
};

type WithdrawRequest = {
  inputNotes: InputNote[];
  signatures: Signature[];
  destinationAddress: string;
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
