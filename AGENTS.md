# `@0xcurvy/curvy-sdk` — Agent Reference

Reference + working guide for **AI agents** (and humans) editing or consuming the functional Curvy SDK. Pairs with the repo‑root `CLAUDE.md` (monorepo rules); this file is scoped to `packages/sdk`.

> Curvy is a privacy crypto protocol (stealth addresses + shielded notes + ZK proofs). This package is the **functional, framework‑agnostic core** (viem/wagmi/@lifi‑style), published to npm and consumed by the backend, frontend, contracts tests, and the `curvy-os` playground.

---

## At a glance

- **Package:** `@0xcurvy/curvy-sdk` (v0.0.8-rc.1) · **dual ESM + CJS** · `"type": "module"` · Node **≥ 22.16**.
- **Build:** `tsup` + `scripts/postbuild.sh` → `dist/_esm` (ESM) + `dist/_cjs` (CJS) + `dist/_types` (`.d.ts` for `import`, `.d.cts` for `require`). WASM binaries are **not** copied into `dist` — they come from the `@0xcurvy/rs-core-wasm` dependency. Lint/format: **Biome** (`biome check --write src`).
- **Tests:** `vitest` (`pnpm test` == `vitest run src`). Real‑WASM `Core` tests run offline in Node.
- **Public import policy:** the root contains the consumer-facing app API. Use the single `./actions`, `./config`, and curated `./utils` entrypoints; do not add category duplicates. Specialized tooling has deliberate subpaths:
  `./gas` · `./note` · `./proving` · `./rust-core` · `./solana` · `./rpc` · `./core` · `./contracts` · `./http/api` · `./privacy-pass` · `./storage` · `./storage/idb` · `./vite`.
- Crypto, stealth scanning, Poseidon, note cipher, Merkle state, witness evaluation, and Groth16 proving run in Rust/WASM. Cross-origin-isolated browsers may opt into Rayon builds; other browsers and Node use single-threaded builds. `snarkjs` is dev-only and remains solely as an independent proof verifier/test oracle.

```bash
pnpm --filter @0xcurvy/curvy-sdk build      # tsup + postbuild checks
pnpm --filter @0xcurvy/curvy-sdk test       # vitest run src
pnpm --filter @0xcurvy/curvy-sdk check      # biome check --write src
pnpm --filter @0xcurvy/curvy-sdk exec tsc --noEmit   # typecheck
```

---

## Mental model

A **`CurvyConfig`** is a value‑bag built once by `createCurvyConfig(...)`. It holds the live IO subsystems + reactive state; **standalone action functions** operate on it. Three storage surfaces, split by sensitivity:

| Surface | Holds | Lifetime |
|---|---|---|
| `config.keyring: Map<id, CurvyKeyPairs>` | **raw keypairs (secrets)** — the only runtime home of key material | ephemeral, in‑memory |
| `config.state` (reactive store) | serializable state: `accounts` (key‑free `CurvyAccountData`), `activeAccountId`, `networks`, `environment`, `scan` | ephemeral, reactive |
| `config.storage` (`StorageInterface`) | durable account metadata + balances + prices | persisted (IndexedDB / Map) |
| `SessionKeystore` (browser only) | keypairs + JWT, for page‑refresh survival | session‑scoped |

**Invariants (do not break):**
- **Private keys never enter `state`, events, storage, or logs.** Keys live in `config.keyring` (+ the browser keystore). `state.accounts` is the **single source of truth for account metadata**.
- **"Registered/full" ⇔ the account has a `state.accounts` entry.** A **partial** account (e.g. `addPartialAccount({ keyPairs: { s, v } })`) lives **only** in the keyring — invisible to `getAccounts`/`getActiveAccount`, can sign but isn't registered (registration needs the spend key `s`).
- **Ambient config:** `createCurvyConfig` registers the config globally. Every action takes a single options bag with an optional `config` field that defaults to the global via `resolveConfig`. Pass `{ config }` to target a specific config; `getCurvyConfig()` throws if none exists, `peekCurvyConfig()` returns `null`.
- **Lifecycle / teardown is the caller's job.** Timers (price refresh, JWT refresh) leak unless you tear down. `setCurvyConfig(null)` does **not** stop timers — call **`config.destroy()`** or **`destroyConfig({ config })`**. `createCurvyConfig` silently overwrites the global, so a second config orphans the first's timers; destroy the old one explicitly.

