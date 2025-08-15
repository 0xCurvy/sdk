import type { IApiClient } from "@/interfaces/api";
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
  RawAnnouncement,
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

export class MockAPIClient implements IApiClient {
  private announcementLimit = -1; // -1 will indicate there's no limit
  private shouldThrowError = false;

  private mockAnnouncements: RawAnnouncement[] = [];

  constructor(announcementLimit = -1, shouldThrowError = false) {
    this.announcementLimit = announcementLimit;
    this.shouldThrowError = shouldThrowError;
    // Initialize with some mock announcements
    this.generateMockAnnouncements(1000); // Generate 1000 mock announcements
  }

  limitAnnouncements(limit: number): void {
    this.announcementLimit = limit;
  }

  private generateMockAnnouncements(count: number): void {
    const announcements = [];
    for (let i = 0; i < count; i++) {
      announcements.push({
        id: `announcement-${i}`,
        network_id: 1,
        networkFlavour: "evm" as const,
        ephemeralPublicKey: `123${i}.456${i}`,
        viewTag: `view-tag-${i}`,
        createdAt: new Date(Date.now() - (count - i - 1) * 60000).toISOString(), // Each announcement 1 minute apart, starting from now
      });
    }
    this.mockAnnouncements = announcements;
  }

  updateBearerToken = (_newBearerToken: string): void => {
    // Mock implementation: does nothing
  };

  announcement = {
    CreateAnnouncement: async (_params: CreateAnnouncementRequestBody): Promise<CreateAnnouncementReturnType> => {
      throw new Error("Method not implemented.");
    },
    GetAnnouncements: async (
      startTime?: number,
      endTime?: number,
      size?: number,
    ): Promise<GetAnnouncementsReturnType> => {
      if (this.shouldThrowError) {
        throw new Error("Mock error");
      }

      let announcements = [...this.mockAnnouncements]; // creates a copy

      if (this.announcementLimit !== -1) {
        announcements = announcements.slice(0, this.announcementLimit);
      }

      const order = startTime && !endTime ? "ASC" : "DESC";
      if (order === "DESC") {
        announcements = announcements.reverse();
      }

      // Apply time filters if provided
      announcements = announcements.filter((a) => {
        let startTimeCriteria = true;
        let endTimeCriteria = true;

        if (startTime) {
          startTimeCriteria = new Date(a.createdAt).getTime() > startTime;
        }

        if (endTime) {
          endTimeCriteria = new Date(a.createdAt).getTime() < endTime;
        }

        return startTimeCriteria && endTimeCriteria;
      });

      return {
        // @ts-ignore
        announcements: announcements.slice(0, size),
        total: announcements.length,
      };
    },
    UpdateAnnouncementEncryptedMessage: async (
      _id: string,
      _body: UpdateAnnouncementEncryptedMessageRequestBody,
    ): Promise<UpdateAnnouncementEncryptedMessageReturnType> => {
      throw new Error("Method not implemented.");
    },
    GetAnnouncementEncryptedMessage: async (_id: string): Promise<GetAnnouncementEncryptedMessageReturnType> => {
      throw new Error("Method not implemented.");
    },
  };
  network = {
    GetNetworks: async (): Promise<GetNetworksReturnType> => {
      return Promise.resolve([
        {
          id: 1,
          name: "Mock Network",
          group: "Ethereum",
          testnet: true,
          slip0044: 60,
          flavour: "evm",
          rpcUrl: "http://localhost:8545",
          multiCallContractAddress: "0x0",
          chainId: "1",
          nativeCurrency: "ETH",
          blockExplorerUrl: "https://etherscan.io",
          currencies: [
            {
              id: 1,
              name: "Mock Token",
              symbol: "MOCK",
              icon_url: "",
              price: "1.0",
              updated_at: "2025-07-17T10:33:30.384Z",
              coinmarketcap_id: "mock-token",
              decimals: 18,
              contract_address: "0x123",
            },
          ],
        },
      ]);
    },
  };
  auth = {
    GetBearerTotp: async (): Promise<string> => {
      throw new Error("Method not implemented!");
    },
    CreateBearerToken: async (_body: { nonce: string; signature: string }): Promise<string> => {
      throw new Error("Method not implemented!");
    },
    RefreshBearerToken: async (): Promise<string> => {
      throw new Error("Method not implemented!");
    },
  };
  user = {
    GetCurvyHandleByOwnerAddress: async (_: string): Promise<GetCurvyHandleByOwnerAddressReturnType> => {
      return Promise.resolve("vitalik.curvy.name");
    },

    ResolveCurvyHandle: async (_username: string): Promise<ResolveCurvyHandleReturnType> => {
      throw new Error("Not needed for announcement syncing tests");
    },

    RegisterCurvyHandle: async (_body: RegisterCurvyHandleRequestBody): Promise<RegisterCurvyHandleReturnType> => {
      throw new Error("Not needed for announcement syncing tests");
    },
  };

  aggregator = {
    SubmitDeposit: async (_data: DepositPayload): Promise<SubmitDepositReturnType> => {
      throw new Error("Method not implemented.");
    },
    SubmitWithdraw: async (_data: WithdrawPayload): Promise<SubmitWithdrawReturnType> => {
      throw new Error("Method not implemented.");
    },
    SubmitAggregation: async (_data: { aggregations: AggregationRequest[] }): Promise<SubmitAggregationReturnType> => {
      throw new Error("Method not implemented.");
    },
    GetAggregatorRequestStatus: async (_requestId: string): Promise<GetAggregatorRequestStatusReturnType> => {
      throw new Error("Method not implemented.");
    },
  };

  csuc = {
    GetCSAInfo: async (_req: GetCSAInfoRequest): Promise<GetCSAInfoResponse> => {
      throw new Error("Method not implemented.");
    },
    EstimateAction: async (_req: GetActionEstimatedCostRequest): Promise<GetActionEstimatedCostResponse> => {
      throw new Error("Method not implemented.");
    },
    SubmitActionRequest: async (_req: CreateActionRequest): Promise<CreateActionResponse> => {
      throw new Error("Method not implemented.");
    },
  };

  gasSponsorship = {
    SubmitRequest: async (_request: SubmitGasSponsorshipRequest): Promise<SubmitGasSponsorshipRequestReturnType> => {
      throw new Error("Method not implemented.");
    },
  };
}
