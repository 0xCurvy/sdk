import { getActiveKeyPairs } from "@/actions/account/internal/getActiveKeyPairs";
import { buildAggregateRequest } from "@/actions/aggregator/buildAggregateRequest";
import { estimateAggregationCosts } from "@/actions/aggregator/internal/estimateAggregationCosts";
import { relaySubmission } from "@/actions/aggregator/relaySubmission";
import type { AggregateRecipientInput } from "@/actions/aggregator/types";
import { waitForRelay } from "@/actions/aggregator/waitForRelay";
import { getSpendWitnesses } from "@/actions/notes/getSpendWitnesses";
import { syncNotes } from "@/actions/notes/syncNotes";
import { balanceEntryToNote, type Note, noteToBalanceEntry } from "@/note";
import type { CommandData } from "@/planner/types";
import { type HexString, isValidCurvyId } from "@/types";
import type { CurvyPublicKeys } from "@/types/core";
import type { DeepNonNullable } from "@/types/helper";
import type { BalanceEntry } from "@/types/storage";
import { invariant } from "@/utils/invariant";
import { pollForCriteria } from "@/utils/promise";
import { generateNewNote } from "./generateNewNote";
import type { Command, CommandContext, CommandEstimate } from "./types";

/** The aggregate command stores its freshly-minted (estimate-time) output note on the estimate. */
interface CurvyCommandEstimateWithNote extends CommandEstimate {
  note: Note;
  /** Operator paymaster keys + gas-note amount, resolved at estimate time and reused by execute. */
  operator?: CurvyPublicKeys;
  operatorFee?: bigint;
}

/**
 * Closure-based aggregator-aggregate command (v3 client-proving).
 *
 * If `ctx.intent` is absent, this is an intermediate aggregation that gathers
 * funds to self; otherwise the final step uses the intent's recipient.
 *
 * Execution proves locally ({@link buildAggregateRequest}) and relays the proof,
 * then — because committing is asynchronous in v3 (the batch-prover commits the
 * new PENDING output on its own schedule) — it WAITS for the output note to be
 * committed and synced before returning it, so the next plan step can spend it.
 */