### Keys
`CurvyKeyPairs = { s, v, S, V, babyJubjubPublicKey }` — `s` = spending priv (claim/sign/auth + bjj seed), `v` = viewing priv (chain‑scan/discovery), `S`/`V`/`babyJubjubPublicKey` = public. **Branded keys:** signing surfaces take a `SpendKey`/`ViewKey` (branded non‑empty string); obtain via `requireSpendKey(keyPairs)` / `requireViewKey(keyPairs)` (`@0xcurvy/curvy-sdk/utils`), which throw `SpendKeyRequiredError`/`ViewKeyRequiredError` rather than letting an empty key reach a crypto primitive.

---

## Quickstart

```ts
import { createCurvyConfig, login, getBalances, on, destroyConfig, CURVY_EVENT_TYPES } from "@0xcurvy/curvy-sdk";

const config = await createCurvyConfig({ environment: "mainnet" });   // registers global + needs backend up

// Events: pass an AbortSignal for auto-cleanup (no manual off()).
const ac = new AbortController();
on(CURVY_EVENT_TYPES.BALANCE_REFRESH_COMPLETE, (e) => console.log(e), { signal: ac.signal });

await login({ signature });                 // uses the ambient config
const balances = await getBalances();       // active account

ac.abort();                                  // unsubscribes
await destroyConfig();                       // stop timers; clear global
```

---

## Public API

The **root** (`@0xcurvy/curvy-sdk`) is intentionally consumer-facing: public actions, config creation/lifecycle, domain and planner types, errors, network constants, `CurvyAccount`, `Note`, and the `solana` namespace. RPC classes, contract ABIs, storage implementations, note-sync machinery, proving primitives, and utility functions belong to their explicit subpaths and must not be re-exported from root.

### `@0xcurvy/curvy-sdk/actions` — auth
| Symbol | Signature |
|---|---|
| `login` | `(p: LoginParameters) => Promise<CurvyAccount>` — log in from an EVM/Starknet signature |
| `loginWithPasskey` | `(p) => Promise<CurvyAccount>` — log in via passkey PRF |
| `loginWithPrivateKeys` | `(p) => Promise<CurvyAccount>` — log in from raw `s`/`v` |
| `register` | `(p) => Promise<CurvyAccount>` — register a new handle from a signature |
| `registerWithPasskey` | `(p) => Promise<CurvyAccount>` |
| `registerWithPrivateKeys` | `(p) => Promise<CurvyAccount>` |
| `logout` | `(p?: { accountId?; config? }) => Promise<void>` — remove an account; re‑point/clear active |
| `restoreSession` | `(p?: WithConfig) => Promise<void>` — rehydrate accounts from the browser keystore (no‑op in Node) |

### `@0xcurvy/curvy-sdk/actions` — account
| Symbol | Signature |
|---|---|
| `addAccount` | `(p: { account: CurvyAccount; … }) => Promise<void>` — decompose a `CurvyAccount` into keyring + state + storage + keystore |
| `addPartialAccount` | `(p: { keyPairs: Partial<CurvyKeyPairs>; … }) => Promise<CurvyAccount>` — keyring‑only, no handle/owner |
| `getAccounts` | `(p?) => CurvyAccountData[]` (sync) |
| `getAccountById` | `(p: { id }) => CurvyAccountData \| undefined` (sync) |
| `getActiveAccount` | `(p?) => CurvyAccountData \| null` (sync) |
| `hasAccount` / `hasActiveAccount` | `(p?) => boolean` (sync) |
| `setActiveAccount` | `(p: { accountId; skipBearerTokenUpdate? }) => Promise<void>` |
| `getBabyJubjubPublicKey` | `(p?: { accountId? }) => Promise<string>` |
| `signMessageWithBabyJubjub` | `(p: { message: bigint; accountId? }) => Promise<StringifyBigInts<Signature>>` |
| `watchAccounts` / `watchActiveAccount` | `(p) => () => void` — reactive subscriptions (return unsubscribe) |

