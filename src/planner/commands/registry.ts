import { CurvyCommand } from "@/planner/commands/abstract";
import { SASponsorGasAndDepositToCSUCCommand } from "@/planner/commands/sa-sponsor-gas-and-deposit-to-csuc-command";
import { CurvyAddressLike, CurvyIntent } from "@/planner/plan";

export function getCommandByName(commandName: string, addressLike: CurvyAddressLike, intent?: CurvyIntent): CurvyCommand {
  switch (commandName) {
    case "sa-sponsor-gas-and-deposit-to-csuc":
      return new SASponsorGasAndDepositToCSUCCommand(addressLike);
  }

  throw new Error(`Command ${commandName} not found`);
}
