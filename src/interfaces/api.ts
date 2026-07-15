import type { PaymasterInfo, RelaySubmitRequestBody, RelaySubmitReturnType } from "@/types/aggregator";
import type {
  BridgeEstimateRequestBody,
  BridgeEstimateReturnType,
  CurrencyPrice,
  GetCurvyIdByOwnerAddressReturnType,
  GetNetworksReturnType,
  GetPortalRecordsReturnType,
  GetSyncMetaReturnType,
  GetSyncNotesReturnType,
  GetSyncNullifiersReturnType,
  GetSyncPendingReturnType,
  GetSyncShardRootsReturnType,
  InsertEntryPortalRequestBody,
  InsertExitPortalRequestBody,
  InsertPortalReturnType,
  PortalStatusResponse,
  PrivacyPassChallengeInfo,
  PrivacyPassIssuerDirectory,
  ProtocolConfig,
  RegisterCurvyIdRequestBody,
  RegisterCurvyIdReturnType,
  ResolveCurvyIdReturnType,
} from "@/types/api";

interface IApiClient {
  updateBearerToken(newBearerToken: string | undefined): void;
  get bearerToken(): string | undefined;

  network: {
    GetNetworks(): Promise<GetNetworksReturnType>;
    GetPrices(): Promise<CurrencyPrice[]>;
    GetProtocol(): Promise<ProtocolConfig>;
  };

  portal: {
    InsertEntryPortal(body: InsertEntryPortalRequestBody): Promise<InsertPortalReturnType["data"]>;
    InsertExitPortal(body: InsertExitPortalRequestBody): Promise<InsertPortalReturnType["data"]>;
    GetPortalRecords(params?: {
      cursor?: string;
      limit?: number;
      startTime?: number;
      endTime?: number;
      direction?: "older" | "newer";
    }): Promise<GetPortalRecordsReturnType>;
    // Returns null when no portal matches the address (404 from backend).
    GetPortalStatus(address: string): Promise<PortalStatusResponse | null>;
  };

  bridge: {
    Estimate(body: BridgeEstimateRequestBody): Promise<BridgeEstimateReturnType["data"]>;
  };

  user: {
    RegisterCurvyId(body: RegisterCurvyIdRequestBody): Promise<RegisterCurvyIdReturnType>;
    ResolveCurvyId(username: string): Promise<ResolveCurvyIdReturnType>;
    GetCurvyIdByOwnerAddress(ownerAddress: string): Promise<GetCurvyIdByOwnerAddressReturnType>;
  };

  auth: {
    GetBearerTotp(): Promise<string>;
    CreateBearerToken(body: { nonce: string; signature: string }): Promise<string>;
    RefreshBearerToken(): Promise<string>;
  };

  /**
   * Privacy Pass (blind-RSA) access tokens: identity-bound issuance at metadata
   * (bearer JWT + per-handle quota), anonymous single-use redemption at the
   * relayer/indexer. See the `privacy-pass` module for the client lifecycle.
   */
  privacyPass: {
    GetChallenge(service: "relayer"): Promise<PrivacyPassChallengeInfo>;
    GetIssuerDirectory(): Promise<PrivacyPassIssuerDirectory>;
    RequestTokens(batchedRequest: Uint8Array): Promise<Uint8Array>;
  };

  /**
   * Finalized, checkpoint-pinned indexer streams. The indexer is availability
   * infrastructure; the checkpoint is verified against direct chain RPC.
   */
  sync: {
    GetMeta(chainId: number): Promise<GetSyncMetaReturnType>;
    GetNotes(chainId: number, fromIndex: number, limit?: number, at?: string): Promise<GetSyncNotesReturnType>;
    GetNullifiers(
      chainId: number,
      fromIndex: number,
      limit?: number,
      at?: string,
    ): Promise<GetSyncNullifiersReturnType>;
    GetPending(chainId: number, fromIndex: number, limit?: number, at?: string): Promise<GetSyncPendingReturnType>;
    GetShardRoots(
      chainId: number,
      fromIndex: number,
      limit?: number,
      at?: string,
    ): Promise<GetSyncShardRootsReturnType>;
  };

  /**
   * v3 client-proving RELAY: submit a FINISHED proof to be relayed on-chain. The
   * SDK owns this request/response contract (see {@link RelaySubmitRequestBody});
   * it is anonymous + backend-agnostic, so a backend rewrite can't break it.
   */
  relay: {
    SubmitProof(body: RelaySubmitRequestBody, privateTokenHeader?: string): Promise<RelaySubmitReturnType>;
    GetSubmissionStatus(requestId: string): Promise<RelaySubmitReturnType>;
    GetPaymasterInfo(chainId?: number | string): Promise<PaymasterInfo>;
  };
}

export type { IApiClient };
