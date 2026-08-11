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
import { createBrowserCurvyConfig } from "@0xcurvy/curvy-sdk/config";

const config = await createBrowserCurvyConfig({
  apiBaseUrl: "https://api.curvy.box",
});
```

`createBrowserCurvyConfig` defaults to IndexedDB storage, session keystore rehydration, and the lean sharded notes-sync engine.

```ts
import { getBalances } from "@0xcurvy/curvy-sdk/actions";
import { createServerCurvyConfig } from "@0xcurvy/curvy-sdk/config";

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
import { getBalances, refreshBalances } from "@0xcurvy/curvy-sdk/actions";

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
import { getBalances, login } from "@0xcurvy/curvy-sdk/actions";
import { poseidonHash } from "@0xcurvy/curvy-sdk/utils";
import { IndexedDBStorage } from "@0xcurvy/curvy-sdk/storage/idb";
```

Vite browser consumers should add the SDK's plugin:

```ts
import { curvy } from "@0xcurvy/curvy-sdk/vite";

export default defineConfig({
  plugins: [curvy()],
  optimizeDeps: { include: ["buffer"] },
});
```

It applies what the WASM core and its workers need: the SDK and `@0xcurvy/rs-core-wasm`
are excluded from dependency optimization (the optimizer copies dependency code into
`node_modules/.vite/deps/`, where the generated glue's relative asset and worker URLs no
longer resolve), workers are emitted in ES format (Rayon's helper dynamically imports the
WASM module, which Vite's default `iife` worker format cannot code-split), `.zkey` counts
as an asset, and the dev server sends cross-origin-isolation headers so threaded WASM can
engage. Pass `curvy({ crossOriginIsolation: "require-corp" })` for the classic COOP/COEP
pair, or `false` to leave headers alone.

The WASM binaries come from `@0xcurvy/rs-core-wasm`, a normal dependency: the bundler
resolves them from `new URL("curvy_wasm_bg.wasm", import.meta.url)` inside the generated
glue and emits them as hashed assets. webpack 5 and Node need no configuration.

## Lifecycle

`createCurvyConfig` starts background timers. Always tear configs down:

```ts
await destroyConfig({ config });
```

Use `config.destroy()` for a specific config or `destroyConfig()` for the ambient global.
