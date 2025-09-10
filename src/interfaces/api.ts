import type { Groth16Proof } from "snarkjs";
import type { AggregationRequest, DepositRequest, WithdrawRequest } from "@/types/aggregator";
import type {
  CreateActionResponse,
  CreateAnnouncementRequestBody,
  CreateAnnouncementReturnType,
  GetActionEstimatedCostRequest,
  GetActionEstimatedCostResponse,
  GetActionStatusResponse,
  GetAggregatorRequestStatusReturnType,
  GetAllNotesReturnType,
  GetAnnouncementEncryptedMessageReturnType,
  GetAnnouncementsReturnType,
  GetCSAInfoRequest,
  GetCSAInfoResponse,
  GetCurvyHandleByOwnerAddressReturnType,
  GetNetworksReturnType,
  RegisterCurvyHandleRequestBody,
  RegisterCurvyHandleReturnType,
  ResolveCurvyHandleReturnType,
  SetBabyJubjubPublicKeyRequestBody,
  SetBabyJubjubPublicKeyReturnType,
  SubmitAggregationReturnType,
  SubmitDepositReturnType,
  SubmitGasSponsorshipRequest,
  SubmitGasSponsorshipRequestReturnType,
  SubmitNoteOwnershipProofReturnType,
  SubmitWithdrawReturnType,
  UpdateAnnouncementEncryptedMessageRequestBody,
  UpdateAnnouncementEncryptedMessageReturnType,
} from "@/types/api";
import type { CsucAction } from "@/types/csuc";
import type { CurvyHandle } from "@/types/curvy";

interface IApiClient {
  updateBearerToken(newBearerToken: string | undefined): void;

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
    GetAllNotes(): Promise<GetAllNotesReturnType>;
    SubmitDeposit(data: DepositRequest): Promise<SubmitDepositReturnType>;
    SubmitWithdraw(data: WithdrawRequest): Promise<SubmitWithdrawReturnType>;
    SubmitAggregation(data: AggregationRequest): Promise<SubmitAggregationReturnType>;
    SubmitNotesOwnerhipProof(data: {
      proof: Groth16Proof;
      ownerHashes: string[];
    }): Promise<SubmitNoteOwnershipProofReturnType>;
    GetAggregatorRequestStatus(requestId: string): Promise<GetAggregatorRequestStatusReturnType>;
  };

  csuc: {
    GetCSAInfo(req: GetCSAInfoRequest): Promise<GetCSAInfoResponse>;
    EstimateAction(req: GetActionEstimatedCostRequest): Promise<GetActionEstimatedCostResponse>;
    SubmitActionRequest(req: { action: CsucAction }): Promise<CreateActionResponse>;
    GetActionStatus(req: { actionIds: string[] }): Promise<GetActionStatusResponse>;
  };

  gasSponsorship: {
    SubmitRequest(action: SubmitGasSponsorshipRequest): Promise<SubmitGasSponsorshipRequestReturnType>;
  };
}

export type { IApiClient };
