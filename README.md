# Curvy SDK

`@0xcurvy/curvy-sdk` is the functional, framework-agnostic TypeScript SDK for the Curvy protocol. It works in browser and server runtimes, exposes standalone actions, and keeps live IO/state in a `CurvyConfig` value.

> Curvy SDK is currently in closed beta. For support, use [Curvy Community](https://community.curvy.box) or [GitHub Issues](https://github.com/0xCurvy/curvy-sdk/issues/).

## Installation

```bash
pnpm install @0xcurvy/curvy-sdk
```

Node `>=22.16` is required.

## Quickstart

```ts
import {
  createCurvyConfig,
  destroyConfig,
  getBalances,
  getNetwork,
  login,
  refreshBalances,
} from "@0xcurvy/curvy-sdk";

const config = await createCurvyConfig({
  environment: "mainnet",
  apiBaseUrl: "https://api.curvy.box",
});

await login({ config, signature });
await refreshBalances({ config });

const balances = await getBalances({ config });
const ethereum = getNetwork({ config, filter: "ethereum" });

console.log({ balances, ethereum });

await destroyConfig({ config });
```

Every action accepts a single options object. Pass `config` explicitly for multi-config/server code, or omit it after `createCurvyConfig(...)` registers the ambient browser/single-tenant default.

## Browser And Server Defaults

Use the convenience constructors when you do not need custom storage wiring:

```ts
import { createBrowserCurvyConfig } from "@0xcurvy/curvy-sdk/config/browser";

const config = await createBrowserCurvyConfig({
  apiBaseUrl: "https://api.curvy.box",
});
```

`createBrowserCurvyConfig` defaults to IndexedDB storage, session keystore rehydration, and the lean sharded notes-sync engine.

```ts
import { getBalances } from "@0xcurvy/curvy-sdk/actions/balances";
import { createServerCurvyConfig } from "@0xcurvy/curvy-sdk/config/server";

const config = await createServerCurvyConfig({
  apiBaseUrl: process.env.CURVY_API_BASE_URL,
});

await getBalances({ config, accountId });
```

`createServerCurvyConfig` defaults to `setAsActive: false`, so actions should receive `config` explicitly to avoid cross-request state bleed.

## Authentication

Authentication derives Curvy keys from a signed EIP-712 message.

```ts
import { getAuthenticationSignatureParams, register } from "@0xcurvy/curvy-sdk";

const signatureParams = await getAuthenticationSignatureParams(address, "optional-password");
const signatureResult = await signTypedDataAsync(signatureParams);

const account = await register({
  config,
  handle: "my-awesome-id.curvy.name",
  signature: {
    signatureParams,
    signatureResult,
    signingAddress: address,
  },
});
```

For an existing user, call `login({ config, signature })` with the same signature shape.

## Balances

```ts
import { getBalances, refreshBalances } from "@0xcurvy/curvy-sdk/actions/balances";

await refreshBalances({ config });

const cachedBalances = await getBalances({ config });
const freshBalances = await getBalances({ config, cached: false });
```

Balance refresh is on-demand. Use `AbortSignal` for cancellation and SDK events for progress updates.

## Intents

Curvy asset movement follows `Intent -> estimateIntent -> executePlan`.

```ts
import { estimateIntent, executePlan, getNetwork } from "@0xcurvy/curvy-sdk";
import type { TransferIntent } from "@0xcurvy/curvy-sdk";

const network = getNetwork({ config, filter: "ethereum" });
const currency = network.currencies.find((c) => c.symbol === "ETH");
if (!currency) throw new Error("ETH not found");

const intent: TransferIntent = {
  type: "curvy-transfer",
  amount: 1_000_000_000_000_000_000n,
  currency,
  network,
  recipient: "vitalik.curvy.name",
};

const estimation = await estimateIntent({ config, intent });
const execution = await executePlan({ config, plan: estimation.plan });
```

## Imports And Bundling

Root imports are convenient:

```ts
import { createCurvyConfig, login, getBalances } from "@0xcurvy/curvy-sdk";
```

Subpath imports reduce accidental bundle size:

```ts
import { login } from "@0xcurvy/curvy-sdk/actions/auth";
import { getBalances } from "@0xcurvy/curvy-sdk/actions/balances";
import { poseidonHash } from "@0xcurvy/curvy-sdk/utils/hash";
import { IndexedDBStorage } from "@0xcurvy/curvy-sdk/storage/idb";
```

Vite browser consumers should exclude the SDK from dependency optimization and include `.zkey` assets:

```ts
export default defineConfig({
  assetsInclude: ["**/*.zkey"],
  optimizeDeps: {
    include: ["buffer"],
    exclude: ["@0xcurvy/curvy-sdk"],
  },
});
```

The SDK ships its WASM core in `dist/assets` and resolves it via `new URL(..., import.meta.url)`.

## Lifecycle

`createCurvyConfig` starts background timers. Always tear configs down:

```ts
await destroyConfig({ config });
```

Use `config.destroy()` for a specific config or `destroyConfig()` for the ambient global.
