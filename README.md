## Getting Started

> **IMPORTANT**
>
> Curvy SDK is currently in closed beta.
>
> To receive support, please open a discussion at [Curvy Community](https://community.curvy.box)
> or [GitHub Issues](https://github.com/0xCurvy/curvy-sdk/issues/)
>

Curvy SDK is a Typescript SDK that works in both server and browser environments and
gives you the complete feature set of the Curvy protocol.

- [GitHub repository](https://github.com/0xCurvy/curvy-sdk/)
- [NPM](https://www.npmjs.com/package/@0xcurvy/curvy-sdk)

## Installation

Curvy SDK can be installed with a Node package manager:

```
pnpm install @0xcurvy/curvy-sdk
```

The easiest way to get started is to run the provided `curvy-os` example app:

```
git clone https://github.com/0xCurvy/curvy-sdk.git
cd example/curvy-os
pnpm install
pnpm start
```

After opening the plain JS/HTML app in your browser, configure the API key you have received from the team, and
you will have the complete set of features in the Curvy SDK at your disposal through the primitive UI of `curvy-os`.

## Initialization

Before using the SDK, you must initialize the `CurvySDK` instance.

```typescript
import { CurvySDK } from "@0xcurvy/curvy-sdk";

// Initialize with defaults (mainnet)
const sdk = await CurvySDK.init();
```

## Authentication

Authentication with the Curvy Protocol relies on cryptographic signatures. You can log in an existing user or register a new one.

### Registration

Registering a new Curvy ID providing the desired name alongside the signature data:

```typescript
import { getAuthenticationSignatureParams } from "@0xcurvy/curvy-sdk";
import { useSignTypedData, useAccount } from "wagmi";

const { address } = useAccount();

const password = "optional-password";
const signatureParams = await getAuthenticationSignatureParams(
  address,
  password,
);

const { signTypedDataAsync } = useSignTypedData();
const signatureResult = await signTypedDataAsync(signatureParams);

const signatureData = {
  signatureResult,
  signatureParams,
  signingAddress: address,
};

await sdk.register(
  "my-awesome-id.curvy.name", // Curvy ID to register (it needs to end with .curvy.name domain)
  signatureData,
);
```

### Logging In

If you already have a user's signature, you can use the SDK's `login` method.

```typescript
// Logging in on the Curvy Protocol network uses the same `signatureData` process as registration

await sdk.login(signatureData);
```

## Querying Balances

The Curvy SDK handles asset balances across multiple networks. You can refresh balances on-demand, which updates the SDK's internal storage.

### Refreshing Balances

Call `refreshBalances` to scan for the latest balances across all active networks.

```typescript
// Scan for balances
await sdk.refreshBalances();
```

### Retrieving Balances from Storage

Once refreshed, you can query balances directly from the SDK.

```typescript
// Fetch all balances for the active wallet
const balances = await sdk.getBalances();

// Pass false to force a refresh before returning, same as calling `sdk.refreshBalances()` prior to this
const freshBalances = await sdk.getBalances(false);

console.log(`Found ${balances.length} balance(s).`);

// Get aggregated totals per currency
const totals = await sdk.getTotals();
```

## Interacting with Assets

The Curvy Protocol uses an Intent -> Estimate -> Execute model for interacting with assets. This abstracts away the complexity of stealth addresses, bridging, and shielding/unshielding.

### Step 1: Define an Intent

An intent describes _what_ the user wants to do. There are four intent types:

- **`curvy-transfer`** — Send to a Curvy ID (`.curvy.name` handle)
- **`curvy-swap`** — Swap currencies within the Curvy Protocol
- **`external-transfer`** — Transfer to an external wallet address on any of the supported chains
- **`send-to-anyone`** — Generate a secure link that will allow you to send funds to anyone, prompting them to register or sign in

```typescript
import type { TransferIntent } from "@0xcurvy/curvy-sdk";

// Fetch network and currency details from the SDK
const network = sdk.getNetwork("ethereum");
const currency = network.currencies.find((c) => c.symbol === "ETH");

const intent: TransferIntent = {
  type: "curvy-transfer",
  amount: 1000000000000000000n, // 1 ETH in wei
  currency: currency,
  network: network,
  recipient: "vitalik.curvy.name", // Must be a Curvy ID ending in .curvy.name
};
```

### Step 2: Estimate the Intent

The SDK generates a local execution plan based on the user's current balances to fulfill the intent.

```typescript
const estimation = await sdk.estimate(intent);

console.log("Gas fee:", estimation.gas);
console.log("Curvy fee:", estimation.curvyFee);
console.log("Effective amount:", estimation.effectiveAmount);
```

### Step 3: Execute the Plan

Once estimated, execute the plan. The SDK handles generating zero-knowledge proofs and broadcasting transactions.

```typescript
const executionResult = await sdk.execute(estimation.plan);

if (executionResult.success) {
  console.log("Assets transferred successfully!");
} else {
  console.error("Execution failed:", executionResult.error);
}
```