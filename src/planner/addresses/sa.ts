import { CurvyCommandCSUCAddress } from "@/planner/addresses/csuc";

export class CurvyCommandSAAddress extends CurvyCommandCSUCAddress {
  get type(): string {
    return "sa";
  }

  sign(message: string): Promise<string> {
    // TODO: Implement
    throw new Error("Method not implemented.");
  }
}