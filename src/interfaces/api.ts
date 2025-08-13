import type {
  AggregationRequest,
  CreateActionRequest,
  CreateActionResponse,
  CreateAnnouncementRequestBody,
  CreateAnnouncementReturnType,
  DepositPayload,
  GetActionEstimatedCostRequest,
  GetActionEstimatedCostResponse,
  GetAggregatorRequestStatusReturnType,
  GetAnnouncementEncryptedMessageReturnType,
  GetAnnouncementsReturnType,
  GetCSAInfoRequest,
  GetCSAInfoResponse,
  GetCurvyHandleByOwnerAddressReturnType,
  GetNetworksReturnType,
  RegisterCurvyHandleRequestBody,
  RegisterCurvyHandleReturnType,
  ResolveCurvyHandleReturnType,
  SubmitAggregationReturnType,
  SubmitDepositReturnType,
  SubmitGasSponsorshipRequest,
  SubmitGasSponsorshipRequestReturnType,
  SubmitWithdrawReturnType,
  UpdateAnnouncementEncryptedMessageRequestBody,
  UpdateAnnouncementEncryptedMessageReturnType,
  WithdrawPayload,
} from "@/types/api";

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
  };

  auth: {
    GetBearerTotp(): Promise<string>;
    CreateBearerToken(body: { nonce: string; signature: string }): Promise<string>;
    RefreshBearerToken(): Promise<string>;
  };

  aggregator: {
    SubmitDeposit(data: DepositPayload): Promise<SubmitDepositReturnType>;
    SubmitWithdraw(data: WithdrawPayload): Promise<SubmitWithdrawReturnType>;
    SubmitAggregation(data: { aggregations: AggregationRequest[] }): Promise<SubmitAggregationReturnType>;
    GetAggregatorRequestStatus(requestId: string): Promise<GetAggregatorRequestStatusReturnType>;
  };

  csuc: {
    GetCSAInfo(req: GetCSAInfoRequest): Promise<GetCSAInfoResponse>;
    EstimateAction(req: GetActionEstimatedCostRequest): Promise<GetActionEstimatedCostResponse>;
    SubmitActionRequest(req: CreateActionRequest): Promise<CreateActionResponse>;
  };

  gasSponsorship: {
    SubmitRequest(action: SubmitGasSponsorshipRequest): Promise<SubmitGasSponsorshipRequestReturnType>;
  };
}

export type { IApiClient };
