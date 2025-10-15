import type { Groth16Proof } from "snarkjs";
import { HttpClient } from "@/http/index";
import type { IApiClient } from "@/interfaces/api";
import type {
  GetMetaTransactionStatusReturnType,
  MetaTransaction,
  MetaTransactionEstimationRequestBody,
  MetaTransactionSubmitBody,
  SubmitNoteOwnershipProofReturnType,
} from "@/types";
import type { AggregationRequest, DepositRequest, WithdrawRequest } from "@/types/aggregator";
import type {
  CreateAnnouncementRequestBody,
  CreateAnnouncementReturnType,
  GetAggregatorRequestStatusReturnType,
  GetAllNotesReturnType,
  GetAnnouncementEncryptedMessageReturnType,
  GetAnnouncementsResponse,
  GetCurvyHandleByOwnerAddressResponse,
  NetworksWithCurrenciesResponse,
  RegisterCurvyHandleRequestBody,
  RegisterCurvyHandleReturnType,
  ResolveCurvyHandleReturnType,
  SetBabyJubjubPublicKeyRequestBody,
  SetBabyJubjubPublicKeyReturnType,
  SubmitAggregationReturnType,
  SubmitDepositReturnType,
  SubmitWithdrawReturnType,
  UpdateAnnouncementEncryptedMessageRequestBody,
  UpdateAnnouncementEncryptedMessageReturnType,
} from "@/types/api";
import type { CurvyHandle } from "@/types/curvy";

class ApiClient extends HttpClient implements IApiClient {
  updateBearerToken = (bearer: string | undefined) => {
    return this._updateBearerToken(bearer);
  };

  announcement = {
    CreateAnnouncement: async (body: CreateAnnouncementRequestBody) => {
      return await this.request<CreateAnnouncementReturnType>({
        method: "POST",
        path: "/announcement",
        body,
      });
    },
    GetAnnouncements: async (startTime?: number, endTime?: number, size?: number, offset?: number) => {
      const queryParams: Record<string, string | number | boolean> = {};

      if (size) queryParams.size = size;
      if (offset) queryParams.offset = offset;
      if (startTime) queryParams.startTime = startTime;
      if (endTime) queryParams.endTime = endTime;

      const result = await this.request<GetAnnouncementsResponse>({
        method: "GET",
        path: "/announcement",
        queryParams,
      });

      return result.data;
    },
    UpdateAnnouncementEncryptedMessage: async (id: string, body: UpdateAnnouncementEncryptedMessageRequestBody) => {
      return await this.request<UpdateAnnouncementEncryptedMessageReturnType>({
        method: "PATCH",
        path: `/announcement/${id}/encryptedMessage`,
        body,
      });
    },
    GetAnnouncementEncryptedMessage: async (id: string) => {
      return await this.request<GetAnnouncementEncryptedMessageReturnType>({
        method: "GET",
        path: `/announcement/${id}/encryptedMessage`,
      });
    },
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

  user = {
    RegisterCurvyHandle: async (body: RegisterCurvyHandleRequestBody) => {
      return await this.request<RegisterCurvyHandleReturnType>({
        method: "POST",
        path: "/user/register",
        body,
      });
    },

    ResolveCurvyHandle: async (username: string) => {
      return this.request<ResolveCurvyHandleReturnType>({
        method: "GET",
        path: `/user/resolve/${username}`,
      });
    },

    GetCurvyHandleByOwnerAddress: async (ownerAddress: string) => {
      const response = await this.request<GetCurvyHandleByOwnerAddressResponse>({
        method: "GET",
        path: `/user/check/${ownerAddress}`,
      });

      return response.data?.handle || null;
    },

    SetBabyJubjubKey: async (handle: CurvyHandle, body: SetBabyJubjubPublicKeyRequestBody) => {
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
    GetAllNotes: async () => {
      return await this.request<GetAllNotesReturnType>({
        method: "GET",
        path: "/aggregator/get-all-notes",
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

    SubmitNotesOwnershipProof: async (data: { proof: Groth16Proof; ownerHashes: string[] }) => {
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

  metaTransaction = {
    SubmitTransaction: async (body: MetaTransactionSubmitBody) => {
      await this.request<null>({
        method: "POST",
        path: `/meta-transaction/submit`,
        body,
      });
    },

    GetStatus: async (requestId: string) => {
      return (
        await this.request<{ data: { metaTransactionStatus: GetMetaTransactionStatusReturnType } }>({
          method: "GET",
          path: `/meta-transaction/status/${requestId}`,
        })
      ).data.metaTransactionStatus;
    },

    EstimateGas: async (body: MetaTransactionEstimationRequestBody) => {
      return (
        await this.request<{ data: { metaTransaction: MetaTransaction } }>({
          method: "POST",
          path: `/meta-transaction/estimate`,
          body,
        })
      ).data.metaTransaction as MetaTransaction & { id: string };
    },
  };
}

export { ApiClient };
