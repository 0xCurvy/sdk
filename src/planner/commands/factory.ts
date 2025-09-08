import type { CurvyCommand } from "@/planner/commands/abstract";
import { MockFailCommand, MockSuccessCommand } from "@/planner/commands/mock-commands";
import type { CurvyCommandData, CurvyIntent } from "@/planner/plan";

// TODO: Napravi interfefjs ili definiciju tipa za commandFactory i u testovima samo injectuj drugi CommandFactoryt u executor
export function commandFactory(commandName: string, input: CurvyCommandData, intent?: CurvyIntent): CurvyCommand {
  switch (commandName) {
    case "mock-success":
      return new MockSuccessCommand(input);
    case "mock-fail":
      return new MockFailCommand(input);
  }

  throw new Error(`Command ${commandName} not found`);
}
