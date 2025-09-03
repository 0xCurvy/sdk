import type { CurvyCommand } from "@/planner/commands/interface";
import { OnboardToCSUCCommand } from "@/planner/commands/onboard-to-csuc";

const commands = {
  "onboard-to-csuc": OnboardToCSUCCommand,
};

export function getCommandByName(commandName: string): CurvyCommand {
  if (!commands[commandName]) {
    throw new Error(`Command ${commandName} not found`);
  }

  return commands[commandName];
}
