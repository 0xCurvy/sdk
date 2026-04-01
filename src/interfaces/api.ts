import type { Groth16Proof } from "snarkjs";
import type { AggregationRequest, DepositRequest, WithdrawRequest } from "@/types/aggregator";
import type {
  DeployPortalForRecoveryReturnType,
  FundRecoveryGasReturnType,
  GetAggregatorRequestStatusReturnType,
  GetAllNotesReturnType,
  GetCurvyIdByOwnerAddressReturnType,
  GetNetworksReturnType,
  InsertEntryPortalRequestBody,
  InsertExitPortalRequestBody,
  InsertPortalReturnType,
  RecoverablePortal,
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
import type { HexString } from "@/types/helper";

interface IApiClient {
  updateBearerToken(newBearerToken: string | undefined): void;
  get bearerToken(): string | undefined;

  network: {
    GetNetworks(): Promise<GetNetworksReturnType>;
  };

  portal: {
    insertEntryPortal(body: InsertEntryPortalRequestBody): Promise<InsertPortalReturnType["data"]>;
    insertExitPortal(body: InsertExitPortalRequestBody): Promise<InsertPortalReturnType["data"]>;
    getRecoverablePortals(): Promise<RecoverablePortal[]>;
    deployForRecovery(portalId: number): Promise<DeployPortalForRecoveryReturnType["data"]>;
    fundRecoveryGas(portalId: number, recoveryAddress: HexString): Promise<FundRecoveryGasReturnType["data"]>;
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