export function createAggregatorAggregateCommand(ctx: CommandContext): Command {
  const { intent, network, senderCurvyId, config, networkSlug, ownerBjjPrivateKeyHex } = ctx;

  if (Array.isArray(ctx.input)) {
    invariant(!ctx.input.some((note) => !note.vaultTokenId), "Invalid input for command, vaultTokenId is required.");
  } else {
    invariant(ctx.input.vaultTokenId, "Invalid input for command, vaultTokenId is required.");
  }

  const input: DeepNonNullable<BalanceEntry>[] = (
    Array.isArray(ctx.input) ? ctx.input.flat() : [ctx.input]
  ) as DeepNonNullable<BalanceEntry>[];

  const inputNotes: Note[] = input.map((noteBalanceEntry) => balanceEntryToNote(noteBalanceEntry));
  const inputNotesSum = inputNotes.reduce((acc, note) => acc + note.amount, 0n);

  // grossAmount === inputNotesSum
  const grossAmount = inputNotesSum;

  // --- recipient (handle / keys), used by the estimate path + the `recipient` getter ---
  const getRecipient = () => {
    // With multiple aggregation steps the intent is absent and funds aggregate
    // to self; the final step takes the recipient from the intent.
    if (intent) {
      if (isValidCurvyId(intent.recipient)) {
        return intent.recipient;
      }
      if (intent.recipientPublicKeys) {
        return intent.recipientPublicKeys;
      }
    }

    // During STA claim senderCurvyId is null (ephemeral account); that path
    // returns early via the intent branch above.
    if (!senderCurvyId) {
      throw new Error("Active account must have a Curvy Handle to perform aggregator aggregate.");
    }
    return senderCurvyId;
  };

  // The estimate is mutable and carries the (estimate-time) output note once estimated.
  let estimate = ctx.estimate as CurvyCommandEstimateWithNote | undefined;

  // --- CurvyCommand.netAmount ---
  const netAmount = (): bigint => {
    invariant(estimate, "Command not estimated.");
    const { curvyFeeInCurrency, gasFeeInCurrency } = estimate;
    return grossAmount - curvyFeeInCurrency - gasFeeInCurrency;
  };

  // The amount delivered to the recipient output note. A final step delivering to
  // an explicit recipient keeps `intent.amount` (the remainder becomes change to
  // self); intermediate self-folds keep everything (minus fees). `buildAggregateRequest`
  // adds the change + fee notes itself, so we only pass the recipient amount.
  const recipientAmount = (): bigint => {
    // The final, amount-bearing aggregate carves EXACTLY `intent.amount` into the
    // output note — for a transfer/swap that's the recipient's note; for a
    // withdrawal carve-out (hex recipient → `buildRecipientInput` falls back to
    // self) it's a self note of `intent.amount` with the rest kept as change. Only
    // an intent-less intermediate fold consumes everything into one self note.
    if (intent) return intent.amount;
    return netAmount();
  };

  // The recipient in the form `buildAggregateRequest` accepts (handle → real ECDH
  // stealth delivery, so the recipient — including self — can DISCOVER the note).
  const buildRecipientInput = (): AggregateRecipientInput => {
    const amount = recipientAmount();
    if (intent && isValidCurvyId(intent.recipient)) return { amount, curvyId: intent.recipient };
    if (intent?.recipientPublicKeys) return { amount, publicKeys: intent.recipientPublicKeys };
    if (!senderCurvyId) throw new Error("Active account must have a Curvy Handle to aggregate to self.");
    return { amount, curvyId: senderCurvyId };
  };

  const estimateFees = async (): Promise<CommandEstimate> => {
    if (estimate) return estimate;

    // Fallback (no paymaster/fees reachable): a coarse groupFee-based protocol estimate.
    let curvyFeeInCurrency = (grossAmount * BigInt(network.aggregationCircuitConfig!.groupFee)) / 1000n;

    // Operator paymaster gas note, in the aggregation token. Best-effort: when no
    // paymaster is reachable or the token is unpriced, gas shows as 0 and execute
    // submits/relays without a gas note (legacy passthrough). `operatorFee` carries
    // the client buffer so a small price move before the relayer validates won't refuse.
    let gasFeeInCurrency = 0n;
    let operator: CurvyPublicKeys | undefined;
    let operatorFee = 0n;
    try {
      // The protocol fee is charged ONLY on value LEAVING the sender. A self-fold or a
      // withdrawal carve-out (recipient resolves to self) keeps the value in-house, so
      // spentToOthers = 0 (mirrors the circuit + buildAggregationWitnessBundle).
      const goesToOthers =
        !!intent &&
        (isValidCurvyId(intent.recipient) || !!intent.recipientPublicKeys) &&
        intent.recipient !== senderCurvyId;
      const spentToOthers = goesToOthers ? recipientAmount() : 0n;
      const costs = await estimateAggregationCosts({
        config,
        networkSlug,
        token: inputNotes[0].token,
        spentToOthers,
      });
      operator = costs.operator;
      operatorFee = costs.operatorFee;
      gasFeeInCurrency = costs.operatorFee; // relayer gas reimbursement (operatorNote)
      // Curvy feeNote = commitment gas + protocol fee (on spentToOthers), as the contract enforces.
      curvyFeeInCurrency = costs.protocolFee;
    } catch {
      // no paymaster / unpriced token — keep the groupFee fallback, relayer gas 0
    }

    estimate = {
      curvyFeeInCurrency,
      gasFeeInCurrency,
      operator,
      operatorFee,
    } as CurvyCommandEstimateWithNote;

    const computedNetAmount =
      intent && intent.amount < netAmount() ? intent.amount - curvyFeeInCurrency - gasFeeInCurrency : netAmount();

    estimate.note = await generateNewNote(ctx, getRecipient(), input[0].vaultTokenId, computedNetAmount);

    return estimate;
  };

  // Estimate-time resulting balance (threaded to the next command during planning).
  const getResultingBalanceEntry = async (): Promise<CommandData> => {
    const { symbol, accountId, environment, networkSlug: slug, decimals, currencyAddress } = input[0];

    return noteToBalanceEntry(estimate!.note, {
      symbol,
      decimals,
      accountId,
      environment,
      networkSlug: slug,
      currencyAddress: currencyAddress as HexString,
    });
  };

  // Wait for the freshly-emitted output note to be committed (by the batch-prover)
  // and synced, then return its real, spendable balance entry.
  const awaitSyncedOutput = async (noteId: bigint): Promise<CommandData> => {
    const accountId = config.state.activeAccountId;
    invariant(accountId, "No active account to sync the aggregation output for.");
    const target = noteId.toString();
    const entry = await pollForCriteria(
      async () => {
        await syncNotes({ config, networkSlug, accountId });
        const balances = await config.storage.getBalances(accountId, config.state.environment);
        return balances.find((b) => b.networkSlug === networkSlug && b.id === target);
      },
      (found) => found !== undefined,
      240,
      500,
    );
    return entry as CommandData;
  };

  const execute = async (): Promise<CommandData | undefined> => {
    invariant(estimate, "Command not estimated.");

    // Inclusion proofs for the (committed, synced) input notes — all at one root.
    const supplied = await getSpendWitnesses({ config, networkSlug, noteIds: inputNotes.map((n) => n.id) });

    // Prove locally; the recipient note gets real stealth delivery so it can be
    // discovered after it commits. The change note is stealth-delivered back to
    // the sender (changeRecipient) so it too survives a rescan. The fee note is
    // added by the builder.
    const self = getActiveKeyPairs(config);
    const built = await buildAggregateRequest({
      config,
      networkSlug,
      inputNotes,
      ownerBjjPrivateKeyHex,
      recipients: [buildRecipientInput()],
      changeRecipient: { S: self.S, V: self.V, babyJubjubPublicKey: self.babyJubjubPublicKey },
      // Pay the operator paymaster for relaying (resolved at estimate time). Omitted
      // when no paymaster was reachable — the relay then has no gate to satisfy.
      operatorRecipient: estimate.operator,
      operatorFee: estimate.operatorFee,
      supplied,
    });

    const queued = await relaySubmission({ config, request: built });
    const finalized = await waitForRelay({ config, requestId: queued.requestId, intervalMs: 500, attempts: 240 });
    if (finalized.status !== "finalized") {
      throw new Error(`aggregation relay did not finalize (status: ${finalized.status})`);
    }

    // outputNotes[0] is the recipient note; wait for it to settle, then return it.
    const recipientNote = built.outputNotes?.[0];
    invariant(recipientNote, "buildAggregateRequest returned no output notes.");
    return awaitSyncedOutput(recipientNote.id);
  };

  return {
    id: ctx.id,
    name: "AggregatorAggregateCommand",
    get recipient() {
      return getRecipient();
    },
    get grossAmount() {
      return grossAmount;
    },
    get estimate() {
      return estimate;
    },
    set estimate(value: CommandEstimate | undefined) {
      estimate = value as CurvyCommandEstimateWithNote | undefined;
    },
    estimateFees,
    getResultingBalanceEntry,
    execute,
  };
}
