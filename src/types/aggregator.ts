import { Note, OutputNote, Signature } from "./core";

export const AggregatorRequestStatus = {
  PENDING: "pending",
  SUCCESS: "success",
  FAILED: "failed",
  CANCELLED: "cancelled",
  SUBMITTED: "submitted",
}

type DepositPayloadParams = {
  recipient: {
    S: string;
    V: string;
  };
  notes: {
    babyJubPublicKey: string;
    amount: string;
    token: string;
  }[];
  csucTransferAllowanceSignature: string;
}

type DepositPayload = {
  outputNotes: OutputNote[];
  csucAddress: string;
  csucTransferAllowanceSignature: string;
}

type AggregationPayloadParams = {
  inputNotes: Note[];
  outputNotes: OutputNote[];
}

type AggregationPayload = {
  inputNotes: Note[];
  outputNotes: OutputNote[];
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
