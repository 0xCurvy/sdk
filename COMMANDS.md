# Curvy SDK Commands: Structure and Responsibilities

This document summarizes the command hierarchy used by the planner/executor in the SDK, highlighting inheritance, differences between implementations, and separation of concerns.

## Overview

Commands represent discrete, executable steps in a plan (estimate -> execute -> produce next input). All commands inherit from `CurvyCommand` and specialize behavior via abstract layers:

- Base: `CurvyCommand`
- Abstract specializations:
  - Aggregator: `AbstractAggregatorCommand`
- Concrete commands:
  - Aggregator
    - `AggregatorAggregateCommand`
    - `AggregatorWithdrawCommand`

A factory (`CurvyCommandFactory`) instantiates concrete commands by name.

## Base Class: CurvyCommand

File: planner/commands/abstract.ts

Responsibilities:

- Holds SDK context, network/rpc, sender handle, and the raw `input` (CurvyCommandData).
- Lifecycle:
  - `estimate()` -> calls `estimateFees()` and `getCommandResult()`; stores estimate internally.
  - `execute()` -> concrete implementation executes the action and returns next-step `CurvyCommandData`.
- Contracts for subclasses to implement:
  - `name: string`
  - `grossAmount: bigint`
  - `estimateFees(): Promise<CurvyCommandEstimate>`
  - `getCommandResult(executionData?): Promise<CurvyCommandData | undefined>`
  - `execute(): Promise<CurvyCommandData | undefined>`
  - `validateInput(input)` — must refine `CurvyCommandData` shape.
- Utility:
  - `estimateData` accessor (ensures estimated before use)
  - `getNetAmount()` = grossAmount − curvyFeeInCurrency − gasFeeInCurrency

Separation of concerns:

- Base class provides common lifecycle and fee/net computations.
- Subclasses own domain-specific validation, fee estimation, and execution.

## Aggregator Commands

Abstract: planner/commands/aggregator/abstract.ts → `AbstractAggregatorCommand`

Purpose:

- Operates on Aggregator notes. Input must be an array of `NoteBalanceEntry`(ies).

Key behavior:

- Validates input is of type `note` and carries `vaultTokenId`.
- Normalizes input to array and materializes `Note[]` via `balanceEntryToNote`.
- Computes `inputNotesSum` used for `grossAmount` in concrete commands.

Concrete implementations:

1) `AggregatorAggregateCommand` (aggregator/aggregator-aggregate.ts)

- Intent-aware: optional `CurvyIntent` influences destination and amount.
- grossAmount: min(intent.amount, inputNotesSum) if intent present; else `inputNotesSum`.
- estimateFees: curvy fee from `aggregationCircuitConfig.groupFee`; gas is 0 (off-chain proof/submit via API).
- execute:
  - Creates main output note for `toAddress` (curvy handle if provided and valid; otherwise sender handle).
  - Creates change or dummy output note based on intent.amount vs sum.
  - Signs aggregation request (BabyJubjub) and submits via `apiClient.aggregator.SubmitAggregation`.
  - Polls for success, returns resulting note as `NoteBalanceEntry`.

1) `AggregatorWithdrawCommand` (aggregator/aggregator-withdraw.ts)

- grossAmount: `inputNotesSum`.
- estimateFees: curvy fee from `withdrawCircuitConfig.groupFee`; gas = 0; also stages a new stealth address (for Vault) via `generateNewStealthAddressForUser`.
- execute:
  - Registers the staged stealth address; stores it in local storage.
  - Builds withdraw request (pads inputs to circuit max), signs with BabyJubjub, submits via `SubmitWithdraw`, polls.
  - Returns a `VaultBalanceEntry` at the staged stealth address with net amount.

Separation of concerns:

- Aggregator commands focus on zero-knowledge note transformations (inputs/outputs), signatures, and aggregator API flows. No EVM calls directly.

## Command Factory

File: planner/commands/factory.ts

- `CurvyCommandFactory.createCommand(id, name, input, intent?, estimate?)` maps a string `name` to a specific class:
  - "aggregator-aggregate" → `AggregatorAggregateCommand` (optional `intent`)
  - "aggregator-withdraw" → `AggregatorWithdrawCommand`

Separation of concerns:

- Factory isolates instantiation logic and enforces any preconditions (e.g., `intent` required for withdraw to EOA).

## Key Differences and Responsibilities

- Input types:
  - Aggregator: arrays of notes (NoteBalanceEntry[]).
- Fee model:
  - Aggregator: curvy ZK-group fees from network circuit configs; gas often 0 (handled by aggregator infra).
- Execution targets:
  - Aggregator: aggregator API (submit aggregation/withdraw/deposit + polling); BabyJubjub signatures.
- Outputs:
  - Produce `CurvyCommandData` for next pipeline step: e.g., NoteBalanceEntry after aggregation, VaultBalanceEntry after onboard/withdraw-to-vault, SaBalanceEntry after withdraw-to-EOA, etc.

## Separation of Concerns Summary

- CurvyCommand: lifecycle and shared computation (net amount, estimate binding).
- Abstract layers: enforce input shape, provide helpers and domain-specific fee/signing logic.
- Concrete commands: implement precise business logic, destination addresses, and result shaping for follow-up commands.
- Factory: centralizes mapping from high-level plan step names to concrete command classes.
