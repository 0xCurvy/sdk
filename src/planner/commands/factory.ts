import type { CurvyCommandData } from "@/planner/addresses/abstract";
import type { CurvyCommand } from "@/planner/commands/abstract";
import { AgregatorAgregateCommand } from "@/planner/commands/aggregator-agregate";
import { MockFailCommand, MockSuccessCommand } from "@/planner/commands/mock-commands";
import type { CurvyIntent } from "@/planner/plan";

export function commandFactory(commandName: string, input: CurvyCommandData, intent?: CurvyIntent): CurvyCommand {
  switch (commandName) {
    case "aggregator-aggregate":
      if (!intent) throw new Error("Intent is required");
      //@ts-expect-error
      return new AgregatorAgregateCommand(input, intent);
    case "mock-success":
      return new MockSuccessCommand(input);
    case "mock-fail":
      return new MockFailCommand(input);
  }

  throw new Error(`Command ${commandName} not found`);
}
