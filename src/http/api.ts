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
  PricesResponse,
  PrivacyPassChallengeInfo,
  PrivacyPassIssuerDirectory,
  ProtocolResponse,
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
  /**
   * Per-chain indexer base URLs (keyed by decimal chainId), for when each chain
   * runs its own single-chain indexer (e.g. eth / base / arbitrum). A chain not
   * in the map falls back to `indexerBaseUrl`. The `chainId` is also sent as a
   * query param so the indexer can reject a request meant for another chain.
   */
  indexerBaseUrlsByChainId?: Record<string, string>;
};

// Bulk sync downloads and proof submission can legitimately run far longer than
// a normal request, so they opt out of the 5s default (see HttpClient).
const SYNC_TIMEOUT = 60_000;
const SUBMIT_PROOF_TIMEOUT = 60_000;

class ApiClient extends HttpClient implements IApiClient {
  private readonly metadataBaseUrl?: string;
  private readonly indexerBaseUrl?: string;
  private readonly relayerBaseUrl?: string;
  private readonly indexerBaseUrlsByChainId: Record<string, string>;

  constructor(apiBaseUrl?: string, customFetch?: typeof globalThis.fetch, baseUrls: ApiBaseUrls = {}) {
    super(apiBaseUrl, customFetch);
    this.metadataBaseUrl = baseUrls.metadataBaseUrl;
    this.indexerBaseUrl = baseUrls.indexerBaseUrl;
    this.relayerBaseUrl = baseUrls.relayerBaseUrl;
    this.indexerBaseUrlsByChainId = baseUrls.indexerBaseUrlsByChainId ?? {};
  }

  /** The indexer serving `chainId` — its own deployment if configured, else the shared one. */
  private indexerUrlFor(chainId: number): string | undefined {
    return this.indexerBaseUrlsByChainId[String(chainId)] ?? this.indexerBaseUrl;
  }

  updateBearerToken = (bearer: string | undefined) => {
    return this._updateBearerToken(bearer);
  };

  network = {
    // Registry: identity, RPC routing, contract addresses, bridge maps, currencies.
    // (Protocol-global proving/fee config now comes from GetProtocol, not per-network.)
    GetNetworks: async () => {
      const networks = await this.request<NetworksWithCurrenciesResponse>({
        method: "GET",
        path: "/networks",
        retries: 2,
        baseUrl: this.metadataBaseUrl,
      });

      return networks.data;
    },

    // Volatile currency price feed — cheap, the only thing the refresh timer polls.
    GetPrices: async () => {
      const prices = await this.request<PricesResponse>({
        method: "GET",
        path: "/prices",
        retries: 2,
        baseUrl: this.metadataBaseUrl,
      });

      return prices.data;
    },

    // Protocol-global proving config + fee collector (fetched once at bootstrap).
    GetProtocol: async () => {
      const protocol = await this.request<ProtocolResponse>({
        method: "GET",
        path: "/protocol",
        retries: 2,
        baseUrl: this.metadataBaseUrl,
      });

      return protocol.data;
    },
  };

