import { APIError } from "@/errors";
import { HttpClient } from "@/http/index";
import type { IApiClient } from "@/interfaces/api";
import type { InsertEntryPortalRequestBody, InsertExitPortalRequestBody, InsertPortalReturnType } from "@/types";
import type { PaymasterInfo, RelaySubmitRequestBody, RelaySubmitReturnType } from "@/types/aggregator";
import type {
  BridgeEstimateRequestBody,
  BridgeEstimateReturnType,
  GetCurvyIdByOwnerAddressResponse,
  GetPortalRecordsReturnType,
  GetPortalStatusReturnType,
  GetSyncMetaReturnType,
  GetSyncNotesReturnType,
  GetSyncNullifiersReturnType,
  GetSyncShardRootsReturnType,
  NetworksWithCurrenciesResponse,
  PortalStatusResponse,
  RegisterCurvyIdRequestBody,
  RegisterCurvyIdReturnType,
  ResolveCurvyIdReturnType,
} from "@/types/api";
import type { CurvyId } from "@/types/curvy";

/** Optional per-service base URLs; each defaults to `apiBaseUrl` when unset. */
export type ApiBaseUrls = {
  metadataBaseUrl?: string;
  indexerBaseUrl?: string;
  relayerBaseUrl?: string;
};

// Bulk sync downloads and proof submission can legitimately run far longer than
// a normal request, so they opt out of the 5s default (see HttpClient).
const SYNC_TIMEOUT = 60_000;
const SUBMIT_PROOF_TIMEOUT = 60_000;

class ApiClient extends HttpClient implements IApiClient {
  private readonly metadataBaseUrl?: string;
  private readonly indexerBaseUrl?: string;
  private readonly relayerBaseUrl?: string;

  constructor(apiBaseUrl?: string, customFetch?: typeof globalThis.fetch, baseUrls: ApiBaseUrls = {}) {
    super(apiBaseUrl, customFetch);
    this.metadataBaseUrl = baseUrls.metadataBaseUrl;
    this.indexerBaseUrl = baseUrls.indexerBaseUrl;
    this.relayerBaseUrl = baseUrls.relayerBaseUrl;
  }

  updateBearerToken = (bearer: string | undefined) => {
    return this._updateBearerToken(bearer);
  };

  network = {
    GetNetworks: async () => {
      const networks = await this.request<NetworksWithCurrenciesResponse>({
        method: "GET",
        path: "/metadata/currency/latest",
        retries: 2,
        baseUrl: this.metadataBaseUrl,
      });

      return networks.data;
    },
  };

  portal = {
    insertEntryPortal: async (body: InsertEntryPortalRequestBody): Promise<InsertPortalReturnType["data"]> => {
      return (
        await this.request<InsertPortalReturnType>({
          method: "POST",
          path: `/portal/entry`,
          body,
        })
      ).data;
    },
    insertExitPortal: async (body: InsertExitPortalRequestBody): Promise<InsertPortalReturnType["data"]> => {
      return (
        await this.request<InsertPortalReturnType>({
          method: "POST",
          path: `/portal/exit`,
          body: body,
        })
      ).data;
    },
    getPortalRecords: async (
      params: {
        cursor?: string;
        limit?: number;
        startTime?: number;
        endTime?: number;
        direction?: "older" | "newer";
      } = {},
    ): Promise<GetPortalRecordsReturnType> => {
      const queryParams: Record<string, string | number | boolean> = {};
      if (params.cursor !== undefined) queryParams.cursor = params.cursor;
      if (params.limit !== undefined) queryParams.limit = params.limit;
      if (params.direction !== undefined) queryParams.direction = params.direction;
      if (params.startTime !== undefined) queryParams.startTime = params.startTime;
      if (params.endTime !== undefined) queryParams.endTime = params.endTime;

      return await this.request<GetPortalRecordsReturnType>({
        method: "GET",
        path: "/portal",
        queryParams,
        retries: 2,
      });
    },
    getPortalStatus: async (address: string): Promise<PortalStatusResponse | null> => {
      try {
        const response = await this.request<GetPortalStatusReturnType>({
          method: "GET",
          path: "/portal/status",
          queryParams: { address },
          retries: 2,
        });
        return response.data;
      } catch (error) {
        if (error instanceof APIError && error.statusCode === 404) return null;
        throw error;
      }
    },
  };

  bridge = {
    // Served by the portal-broadcaster (default base URL), backed by the same plan + carve the
    // broadcaster executes — so the estimate matches the eventual on-chain result.
    estimate: async (body: BridgeEstimateRequestBody): Promise<BridgeEstimateReturnType["data"]> => {
      return (
        await this.request<BridgeEstimateReturnType>({
          method: "POST",
          path: "/bridge/estimate",
          body,
        })
      ).data;
    },
  };