### `@0xcurvy/curvy-sdk/actions` — balances
| Symbol | Signature |
|---|---|
| `getBalances` | `(p?: { accountId?; cached?; config? }) => Promise<BalanceEntry[]>` |
| `refreshBalances` | `(p?: { accountId?; onProgress?; signal?; silent? }) => Promise<void>` — re‑scan from chain (per‑account lock + progress events) |
| `getScanProgress` | `(p?) => number` (0–100) |
| `pauseBalanceRefresh` / `resumeBalanceRefresh` | `(p?: { accountId? }) => void` — toggle the per‑account scan lock |

> Balance refresh is **on‑demand only** — there is no periodic poll (see *Deferred*). It is the expensive path (`GetAllNotes` + Groth16 proving).

### `@0xcurvy/curvy-sdk/actions` — events
| Symbol | Signature |
|---|---|
| `on` | `(eventName, listener, options?: { config?; signal? }) => () => void` — subscribe; returns unsubscribe. `signal` auto‑unsubscribes on abort (native Emittery). |
| `off` | `(eventName, listener, config?) => void` — unsubscribe by identity |

### `@0xcurvy/curvy-sdk/actions` — networks
| Symbol | Signature |
|---|---|
| `getNetworks` | `(p?) => Network[]` |
| `getNetwork` | `(p?) => Network` — exactly‑one by filter (throws on 0/many) |
| `switchNetworkEnvironment` | `(p?) => Promise<"mainnet" \| "testnet">` |
| `watchEnvironment` | `(p) => () => void` |
| `ensResolveCurvyId` | `(p) => Promise<HexString>` |

### `@0xcurvy/curvy-sdk/actions` — portals
| Symbol | Signature |
|---|---|
| `generateEntryPortal` | `(p) => Promise<{ address: HexString; flavour }>` — on‑ramp (shield in) |
| `generateExitPortal` | `(p) => Promise<{ address: HexString; flavour }>` — off‑ramp (unshield out) |
| `getPortalRecords` | `(p?) => Promise<{ portals: PortalRecord[]; total }>` — paginated (`offset`/`size`/`startTime`/`endTime`) |
| `getPortalStatus` | `(p) => Promise<PortalStatusResponse \| null>` |

### `@0xcurvy/curvy-sdk/actions` — recovery
| Symbol | Signature |
|---|---|
| `findOwnedPortals` | `(p) => Promise<MatchedPortalRecord[]>` |
| `findPortal` | `(p) => Promise<MatchedPortalRecord \| null>` |
| `recoverPortal` | `(p) => Promise<string>` — sweep a portal's funds to a destination (`solanaSigner` for Solana) |
| `SolanaSigner` *(type)* | signer interface for Solana recovery |

### `@0xcurvy/curvy-sdk/actions` — planner
| Symbol | Signature |
|---|---|
| `estimateIntent` | `(p: { intent }) => Promise<IntentEstimation>` — full cost of fulfilling an `Intent` |
| `estimateExternalTransfer` | `(p) => Promise<EstimateExternalTransferResult>` — pre‑deposit estimate (LiFi bridges) |
| `estimatePlanTree` | `(config, plan, input?) => Promise<PlanEstimation>` |
| `executePlan` | `(p) => Promise<PlanExecution>` — execute an estimated plan (balance refresh paused) |
| `executePlanTree` | `(config, plan, input?) => Promise<PlanExecution>` |
| `walkPlan` | `(plan, handlers, input?, emitProgress?) => Promise<PlanWalkResult>` — generic parallel/serial tree walker |
| `createCommand`, `createAggregatorAggregateCommand`, `createAggregatorWithdrawCommand`, `generateNewNote` | command‑layer factories (closure‑based) |

### `@0xcurvy/curvy-sdk/actions` — storage
| Symbol | Signature |
|---|---|
| `resetStorage` | `(p?) => Promise<void>` — clear storage, rebuild from `state.accounts`, refresh balances |

