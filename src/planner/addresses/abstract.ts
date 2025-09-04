import { Currency } from "@/types";

export abstract class CurvyCommandAddress {
  abstract get type(): string;

  abstract get balance(): bigint;

  abstract get currency(): Currency;

  abstract get address(): string;

  abstract sign(message: string): Promise<string>;
}

export type CurvyCommandInput = CurvyCommandAddress | CurvyCommandAddress[];