type OutputNoteData = {
  ownerHash: bigint;
  amount: bigint;
  token: bigint;
};

type InputNoteData = {
  owner: {
    ownerBabyJub: bigint[];
    sharedSecret: bigint;
  };
  token: bigint;
  amount: bigint;
};

type Signature = {
  S: bigint;
  R8: bigint[];
};

type Aggregation = {
  inputNotes: InputNoteData[];
  outputNotes: OutputNoteData[];
  signatures: Signature[];
  ephemeralKeys: bigint[];
};

type AggregationPayload = {
  aggregations: Aggregation[];
};

export const AggregatorRequestStatus = {
  PENDING: "pending",
  SUCCESS: "success",
  FAILED: "failed",
  CANCELLED: "cancelled",
  SUBMITTED: "submitted",
}

// TODO: add withdrawal type
export type Withdrawal = {}

export type DepositRequestParams = {
  outputNotes: string[];
  csucAddress: string;
  csucTransferAllowanceSignature: string;
}

export type AggregationRequestParams = {
  aggregations: Aggregation[];
}

export type WithdrawRequestParams = {
  withdrawal: Withdrawal[];
}

export type { OutputNoteData, InputNoteData, Signature, Aggregation, AggregationPayload };
