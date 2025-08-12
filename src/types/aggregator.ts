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

export type { OutputNoteData, InputNoteData, Signature, Aggregation, AggregationPayload };