  user = {
    RegisterCurvyId: async (body: RegisterCurvyIdRequestBody) => {
      return await this.request<RegisterCurvyIdReturnType>({
        method: "POST",
        path: "/metadata/user/register",
        body,
        baseUrl: this.metadataBaseUrl,
      });
    },

    ResolveCurvyId: async (username: string) => {
      return this.request<ResolveCurvyIdReturnType>({
        method: "GET",
        path: `/metadata/user/resolve/${username}`,
        retries: 2,
        baseUrl: this.metadataBaseUrl,
      });
    },

    GetCurvyIdByOwnerAddress: async (ownerAddress: string) => {
      const response = await this.request<GetCurvyIdByOwnerAddressResponse>({
        method: "GET",
        path: `/metadata/user/check/${ownerAddress}`,
        retries: 2,
        baseUrl: this.metadataBaseUrl,
      });

      return (response.data?.handle as CurvyId) || null;
    },
  };

  auth = {
    GetBearerTotp: async () => {
      return (
        await this.request<{
          nonce: string;
        }>({
          method: "GET",
          path: "/metadata/auth/nonce",
          retries: 2,
          baseUrl: this.metadataBaseUrl,
        })
      ).nonce;
    },
    CreateBearerToken: async (body: { nonce: string; signature: string }) => {
      return (
        await this.request<{
          success: boolean;
          token: string;
        }>({
          method: "POST",
          body,
          path: "/metadata/auth",
          baseUrl: this.metadataBaseUrl,
        })
      ).token;
    },
    RefreshBearerToken: async () => {
      return (
        await this.request<{
          success: boolean;
          token: string;
        }>({
          method: "GET",
          path: "/metadata/auth/renew",
          retries: 2,
          baseUrl: this.metadataBaseUrl,
        })
      ).token;
    },
  };

  sync = {
    GetMeta: async () => {
      return await this.request<GetSyncMetaReturnType>({
        method: "GET",
        path: "/indexer/v3/sync/meta",
        retries: 2,
        timeout: SYNC_TIMEOUT,
        baseUrl: this.indexerBaseUrl,
      });
    },

    GetNotes: async (fromIndex: number, limit = 500) => {
      return await this.request<GetSyncNotesReturnType>({
        method: "GET",
        path: "/indexer/v3/sync/notes",
        queryParams: { fromIndex, limit },
        retries: 2,
        timeout: SYNC_TIMEOUT,
        baseUrl: this.indexerBaseUrl,
      });
    },

    GetNullifiers: async (fromIndex: number, limit = 500) => {
      return await this.request<GetSyncNullifiersReturnType>({
        method: "GET",
        path: "/indexer/v3/sync/nullifiers",
        queryParams: { fromIndex, limit },
        retries: 2,
        timeout: SYNC_TIMEOUT,
        baseUrl: this.indexerBaseUrl,
      });
    },

    GetShardRoots: async (fromIndex: number, limit = 500) => {
      return await this.request<GetSyncShardRootsReturnType>({
        method: "GET",
        path: "/indexer/v3/sync/shard-roots",
        queryParams: { fromIndex, limit },
        retries: 2,
        timeout: SYNC_TIMEOUT,
        baseUrl: this.indexerBaseUrl,
      });
    },
  };

  // v3 client-proving relay (anonymous, SDK-owned contract). `retries: 0` on POST
  // so a network hiccup never double-submits — the `idempotencyKey` is the dedupe
  // guard if the relayer DID receive it.
  relay = {
    SubmitProof: async (body: RelaySubmitRequestBody) => {
      return await this.request<RelaySubmitReturnType>({
        method: "POST",
        path: "/relay/submit",
        body,
        retries: 0,
        timeout: SUBMIT_PROOF_TIMEOUT,
        baseUrl: this.relayerBaseUrl,
      });
    },

    GetSubmissionStatus: async (requestId: string) => {
      return await this.request<RelaySubmitReturnType>({
        method: "GET",
        path: `/relay/submission/${requestId}/status`,
        retries: 2,
        baseUrl: this.relayerBaseUrl,
      });
    },

    // Paymaster discovery — the operator's keys + current gas view, used to size
    // the gas-reimbursement note (see PaymasterInfo). Read-only; safe to retry.
    GetPaymasterInfo: async () => {
      return await this.request<PaymasterInfo>({
        method: "GET",
        path: "/relay/paymaster",
        retries: 2,
        baseUrl: this.relayerBaseUrl,
      });
    },
  };
}

export { ApiClient };