### `@0xcurvy/curvy-sdk/config`
`createCurvyConfig`, `createBrowserCurvyConfig`, `createServerCurvyConfig`, `destroyConfig`, `getCurvyConfig` (throws), `peekCurvyConfig` (→ `CurvyConfig | null`), `setCurvyConfig`, `getActiveNetworks`, `getEnvironment`, and `getProtocol`. Types: `CurvyConfig`, `CurvyState`, `CreateCurvyConfigParameters`, `CreateBrowserCurvyConfigParameters`, `CreateServerCurvyConfigParameters`, `WithConfig`, and `ScanStatus`. Config internals, the store constructor, config resolution, and price-refresh machinery are not package exports.

`CreateCurvyConfigParameters`: `{ environment?, apiBaseUrl?, storage?, wasmUrl?, wasmModule?, core?, enableKeystore?, customFetch?, timerProvider?, rustCoreThreads?, prover? }` — inject `core`/`storage`/`timerProvider` for testing or MV3; set `rustCoreThreads: "auto"` to use Rayon only in cross-origin-isolated browsers. The default prover is Rust/arkworks; proving-key paths and digests come from protocol metadata, never an SDK manifest.

### `@0xcurvy/curvy-sdk/core`
`Core` *(class)* — `new Core(wasmUrl?, wasmModule?)`, implements `ICore` as a compatibility adapter over the shared Rust module. WASM crypto: `generateKeyPairs`, `getCurvyKeys`, `send`/`sendNote`, `scan` (spend), `viewerScan` (view‑only), `getBabyJubjubPublicKey`, and `signWithBabyJubjubPrivateKey`. `loadWasm` pre-warms the shared idempotent module.

### `@0xcurvy/curvy-sdk/rpc`
Classes `EvmRpc`, `SolanaRpc`, `MultiRpc`; factories `newRpc(network)`, `newMultiRpc(networks, filter?)`; helpers `toViemChain(network)` (curated `viem/chains` base + metadata overlay) and `buildWagmiNetworkConfig({ chains, transport })` (wagmi adapter, auto-resolves networks from the active config). Types: `RpcCallReturnType`, `RpcBalance`, `RpcBalances`, `VaultBalance`.

### `@0xcurvy/curvy-sdk/storage` & `…/storage/idb`
`BaseStorage` (abstract — implements all business logic on `_`‑prefixed CRUD primitives), `MapStorage` (in‑memory, Node/tests), and type `StorageInterface`. **`./storage/idb`:** `IndexedDBStorage` (Dexie‑backed, production browser). Session-keystore and raw database implementations are internal.

### `@0xcurvy/curvy-sdk/note`
`Note` *(class)* — owner + balance + delivery tag; derives `id`/`nullifier`/`ownerHash`; `serialize{Input,Output,Public,Full}Note()`, `static random/generateOwnerHash/deserializeOutputNote`. Converters `balanceEntryToNote`, `noteToBalanceEntry`. Types: `Balance`, `BabyJubjubPublicKey`, `Owner`, `DeliveryTag`, `PublicNote`, `AuthenticatedNote`, `InputNote`, `OutputNote`, `FullNoteData`.

### Root errors
All extend `CurvyError` (has `.code`): `AnnouncementSyncError`, `StorageError`, `APIError`, `NoCurvyConfigError`, `NoActiveAccountError`, `PlanExecutionError`, `PlanEstimationError`, `CommandError`, `ScanError`, `NetworkError`, `AuthError`, `AccountError`, `SpendKeyRequiredError`, `ViewKeyRequiredError`. Discriminate by `instanceof` / `.code` — do **not** convert these to `invariant`.

### `@0xcurvy/curvy-sdk/utils`
Curated, IO-free helpers:
- **keys** — `requireSpendKey`, `requireViewKey`, `SpendKey`, `ViewKey` (type + brander), `computePrivateKeys`, `generateAccountId`.
- **hash** — `poseidonHash`, `hash` (keccak KDF), `shaDigest`, `PoseidonInput`.
- **encoding** — public decimal/bytes/hex point conversions.
- **address** — `deriveAddress`, `deriveSolanaRecoveryPubkey`, `isValidAddressFormat`, `isValidEvmAddress`.
- **network** — `filterNetworks`, `findNetwork`, `findCurrency`, `NetworkFilter`.
- **eip712** — `getAuthenticationSignatureParams`, `getSignatureParams`.
- **aggregator** — aggregation/withdrawal hashes and relay request/spend keys.
- **promise** — `pollForCriteria`, `pollForCriteriaUntil`.
- **timer** — `defaultTimerProvider`, `TimerHandle`, `TimerProvider` (injectable; swap for `chrome.alarms` under MV3).
- **format/currency** — `jsonStringify`, `parseDecimal`, `NATIVE_CURRENCY_ADDRESS`.

