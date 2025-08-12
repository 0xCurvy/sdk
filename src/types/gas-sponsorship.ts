type GasSponsorshipRequestPayload = {
  data: string;
};

type GasSponsorshipRequest = {
  id?: string;
  networkId: number;
  payloads: GasSponsorshipRequestPayload[];
  signedPayloads: string[];
};

enum GasSponsorshipStatus {
  INVALID = "INVALID",
  ACCEPTED = "ACCEPTED",
  BATCHED = "BATCHED",
  FINALIZED = "FINALIZED",
}

type GasSponsorshipOnchainData = {
  fundingTxHash: string;
  fundingTxBlockHash?: string | null;
  approveTxHash: string;
  approveTxBlockHash?: string | null;
  csucWrappedTxHash: string;
  csucWrappedTxBlockHash?: string | null;
};

export type { GasSponsorshipOnchainData, GasSponsorshipRequest, GasSponsorshipRequestPayload };
export { GasSponsorshipStatus };
