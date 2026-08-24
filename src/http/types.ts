import type {
  BridgeEstimateRequestBody,
  BridgeEstimateReturnType,
  CurrencyPrice,
  GetCurvyIdByOwnerAddressReturnType,
  GetNetworksReturnType,
  GetPortalRecordsReturnType,
  GetSyncHotBlocksReturnType,
  GetSyncHotMetaReturnType,
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
} from "@/http/contracts";
import type { PaymasterInfo, RelaySubmitRequestBody, RelaySubmitReturnType } from "@/types/aggregator";

/** Transport contract consumed by SDK actions. */
export interface CurvyApiClient {
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
  privacyPass: {
    GetChallenge(service: "relayer"): Promise<PrivacyPassChallengeInfo>;
    GetIssuerDirectory(): Promise<PrivacyPassIssuerDirectory>;
    RequestTokens(batchedRequest: Uint8Array): Promise<Uint8Array>;
  };
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
    GetHotMeta(chainId: number, baseCheckpoint: string): Promise<GetSyncHotMetaReturnType>;
    GetHotBlocks(
      chainId: number,
      snapshot: string,
      fromBlock?: number,
      limit?: number,
    ): Promise<GetSyncHotBlocksReturnType>;
  };
  relay: {
    SubmitProof(body: RelaySubmitRequestBody, privateTokenHeader?: string): Promise<RelaySubmitReturnType>;
    GetSubmissionStatus(requestId: string): Promise<RelaySubmitReturnType>;
    GetSubmissionByIntent(intentId: string, networkId: number): Promise<RelaySubmitReturnType>;
    GetPaymasterInfo(chainId?: number | string): Promise<PaymasterInfo>;
  };
}
