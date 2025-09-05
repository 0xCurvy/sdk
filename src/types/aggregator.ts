import { Signature } from "./core";
import { Note } from "./note";

type DepositRequestParams = {
  recipient: {
    S: string;
    V: string;
  };
  notes: Note[];
  csucTransferAllowanceSignature: string;
}

type DepositRequest = {
  outputNotes: Note[];
  csucAddress: string;
  csucTransferAllowanceSignature: string;
}

type AggregationRequestParams = {
  inputNotes: Note[];
  outputNotes: Note[];
}

type AggregationRequest = {
  inputNotes: Note[];
  outputNotes: Note[];
  signatures: Signature[];
};

type WithdrawRequestParams = {
  inputNotes: Note[];
  destinationAddress: string;
}

type WithdrawRequest = {
  inputNotes: Note[];
  signatures: Signature[];
  destinationAddress: string;
}

export type { DepositRequestParams, DepositRequest, AggregationRequestParams, AggregationRequest, WithdrawRequestParams, WithdrawRequest };
