import type { CurvyCommandEstimate } from "@/planner/commands/abstract";
import { AggregatorCommand } from "@/planner/commands/aggregator/abstract";
import type { CurvyCommandData } from "@/planner/plan";
import {
  BALANCE_TYPE,
  type Erc1155BalanceEntry,
  type HexString,
  type InputNote,
  Note,
  type WithdrawRequest,
} from "@/types";
import { poseidonHash } from "@/utils/poseidon-hash";

export class AggregatorWithdrawToErc1155Command extends AggregatorCommand {
  #createWithdrawRequest(inputNotes: InputNote[], destinationAddress: HexString, privKey?: string): WithdrawRequest {
    if (!this.network.withdrawCircuitConfig) {
      throw new Error("Network withdraw circuit config is not defined!");
    }

    if (!inputNotes || !destinationAddress) {
      throw new Error("Invalid withdraw payload parameters");
    }

    let bjjPrivateKey: string;

    if (privKey) {
      bjjPrivateKey = privKey;
    } else {
      bjjPrivateKey = this.sdk.walletManager.activeWallet.keyPairs.s;
    }

    const inputNotesLength = inputNotes.length;

    for (let i = inputNotesLength; i < this.network.withdrawCircuitConfig.maxInputs; i++) {
      inputNotes.push(
        new Note({
          owner: {
            // OVO OBAVEZNO SA ALEKSOM PROVERITI
            babyJubjubPublicKey: inputNotes[0].owner.babyJubjubPublicKey,
            sharedSecret: `0x${Buffer.from(crypto.getRandomValues(new Uint8Array(31))).toString("hex")}`,
          },
          balance: {
            amount: "0",
            token: inputNotes[0].balance.token.toString(),
          },
        }).serializeInputNote(),
      );
    }

    const sortedInputNotes = inputNotes.sort((a, b) => (BigInt(a.id) < BigInt(b.id) ? -1 : 1));

    const inputNotesHash = poseidonHash(inputNotes.map((note) => BigInt(note.id)));
    const messageHash = poseidonHash([inputNotesHash, BigInt(destinationAddress)]);

    const rawSignature = this.sdk.signWithBabyJubjubPrivateKey(messageHash, bjjPrivateKey);
    const signature = {
      S: BigInt(rawSignature.S),
      R8: rawSignature.R8.map((r) => BigInt(r)),
    };

    return {
      inputNotes: sortedInputNotes,
      signature,
      destinationAddress,
    };
  }

  async execute(): Promise<CurvyCommandData> {
    const { networkSlug, environment, symbol, lastUpdated, currencyAddress, walletId } = this.input[0];

    const { address: erc1155Address, announcementData } = await this.sdk.getNewStealthAddressForUser(
      networkSlug,
      this.senderCurvyHandle,
    );

    await this.sdk.storage.storeCurvyAddress({
      ...announcementData,
      address: erc1155Address,
      walletId,
      lastScannedAt: { mainnet: 0, testnet: 0 },
    });

    // TODO: Fix this so that we dont have same return values as args
    const { inputNotes, signature, destinationAddress } = this.#createWithdrawRequest(
      this.inputNotes.map((note) => note.serializeInputNote()),
      erc1155Address,
    );

    const { requestId } = await this.sdk.apiClient.aggregator.SubmitWithdraw({
      inputNotes,
      signature,
      destinationAddress,
    });

    await this.sdk.pollForCriteria(
      () => this.sdk.apiClient.aggregator.GetAggregatorRequestStatus(requestId),
      (res) => {
        return res.status === "success";
      },
    );

    const { balances } = await this.sdk.rpcClient
      .Network(this.input[0].networkSlug)
      .getErc1155Balances(destinationAddress as HexString);
    const erc1155Balance = balances.find((b) => b.currencyAddress === this.input[0].currencyAddress);

    if (!erc1155Balance) {
      throw new Error("Failed to retrieve ERC1155 balance after deposit!");
    }

    // TODO: Create utility methods for creating balance entries in commands
    return {
      type: BALANCE_TYPE.ERC1155,
      walletId: this.input[0].walletId,
      source: destinationAddress as HexString,
      erc1155TokenId: erc1155Balance.erc1155TokenId,
      networkSlug,
      environment,
      balance: erc1155Balance.balance,
      symbol,
      decimals: this.input[0].decimals,
      currencyAddress,
      lastUpdated,
    } satisfies Erc1155BalanceEntry;
  }

  // In the case of aggregator-withdraw-to-csuc command, both the circuit
  // and the aggregator SC have withdrawBPS set, circuits calculate what is the
  // feeAmount and pass it to CSUC so that CSUC can put it on th fee collector
  async estimate(): Promise<CurvyCommandEstimate> {
    return {
      curvyFee: this.inputNotesSum / 500n, // 0.2% = 1/500
      gas: 0n,
    };
  }
}
