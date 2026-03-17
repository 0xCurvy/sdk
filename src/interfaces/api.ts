import type { Groth16Proof } from "snarkjs";
import type { AggregationRequest, DepositRequest, WithdrawRequest } from "@/types/aggregator";
import type {
  GetAggregatorRequestStatusReturnType,
  GetAllNotesReturnType,
  GetCurvyIdByOwnerAddressReturnType,
  GetNetworksReturnType,
  InsertEntryPortalRequestBody,
  InsertExitPortalRequestBody,
  InsertPortalReturnType,
  RegisterCurvyIdRequestBody,
  RegisterCurvyIdReturnType,
  ResolveCurvyIdReturnType,
  SetBabyJubjubPublicKeyRequestBody,
  SetBabyJubjubPublicKeyReturnType,
  SubmitAggregationReturnType,
  SubmitDepositReturnType,
  SubmitNoteOwnershipProofReturnType,
  SubmitWithdrawReturnType,
} from "@/types/api";
import type { CurvyId } from "@/types/curvy";

interface IApiClient {
  updateBearerToken(newBearerToken: string | undefined): void;
  get bearerToken(): string | undefined;

  network: {
    GetNetworks(): Promise<GetNetworksReturnType>;
  };

  portal: {
    insertEntryPortal(body: InsertEntryPortalRequestBody): Promise<InsertPortalReturnType["data"]>;
    insertExitPortal(body: InsertExitPortalRequestBody): Promise<InsertPortalReturnType["data"]>;
  };

  user: {
    RegisterCurvyId(body: RegisterCurvyIdRequestBody): Promise<RegisterCurvyIdReturnType>;
    ResolveCurvyId(username: string): Promise<ResolveCurvyIdReturnType>;
    GetCurvyIdByOwnerAddress(ownerAddress: string): Promise<GetCurvyIdByOwnerAddressReturnType>;
    SetBabyJubjubKey(
      handle: CurvyId,
      body: SetBabyJubjubPublicKeyRequestBody,
    ): Promise<SetBabyJubjubPublicKeyReturnType>;
  };

  auth: {
    GetBearerTotp(): Promise<string>;
    CreateBearerToken(body: { nonce: string; signature: string }): Promise<string>;
    RefreshBearerToken(): Promise<string>;
  };

  aggregator: {
    GetAllNotes(networkId: number): Promise<GetAllNotesReturnType>;
    SubmitDeposit(data: DepositRequest): Promise<SubmitDepositReturnType>;
    SubmitWithdraw(data: WithdrawRequest): Promise<SubmitWithdrawReturnType>;
    SubmitAggregation(data: AggregationRequest): Promise<SubmitAggregationReturnType>;
    SubmitNotesOwnershipProof(data: {
      proof: Groth16Proof;
      ownerHashes: string[];
      networkId: number;
    }): Promise<SubmitNoteOwnershipProofReturnType>;
    GetAggregatorRequestStatus(requestId: string): Promise<GetAggregatorRequestStatusReturnType>;
  };
}

export type { IApiClient };
