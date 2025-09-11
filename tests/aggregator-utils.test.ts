// @ts-nocheck
import {
  generateDummyOutputNote,
  generateEphemeralKeysHash,
  generateOutputNoteHash,
  padAggregationOutputNotes,
  generateAggregationHash,
} from "@/utils/aggregator";
import { expect, test } from "vitest";
import { poseidon2, poseidon3 } from "poseidon-lite";

test("should generate dummy aggregation output note", async () => {
  const outputNote = generateDummyOutputNote();

  expect(outputNote.ownerHash).toBeDefined();
  expect(outputNote.token).toBe("0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee");
  expect(outputNote.amount).toBe("0");
  expect(outputNote.viewTag.length).toBe(2);
  expect(outputNote.viewTag).toBeDefined();
  expect(outputNote.ephemeralKey).toBeDefined();
});

test("should pad output notes array", async () => {
  const outputNote = generateDummyOutputNote();
  const outputNotes = [outputNote];
  const paddedOutputNotes = padAggregationOutputNotes(outputNotes);

  expect(paddedOutputNotes.length).toBe(2);
  expect(paddedOutputNotes[0]).toBe(outputNote);
  expect(paddedOutputNotes[1]).toBeDefined();
  expect(paddedOutputNotes[1].ownerHash).toBeDefined();
  expect(paddedOutputNotes[1].token).toBe(
    "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
  );
  expect(paddedOutputNotes[1].amount).toBe("0");
  expect(paddedOutputNotes[1].viewTag.length).toBe(2);
  expect(paddedOutputNotes[1].viewTag).toBeDefined();
  expect(paddedOutputNotes[1].ephemeralKey).toBeDefined();
});

test("should generate output note hash", async () => {
  const outputNote = generateDummyOutputNote();

  const computedOutputNoteHash = poseidon3([
    BigInt(outputNote.ownerHash),
    BigInt(outputNote.amount),
    BigInt(outputNote.token),
  ]);

  const outputNoteHash = generateOutputNoteHash(outputNote);
  expect(outputNoteHash).toBe(computedOutputNoteHash);
});

test("should generate ephemeral keys hash", async () => {
  const outputNotes = [generateDummyOutputNote(), generateDummyOutputNote()];

  const computedEphemeralKeysHash = poseidon2(
    outputNotes.map((note: any) => note.ephemeralKey)
  );

  const ephemeralKeysHash = generateEphemeralKeysHash(outputNotes);
  expect(ephemeralKeysHash).toBe(computedEphemeralKeysHash);
});

test("should generate aggregation hash", async () => {
    const outputNotes = [generateDummyOutputNote(), generateDummyOutputNote()];
  
    const computedOutputsHash = poseidon2(
        outputNotes.map((note: any) => generateOutputNoteHash(note))
      );

    const computedEphemeralKeysHash = poseidon2(
      outputNotes.map((note: any) => note.ephemeralKey)
    );

    const computedAggregationHash = poseidon2([computedOutputsHash, computedEphemeralKeysHash]);

    const aggregationHash = generateAggregationHash(outputNotes);
    expect(aggregationHash).toBe(computedAggregationHash);
  });
  