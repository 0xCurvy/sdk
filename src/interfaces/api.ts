import type {
  AggregationRequest,
  PaymasterInfo,
  RelaySubmitRequestBody,
  RelaySubmitReturnType,
  WithdrawRequest,
} from "@/types/aggregator";
import type {
  GetAggregatorRequestStatusReturnType,
  GetCurvyIdByOwnerAddressReturnType,
  GetNetworksReturnType,
  GetPortalRecordsReturnType,
  GetSyncMetaReturnType,
  GetSyncNotesReturnType,
  GetSyncNullifiersReturnType,
  GetSyncShardRootsReturnType,
  InsertEntryPortalRequestBody,
  InsertExitPortalRequestBody,
  InsertPortalReturnType,
  PortalStatusResponse,
  RegisterCurvyIdRequestBody,
  RegisterCurvyIdReturnType,
  ResolveCurvyIdReturnType,
  SubmitAggregationReturnType,
  SubmitWithdrawReturnType,
} from "@/types/api";

interface IApiClient {
  updateBearerToken(newBearerToken: string | undefined): void;
  get bearerToken(): string | undefined;

  network: {
    GetNetworks(): Promise<GetNetworksReturnType>;
  };

  portal: {
    insertEntryPortal(body: InsertEntryPortalRequestBody): Promise<InsertPortalReturnType["data"]>;
    insertExitPortal(body: InsertExitPortalRequestBody): Promise<InsertPortalReturnType["data"]>;
    getPortalRecords(params?: {
      offset?: number;
      size?: number;
      startTime?: number;
      endTime?: number;
    }): Promise<GetPortalRecordsReturnType>;
    // Returns null when no portal matches the address (404 from backend).
    getPortalStatus(address: string): Promise<PortalStatusResponse | null>;
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
   * The v3 indexer sync streams (append-only, cursor = local count). The
   * indexer is availability-only — everything fetched here is verified
   * client-side against a direct chain root read.
   */
  sync: {
    GetMeta(): Promise<GetSyncMetaReturnType>;
    GetNotes(fromIndex: number, limit?: number): Promise<GetSyncNotesReturnType>;
    GetNullifiers(fromIndex: number, limit?: number): Promise<GetSyncNullifiersReturnType>;
    GetShardRoots(fromIndex: number, limit?: number): Promise<GetSyncShardRootsReturnType>;
  };

  aggregator: {
    SubmitWithdraw(data: WithdrawRequest): Promise<SubmitWithdrawReturnType>;
    SubmitAggregation(data: AggregationRequest): Promise<SubmitAggregationReturnType>;
    GetAggregatorRequestStatus(requestId: string): Promise<GetAggregatorRequestStatusReturnType>;
  };

  /**
   * v3 client-proving RELAY: submit a FINISHED proof to be relayed on-chain. The
   * SDK owns this request/response contract (see {@link RelaySubmitRequestBody});
   * it is anonymous + backend-agnostic, so a backend rewrite can't break it.
   */
  relay: {
    SubmitProof(body: RelaySubmitRequestBody): Promise<RelaySubmitReturnType>;
    GetSubmissionStatus(requestId: string): Promise<RelaySubmitReturnType>;
    GetPaymasterInfo(): Promise<PaymasterInfo>;
  };
}

export type { IApiClient };