Encryption, passkey, invariant, common, storage-metadata, Borsh/Solana encoding, and other implementation helpers stay in the internal `@/utils` barrel.

### `@0xcurvy/curvy-sdk/solana`
PDA derivation (`deriveVaultPda`, `derivePortalMetaPda`, `deriveConfigPda`, `deriveAssociatedTokenAddress`, the `deriveAcross*`/`deriveRelay*` PDAs), recovery (`deriveRecoveryIdentifier`, `signSolRecovery`, `signSplRecovery`, `buildRecoverSolInstruction`, `buildRecoverSplInstruction`, `ownerHashToBytes`), program‑address constants, and types (`AcrossQuoteParams`, `SolanaPortalBalance`).

### Root domain types
The shared contract/domain types and guards: `Network`, `Currency`, `BalanceEntry`/`GenericBalanceEntry`/`TotalBalance`, `CurvyAccountData`/`SerializedCurvyAccount`/`ScanCursors`, `CurvyKeyPairs`/`CurvyPrivateKeys`/`CurvyPublicKeys`, `CurvyId` (+ `isValidCurvyId`/`assertCurvyId`), `HexString` (+ `isHexString`/`assertHexString`), `Signature`, `CircuitConfig`, `Core*` arg/return types, `PortalRecord`/`MatchedPortalRecord`/`PortalState`, `AggregationRequest`/`WithdrawRequest`/`AGGREGATOR_ACTIONS`, `CURVY_EVENT_TYPES`/`CURVY_EVENTS`, signature‑data types, and TS utilities (`Prettify`, `StringifyBigInts`, `Tuple`, …). Interfaces (root): `ICore`, `IApiClient`, `StorageInterface`, `ICurvyEventEmitter`.

---

## Conventions for AI agents (how to extend)

- **One exported function per file**, with a colocated `name.test.ts`. Actions live under `src/actions/<domain>/`.
- **Actions take a single options bag** with an optional `config`: `export function doThing(p: WithConfig<{ … }>) { const config = resolveConfig(p.config); … }`. Exceptions (documented): `on`/`off`/`watch*` keep `(eventName/positional, …, options?)` to preserve the natural listener shape.
- **Naming:** the canonical noun is **`account`**, never `wallet` (`CurvyAccount`, `accountId`, `config.keyring`, `actions/account/`). viem's `WalletClient`/`ethers.Wallet` are deliberately preserved (EVM‑signer concept). Match existing codebase names over inventing ZK‑literature ones.
- **Types:** co‑locate by owning module (inline or a per‑module `types.ts`); `src/types/` is only for shared contracts/helpers. "Single owner? → co‑locate."
- **Exports:** prefer the root for the ordinary application API. Add a symbol to `./actions`, `./config`, or curated `./utils` only when consumers are meant to depend on it. Do not publish category aliases or re-export implementation barrels for convenience.
- **`invariant(cond, msg)`** for internal preconditions / impossible‑state assertions (it narrows + strips the message in prod). Do **not** use it for user‑facing/validation messages or typed domain errors (keep those as `throw new XError`).
- **Never put private keys in `state`, events, storage, or logs.** Read keys from `config.keyring`; gate spend ops through `requireSpendKey`.
- **Don't add a default periodic balance poll** to the core — it's deliberately on‑demand/event‑driven (polling belongs at the consumer/React layer).
- **Crypto / proof‑system / key‑derivation decisions go through an external crypto advisor + an ADR** (`knowledge/adrs/`) — produce open questions, don't unilaterally commit.
- **Before finishing:** `tsc --noEmit` clean, `biome check --write src` clean, `vitest run src` green. When changing shared types, check downstream consumers.
- **`import { Buffer } from "buffer"`** per file (no global `Buffer`); hot byte paths hand‑roll hex to stay Buffer‑free in browser bundles.
- **Rust bindings and WASM (`core/rustCore.ts`, `proving/rustProver.ts`)** — the wasm-bindgen glue and binaries come from **`@0xcurvy/rs-core-wasm`** (published from the rs-core repo on tag; version pinned in `package.json` + the lockfile). Nothing is generated or vendored here. Rules that keep it working:
  - The dependency stays **external in the ESM build** so the consumer's bundler processes the glue in place and resolves its own `new URL("…_bg.wasm", import.meta.url)` and Rayon's `new Worker(new URL("./workerHelpers.js", …))`. It is `noExternal` only for the CJS pass, which is Node-only. Never add it to the ESM `noExternal`.
  - Browsers call `bindings.default()` with **no argument**; Node passes explicit bytes via `readPackagedWasm()` (`core/packagedWasm.ts`). `fetch` cannot read `file:` URLs.
  - The `*-threads` entries are **browser-only and imported lazily** — their Rayon snippet touches `self` at module scope, so a static import would crash Node.
  - `__CURVY_PROVER_WORKER_URL__` must stay a bare `define`-injected literal inside `new URL(...)` so bundlers can statically emit the SDK's proving worker.
