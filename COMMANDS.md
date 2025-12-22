# Curvy SDK Commands: Structure and Responsibilities

This document summarizes the command hierarchy used by the planner/executor in the SDK, highlighting inheritance, differences between implementations, and separation of concerns.

## Overview
Commands represent discrete, executable steps in a plan (estimate -> execute -> produce next input). All commands inherit from `CurvyCommand` and specialize behavior via abstract layers:

- Base: `CurvyCommand`
- Abstract specializations:
  - Aggregator: `AbstractAggregatorCommand`
  - Client (direct EVM RPC): `AbstractClientCommand`
  - Meta-transaction: `AbstractMetaTransactionCommand`
    - Vault meta-tx: `AbstractVaultMetaTransactionCommand`
    - SA meta-tx: `AbstractSaMetaTransactionCommand`
- Concrete commands:
  - Aggregator
    - `AggregatorAggregateCommand`
    - `AggregatorWithdrawToVaultCommand`
  - Client
    - `VaultOnboardNativeCommand`
  - Meta-transaction
    - `VaultOnboardCommand` (ERC-20 via EIP-7702 auth)
    - `VaultDepositToAggregatorCommand`
    - `VaultWithdrawToEOACommand`

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

2) `AggregatorWithdrawToVaultCommand` (aggregator/aggregator-withdraw-to-vault.ts)
- grossAmount: `inputNotesSum`.
- estimateFees: curvy fee from `withdrawCircuitConfig.groupFee`; gas = 0; also stages a new stealth address (for Vault) via `generateNewStealthAddressForUser`.
- execute:
  - Registers the staged stealth address; stores it in local storage.
  - Builds withdraw request (pads inputs to circuit max), signs with BabyJubjub, submits via `SubmitWithdraw`, polls.
  - Returns a `VaultBalanceEntry` at the staged stealth address with net amount.

Separation of concerns:
- Aggregator commands focus on zero-knowledge note transformations (inputs/outputs), signatures, and aggregator API flows. No EVM calls directly.

## Client Commands (Direct RPC)
Abstract: planner/commands/client/abstract.ts → `AbstractClientCommand`

Purpose:
- Actions initiated from a stealth account (SA) directly via EVM RPC, not meta-tx.

Key behavior:
- Input must be a single `SaBalanceEntry` with `vaultTokenId`.
- Exposes client-specific estimate shape (gasLimit, maxFeePerGas).
- grossAmount = `input.balance`.

Concrete implementation:

- `VaultOnboardNativeCommand` (client/vault-onboard-native-command.ts)
  - estimate: queries RPC for gas (onboard native to vault), applies a 20% buffer and a small curvy fee (config placeholder), computes net.
  - execute: retrieves private key and sends native value to vault using estimated gas params.
  - Result: returns `VaultBalanceEntry` with net balance.

Separation of concerns:
- Purely on-chain EVM interactions using the SDK’s RPC client; no meta-transaction backend.

## Meta-Transaction Commands
Abstract: planner/commands/meta-transaction/abstract.ts → `AbstractMetaTransactionCommand`

Purpose:
- Actions executed by the Curvy relayer via a signed EIP-712 meta-transaction.

Key behavior:
- Input: single `VaultBalanceEntry` or `SaBalanceEntry` (validated in specializations below).
- `metaTransactionType`: each concrete command sets a constant numeric type used on-chain.
- Fee calculation:
  - Curvy fee fetched from Vault contract based on meta-tx type.
  - Gas fee estimated via `apiClient.metaTransaction.EstimateGas` (optionally includes note owner hash for deposit to aggregator).
- Signing: EIP-712 `CurvyMetaTransaction` with Vault domain/version; uses current nonce from Vault.
- `grossAmount = input.balance`.

Specializations:
- `AbstractVaultMetaTransactionCommand`
  - Validates `VaultBalanceEntry` input.
