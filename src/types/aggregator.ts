import type { Signature } from "./core";
import type { AggregationInputNote, AggregationOutputNote, DepositNote, Note, WithdrawalNote } from "./note";

type DepositRequestParams = {
  recipient: {
    S: string;
    V: string;
  };
  notes: DepositNote[];
  csucTransferAllowanceSignature: string;
};

type DepositRequest = {
  outputNotes: DepositNote[];
  fromAddress: string;
};

type AggregationRequestParams = {
  inputNotes: AggregationInputNote[];
  outputNotes: AggregationOutputNote[];
};

type AggregationRequest = {
  inputNotes: AggregationInputNote[];
  outputNotes: AggregationOutputNote[];
  signatures: Signature[];
};

type WithdrawRequestParams = {
  inputNotes: Note[];
  destinationAddress: string;
};

type WithdrawRequest = {
  inputNotes: WithdrawalNote[];
  signatures: Signature[];
  destinationAddress: string;
};

export type {
  DepositRequestParams,
  DepositRequest,
  AggregationRequestParams,
  AggregationRequest,
  WithdrawRequestParams,
  WithdrawRequest,
};