- **Bumping the Rust core:** tag `rs-core` (its release workflow publishes the matching npm version), then bump the dependency here. There is no sync script and no checked-in binaries.

---

## Deferred / NOT wired (don't assume these work)

These exist in the surface but are **groundwork**, pending the upcoming backend/aggregator **decentralization + data‑availability rewrite** — do not build on them or "fix" them as dead code without that context:

- **Incremental scan** — `CurvyAccountData.scanCursors` (`latest`/`oldest`), the `ScanInfo` type, and `getPortalRecords`'s `startTime`/`endTime` params are **unwired**. `noteScan` does a full `GetAllNotes` every refresh. The intended design: `scanCursors` ↔ `getPortalRecords({startTime,endTime})` ↔ `PortalRecord.createdAt` (forward sync + backfill watermark).
- **`BALANCE_REFRESH_INTERVAL`** (constants) is exported but unused — no periodic balance timer exists.
- **Capability‑typed accounts** — only the *lightweight* `SpendKey`/`ViewKey` branding ships. The deeper `ViewOnly | Spend | Full` discriminated‑union account model is deferred (it has id‑hash + keystore migration cost).
- **Account‑id scheme** — `CurvyAccount.id = sha256(all keypairs)` vs `generateAccountId(s,v)` (used only as a password salt) are not unified; unifying is crypto‑adjacent (ADR‑gated).
- **`api.user.SetBabyJubjubKey`** — present on `IApiClient` but **orphaned** (the `babyJubjubKeyCheck` back‑fill that used it was removed; registration sends the bjj key directly).

---

## Status & gotchas

- Functional core is **complete** (legacy class SDK deleted). Consumer migration is ongoing; the production `frontend` still imports the legacy `CurvySDK` and will **not** compile against this SDK yet. `curvy-os` is migrated (a React playground).
- A `@0xcurvy/curvy-react` hooks wrapper (over the store + `watch*`) is planned but not built; `on(..., { signal })` + `watch*` are the reactive primitives to bridge.
- Connecting requires the backend up (`createCurvyConfig` fetches networks). WASM and workers are located with `new URL("…", import.meta.url)` / `new Worker(new URL(…), { type: "module" })` — the patterns Vite documents as recommended — so bundlers emit them without query‑suffix imports.
- **Vite consumers:** add the shipped plugin, `import { curvy } from "@0xcurvy/curvy-sdk/vite"` → `plugins: [curvy()]`. It sets `optimizeDeps.exclude` for the SDK and `@0xcurvy/rs-core-wasm` (the dep optimizer copies dependency code into `node_modules/.vite/deps/`, where those relative URLs resolve to nothing — note that workspace‑**linked** copies are never optimized, so this only bites once installed from npm), `worker.format: "es"` (Rayon's helper dynamically imports the WASM module and Vite's default `iife` worker format cannot code‑split — the build fails outright without it), `assetsInclude: ["**/*.zkey"]`, and dev/preview cross‑origin‑isolation headers. A `buffer` shim is still on the consumer. webpack 5 and Node need no configuration.
