import { Currency } from "@/types";
import { CurvyCommandAddress } from "./abstract";

export class CurvyCommandCSUCAddress extends CurvyCommandAddress {
  #balance: bigint;
  #currency: Currency;
  #address: string;
  // @ts-ignore
  #privateKey: string;

  constructor(balance: bigint, currency: Currency, address: string, privateKey: string) {
    super();
    this.#balance = balance;
    this.#currency = currency;
    this.#address = address;
    this.#privateKey = privateKey;
  }

  get type(): string {
    return "csuc";
  }

  get balance(): bigint {
    return this.#balance;
  }

  get currency(): Currency {
    return this.#currency;
  }

  get address(): string {
    return this.#address;
  }

  sign(message: string): Promise<string> {
    throw new Error("Method not implemented.");
  }
}