  portal = {
    InsertEntryPortal: async (body: InsertEntryPortalRequestBody): Promise<InsertPortalReturnType["data"]> => {
      return (
        await this.request<InsertPortalReturnType>({
          method: "POST",
          path: `/portal/entry`,
          body,
        })
      ).data;
    },
    InsertExitPortal: async (body: InsertExitPortalRequestBody): Promise<InsertPortalReturnType["data"]> => {
      return (
        await this.request<InsertPortalReturnType>({
          method: "POST",
          path: `/portal/exit`,
          body: body,
        })
      ).data;
    },
    GetPortalRecords: async (
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
    GetPortalStatus: async (address: string): Promise<PortalStatusResponse | null> => {
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
    Estimate: async (body: BridgeEstimateRequestBody): Promise<BridgeEstimateReturnType["data"]> => {
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
        path: "/user/register",
        body,
        baseUrl: this.metadataBaseUrl,
      });
    },

    ResolveCurvyId: async (username: string) => {
      return this.request<ResolveCurvyIdReturnType>({
        method: "GET",
        path: `/user/resolve/${username}`,
        retries: 2,
        baseUrl: this.metadataBaseUrl,
      });
    },

    GetCurvyIdByOwnerAddress: async (ownerAddress: string) => {
      const response = await this.request<GetCurvyIdByOwnerAddressResponse>({
        method: "GET",
        path: `/user/check/${ownerAddress}`,
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
          path: "/auth/nonce",
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
          path: "/auth",
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
          path: "/auth/renew",
          retries: 2,
          baseUrl: this.metadataBaseUrl,
          auth: "bearer",
        })
      ).token;
    },
  };

  // Privacy Pass (blind-RSA access tokens). Issuance is identity-bound (bearer
  // JWT + per-handle quota, metadata); redemption is anonymous. The JWT is
  // deliberately confined to metadata — see `RequestOptions.auth`.
  privacyPass = {
    /** The redeemer's expected challenge + current key (service-prefixed bootstrap route). */
    GetChallenge: async (_service: "relayer"): Promise<PrivacyPassChallengeInfo> => {
      return await this.request<PrivacyPassChallengeInfo>({
        method: "GET",
        path: "/relay/token-challenge",
        retries: 2,
        baseUrl: this.relayerBaseUrl,
      });
    },

    /** The issuer's public-key directory (metadata). */
    GetIssuerDirectory: async (): Promise<PrivacyPassIssuerDirectory> => {
      return await this.request<PrivacyPassIssuerDirectory>({
        method: "GET",
        path: "/.well-known/private-token-issuer-directory",
        retries: 2,
        baseUrl: this.metadataBaseUrl,
      });
    },

    /** Blind-sign a generic-batch token request. Identity-bound: requires the login JWT. */
    RequestTokens: async (batchedRequest: Uint8Array): Promise<Uint8Array> => {
      return await this.requestBinary({
        path: "/token-request",
        baseUrl: this.metadataBaseUrl,
        body: batchedRequest,
        contentType: "application/private-token-generic-batch-request",
        auth: "bearer",
      });
    },
  };

  // Every sync request is scoped to one `chainId`: it selects that chain's
  // indexer deployment AND is sent as a query param the indexer validates, so a
  // request for chain A can never be answered with chain B's leaves (which would
  // corrupt that network's committed log and misattribute balances).
  sync = {
    GetMeta: async (chainId: number) => {
      return await this.request<GetSyncMetaReturnType>({
        method: "GET",
        path: "/v3/sync/meta",
        queryParams: { chainId },
        retries: 2,
        timeout: SYNC_TIMEOUT,
        baseUrl: this.indexerUrlFor(chainId),
      });
    },

    GetNotes: async (chainId: number, fromIndex: number, limit = 500) => {
      return await this.request<GetSyncNotesReturnType>({
        method: "GET",
        path: "/v3/sync/notes",
        queryParams: { chainId, fromIndex, limit },
        retries: 2,
        timeout: SYNC_TIMEOUT,
        baseUrl: this.indexerUrlFor(chainId),
      });
    },

    GetNullifiers: async (chainId: number, fromIndex: number, limit = 500) => {
      return await this.request<GetSyncNullifiersReturnType>({
        method: "GET",
        path: "/v3/sync/nullifiers",
        queryParams: { chainId, fromIndex, limit },
        retries: 2,
        timeout: SYNC_TIMEOUT,
        baseUrl: this.indexerUrlFor(chainId),
      });
    },

    GetShardRoots: async (chainId: number, fromIndex: number, limit = 500) => {
      return await this.request<GetSyncShardRootsReturnType>({
        method: "GET",
        path: "/v3/sync/shard-roots",
        queryParams: { chainId, fromIndex, limit },
        retries: 2,
        timeout: SYNC_TIMEOUT,
        baseUrl: this.indexerUrlFor(chainId),
      });
    },
  };

  // v3 client-proving relay (anonymous, SDK-owned contract). `retries: 0` on POST
  // so a network hiccup never double-submits — the `idempotencyKey` is the dedupe
  // guard if the relayer DID receive it.
  relay = {
    // `privateTokenHeader` is a single-use, unlinkable Privacy Pass token
    // ("PrivateToken token=…") — the relayer's anonymous rate-limit credential.
    SubmitProof: async (body: RelaySubmitRequestBody, privateTokenHeader?: string) => {
      return await this.request<RelaySubmitReturnType>({
        method: "POST",
        path: "/relay/submit",
        body,
        retries: 0,
        timeout: SUBMIT_PROOF_TIMEOUT,
        baseUrl: this.relayerBaseUrl,
        headers: privateTokenHeader ? { Authorization: privateTokenHeader } : undefined,
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

    // Paymaster discovery — the operator's keys + current gas view for a chain,
    // used to size the gas-reimbursement note (see PaymasterInfo). The gas view is
    // per-chain, so pass the chainId on multi-aggregator relayers; a single-chain
    // relayer answers the no-param form. Read-only; safe to retry.
    GetPaymasterInfo: async (chainId?: number | string) => {
      return await this.request<PaymasterInfo>({
        method: "GET",
        path: chainId != null ? `/relay/paymaster?chainId=${chainId}` : "/relay/paymaster",
        retries: 2,
        baseUrl: this.relayerBaseUrl,
      });
    },
  };
}

export { ApiClient };
