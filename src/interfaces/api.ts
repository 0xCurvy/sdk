import type { Groth16Proof } from "snarkjs";
import type { MetaTransaction } from "@/types";
import type { AggregationRequest, DepositRequest, WithdrawRequest } from "@/types/aggregator";
import type {
  CreateAnnouncementRequestBody,
  CreateAnnouncementReturnType,
  GetAggregatorRequestStatusReturnType,
  GetAllNotesReturnType,
  GetAnnouncementEncryptedMessageReturnType,
  GetAnnouncementsReturnType,
  GetCurvyHandleByOwnerAddressReturnType,
  GetMetaTransactionStatusReturnType,
  GetNetworksReturnType,
  MetaTransactionEstimationRequestBody,
  MetaTransactionSubmitBody,
  RegisterCurvyHandleRequestBody,
  RegisterCurvyHandleReturnType,
  ResolveCurvyHandleReturnType,
  SetBabyJubjubPublicKeyRequestBody,
  SetBabyJubjubPublicKeyReturnType,
  SubmitAggregationReturnType,
  SubmitDepositReturnType,
  SubmitNoteOwnershipProofReturnType,
  SubmitWithdrawReturnType,
  UpdateAnnouncementEncryptedMessageRequestBody,
  UpdateAnnouncementEncryptedMessageReturnType,
} from "@/types/api";
import type { CurvyHandle } from "@/types/curvy";

interface IApiClient {
  updateBearerToken(newBearerToken: string | undefined): void;
  get bearerToken(): string | undefined;

  announcement: {
    CreateAnnouncement(body: CreateAnnouncementRequestBody): Promise<CreateAnnouncementReturnType>;
    UpdateAnnouncementEncryptedMessage(
      id: string,
      body: UpdateAnnouncementEncryptedMessageRequestBody,
    ): Promise<UpdateAnnouncementEncryptedMessageReturnType>;
    GetAnnouncementEncryptedMessage(id: string): Promise<GetAnnouncementEncryptedMessageReturnType>;
    GetAnnouncements(
      startTime?: number,
      endTime?: number,
      size?: number,
      offset?: number,
    ): Promise<GetAnnouncementsReturnType>;
  };

  network: {
    GetNetworks(): Promise<GetNetworksReturnType>;
  };

  user: {
    RegisterCurvyHandle(body: RegisterCurvyHandleRequestBody): Promise<RegisterCurvyHandleReturnType>;
    ResolveCurvyHandle(username: string): Promise<ResolveCurvyHandleReturnType>;
    GetCurvyHandleByOwnerAddress(ownerAddress: string): Promise<GetCurvyHandleByOwnerAddressReturnType>;
    SetBabyJubjubKey(
      handle: CurvyHandle,
      body: SetBabyJubjubPublicKeyRequestBody,
    ): Promise<SetBabyJubjubPublicKeyReturnType>;
  };

  auth: {
    GetBearerTotp(): Promise<string>;
    CreateBearerToken(body: { nonce: string; signature: string }): Promise<string>;
    RefreshBearerToken(): Promise<string>;
  };

  aggregator: {
    GetAllNotes(networkId: string): Promise<GetAllNotesReturnType>;
    SubmitDeposit(data: DepositRequest): Promise<SubmitDepositReturnType>;
    SubmitWithdraw(data: WithdrawRequest): Promise<SubmitWithdrawReturnType>;
    SubmitAggregation(data: AggregationRequest): Promise<SubmitAggregationReturnType>;
    SubmitNotesOwnershipProof(data: {
      proof: Groth16Proof;
      ownerHashes: string[];
    }): Promise<SubmitNoteOwnershipProofReturnType>;
    GetAggregatorRequestStatus(requestId: string): Promise<GetAggregatorRequestStatusReturnType>;
  };

  metaTransaction: {
    SubmitTransaction(body: MetaTransactionSubmitBody): Promise<void>;
    GetStatus(requestId: string): Promise<GetMetaTransactionStatusReturnType>;
    EstimateGas(body: MetaTransactionEstimationRequestBody): Promise<MetaTransaction & { id: string }>;
  };
}

export type { IApiClient };
