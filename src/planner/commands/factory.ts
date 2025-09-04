import { CurvyCommand } from "@/planner/commands/abstract";
import { CurvyIntent } from "@/planner/plan";
import { MockFailCommand, MockSuccessCommand } from "@/planner/commands/mock-commands";
import { CurvyCommandInput } from "@/planner/addresses/abstract";

export function commandFactory(commandName: string, input: CurvyCommandInput, intent?: CurvyIntent): CurvyCommand {
  switch (commandName) {
    case "mock-success":
      return new MockSuccessCommand(input)
    case "mock-fail":
      return new MockFailCommand(input);
  }

  throw new Error(`Command ${commandName} not found`);
}
