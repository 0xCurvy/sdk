import type { Groth16Proof } from "snarkjs";
import { HttpClient } from "@/http/index";
import type { IApiClient } from "@/interfaces/api";
import type {
  InsertEntryPortalRequestBody,
  InsertExitPortalRequestBody,
  InsertPortalReturnType,
  SubmitNoteOwnershipProofReturnType,
} from "@/types";
import type { AggregationRequest, DepositRequest, WithdrawRequest } from "@/types/aggregator";
import type {
  GetAggregatorRequestStatusReturnType,
  GetAllNotesReturnType,
  GetCurvyIdByOwnerAddressResponse,
  GetPortalRecordsReturnType,
  NetworksWithCurrenciesResponse,
  RegisterCurvyIdRequestBody,
  RegisterCurvyIdReturnType,
  ResolveCurvyIdReturnType,
  SetBabyJubjubPublicKeyRequestBody,
  SetBabyJubjubPublicKeyReturnType,
  SubmitAggregationReturnType,
  SubmitDepositReturnType,
  SubmitWithdrawReturnType,
} from "@/types/api";
import type { CurvyId } from "@/types/curvy";

class ApiClient extends HttpClient implements IApiClient {
  constructor(apiBaseUrl?: string, customFetch?: typeof globalThis.fetch) {
    super(apiBaseUrl, customFetch);
  }

  updateBearerToken = (bearer: string | undefined) => {
    return this._updateBearerToken(bearer);
  };

  network = {
    GetNetworks: async () => {
      const networks = await this.request<NetworksWithCurrenciesResponse>({
        method: "GET",
        path: "/currency/latest",
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
      params: { offset?: number; size?: number; startTime?: number; endTime?: number } = {},
    ): Promise<GetPortalRecordsReturnType> => {
      const queryParams: Record<string, string | number | boolean> = {};
      if (params.offset !== undefined) queryParams.offset = params.offset;
      if (params.size !== undefined) queryParams.size = params.size;
      if (params.startTime !== undefined) queryParams.startTime = params.startTime;
      if (params.endTime !== undefined) queryParams.endTime = params.endTime;

      return await this.request<GetPortalRecordsReturnType>({
        method: "GET",
        path: "/portal",
        queryParams,
      });
    },
  };

  user = {
    RegisterCurvyId: async (body: RegisterCurvyIdRequestBody) => {
      return await this.request<RegisterCurvyIdReturnType>({
        method: "POST",
        path: "/user/register",
        body,
      });
    },

    ResolveCurvyId: async (username: string) => {
      return this.request<ResolveCurvyIdReturnType>({
        method: "GET",
        path: `/user/resolve/${username}`,
      });
    },

    GetCurvyIdByOwnerAddress: async (ownerAddress: string) => {
      const response = await this.request<GetCurvyIdByOwnerAddressResponse>({
        method: "GET",
        path: `/user/check/${ownerAddress}`,
      });

      return (response.data?.handle as CurvyId) || null;
    },

    SetBabyJubjubKey: async (handle: CurvyId, body: SetBabyJubjubPublicKeyRequestBody) => {
      return await this.request<SetBabyJubjubPublicKeyReturnType>({
        method: "PATCH",
        path: `/user/${handle}/bjj`,
        body,
      });
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
        })
      ).token;
    },
  };

  aggregator = {
    GetAllNotes: async (networkId: number) => {
      return await this.request<GetAllNotesReturnType>({
        method: "GET",
        path: `/aggregator/get-all-notes/${networkId}`,
      });
    },

    SubmitDeposit: async (data: DepositRequest) => {
      return await this.request<SubmitDepositReturnType>({
        method: "POST",
        path: "/aggregator/deposit",
        body: data,
      });
    },

    SubmitAggregation: async (data: AggregationRequest) => {
      return await this.request<SubmitAggregationReturnType>({
        method: "POST",
        path: "/aggregator/aggregation",
        body: data,
      });
    },

    SubmitWithdraw: async (data: WithdrawRequest) => {
      return await this.request<SubmitWithdrawReturnType>({
        method: "POST",
        path: "/aggregator/withdraw",
        body: data,
      });
    },

    SubmitNotesOwnershipProof: async (data: { proof: Groth16Proof; ownerHashes: string[]; networkId: number }) => {
      return await this.request<SubmitNoteOwnershipProofReturnType>({
        method: "POST",
        path: "/aggregator/verify-note-ownership-proof",
        body: data,
      });
    },

    GetAggregatorRequestStatus: async (requestId: string) => {
      return await this.request<GetAggregatorRequestStatusReturnType>({
        method: "GET",
        path: `/aggregator/request-status/${requestId}/status`,
      });
    },
  };
}

export { ApiClient };
