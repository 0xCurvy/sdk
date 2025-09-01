import { Signature } from "./core";
import { Note } from "./note";

type DepositPayloadParams = {
  recipient: {
    S: string;
    V: string;
  };
  notes: Note[];
  csucTransferAllowanceSignature: string;
}

type DepositPayload = {
  outputNotes: Note[];
  csucAddress: string;
  csucTransferAllowanceSignature: string;
}

type AggregationPayloadParams = {
  inputNotes: Note[];
  outputNotes: Note[];
}

type AggregationPayload = {
  inputNotes: Note[];
  outputNotes: Note[];
  signatures: Signature[];
};

type WithdrawPayloadParams = {
  inputNotes: Note[];
  destinationAddress: string;
}

type WithdrawPayload = {
  inputNotes: Note[];
  signatures: Signature[];
  destinationAddress: string;
}

export type { DepositPayloadParams, DepositPayload, AggregationPayloadParams, AggregationPayload, WithdrawPayloadParams, WithdrawPayload };
