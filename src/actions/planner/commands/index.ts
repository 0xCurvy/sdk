// Closure-based command layer (functional port of the legacy `planner/commands`
// classes). Commands receive only a NARROWED `CommandContext` — not the whole
// `CurvyConfig` — resolved by `createCommand`.
export { createAggregatorAggregateCommand } from "./createAggregatorAggregateCommand";
export { createAggregatorWithdrawCommand } from "./createAggregatorWithdrawCommand";
export { type CreateCommandParameters, createCommand } from "./createCommand";
export { generateNewNote } from "./generateNewNote";
export type { Command, CommandContext, CommandEstimate } from "./types";
