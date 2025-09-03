import { CurvyCommand } from "@/planner/commands/abstract";
import { SASponsorGasAndDepositToCSUCCommand } from "@/planner/commands/sa-sponsor-gas-and-deposit-to-csuc-command";
import { CurvyAddressLike, CurvyIntent } from "@/planner/plan";
import { MockFailCommand, MockSuccessCommand } from "@/planner/commands/mock-commands";

export function commandFactory(commandName: string, addressLike: CurvyAddressLike | CurvyAddressLike[], intent?: CurvyIntent): CurvyCommand {
  switch (commandName) {
    case "sa-sponsor-gas-and-deposit-to-csuc":
      return new SASponsorGasAndDepositToCSUCCommand(addressLike);


    case "mock-success":
      return new MockSuccessCommand(addressLike)
    case "mock-fail":
      return new MockFailCommand(addressLike);
  }

  throw new Error(`Command ${commandName} not found`);
}
