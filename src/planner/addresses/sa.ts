import { CurvyCommandCSUCAddress } from "@/planner/addresses/csuc";

export class CurvyCommandSAAddress extends CurvyCommandCSUCAddress {
  get type(): string {
    return "sa";
  }
}