- `AbstractSaMetaTransactionCommand`
  - Validates `SaBalanceEntry` input.

Concrete implementations:

- `VaultOnboardCommand` (meta-transaction/vault-onboard-command.ts)
  - Type: `VAULT_ONBOARD` (ERC-20 via EIP-7702 authorization to TokenMover).
  - execute: signs EIP-7702 Authorization with SA key for TokenMover contract; submits meta-tx; polls completion; returns `VaultBalanceEntry` with net.

- `VaultDepositToAggregatorCommand` (meta-transaction/vault-deposit-to-aggregator.ts)
  - Type: `VAULT_DEPOSIT_TO_AGGREGATOR`.
  - estimate: also creates a note sharedSecret via `getNewNoteForUser` (ownerHash needed by gas estimator); stores it in estimate data.
  - execute: signs meta-tx to Aggregator contract; upon completion, constructs and submits a deposit with the prepared output note; polls aggregator success; returns resulting `NoteBalanceEntry`.

- `VaultWithdrawToEOACommand` (meta-transaction/vault-withdraw-to-eoa.ts)
  - Type: `VAULT_WITHDRAW`.
  - Requires intent with `toAddress` (EOA hex address). Validates address is hex.
  - execute: signs and submits meta-tx; polls completion; returns an `SaBalanceEntry` snapshot (moving from Vault to SA/EOA context).

Separation of concerns:
- Meta-tx commands encapsulate relayer-based flows: on-chain fees (via contract reads) + off-chain estimates/signing + relayer submission/polling.
- Abstract layer unifies signing and fee calculation; concrete classes define the specific meta-tx type and result shaping.

## Command Factory
File: planner/commands/factory.ts

- `CurvyCommandFactory.createCommand(id, name, input, intent?, estimate?)` maps a string `name` to a specific class:
  - "vault-onboard-erc20" → `VaultOnboardCommand`
  - "vault-onboard-native" → `VaultOnboardNativeCommand`
  - "vault-deposit-to-aggregator" → `VaultDepositToAggregatorCommand`
  - "vault-withdraw-to-eoa" → `VaultWithdrawToEOACommand` (requires `intent`)
  - "aggregator-aggregate" → `AggregatorAggregateCommand` (optional `intent`)
  - "aggregator-withdraw-to-vault" → `AggregatorWithdrawToVaultCommand`

Separation of concerns:
- Factory isolates instantiation logic and enforces any preconditions (e.g., `intent` required for withdraw to EOA).

## Key Differences and Responsibilities
- Input types:
  - Aggregator: arrays of notes (NoteBalanceEntry[]).
  - Client: single SA balance.
  - Meta-tx: single SA or Vault balance (depending on subclass).
- Fee model:
  - Aggregator: curvy ZK-group fees from network circuit configs; gas often 0 (handled by aggregator infra).
  - Client: RPC-estimated gas with buffer; simple curvy fee.
  - Meta-tx: on-chain curvy fee from Vault contract; gas via relayer estimator; EIP-712 signing.
- Execution targets:
  - Aggregator: aggregator API (submit aggregation/withdraw/deposit + polling); BabyJubjub signatures.
  - Client: direct EVM transaction signed by local private key.
  - Meta-tx: relayer via API with EIP-712 signatures; sometimes also interacting with aggregator APIs post-completion.
- Outputs:
  - Produce `CurvyCommandData` for next pipeline step: e.g., NoteBalanceEntry after aggregation, VaultBalanceEntry after onboard/withdraw-to-vault, SaBalanceEntry after withdraw-to-EOA, etc.

## Separation of Concerns Summary
- CurvyCommand: lifecycle and shared computation (net amount, estimate binding).
- Abstract layers: enforce input shape, provide helpers and domain-specific fee/signing logic.
- Concrete commands: implement precise business logic, destination addresses, and result shaping for follow-up commands.
- Factory: centralizes mapping from high-level plan step names to concrete command classes.
