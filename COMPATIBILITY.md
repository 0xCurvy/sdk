# Compatibility shims and removal plan

The SDK keeps the following adapters because this monorepo still has active
consumers. New integrations should use the replacement shown here.

| Shim | Current consumers | Replacement |
| --- | --- | --- |
| `Core` class | relayer paymaster, ENS resolver, portal broadcaster, devenv scripts, Solana data script, frontend legacy-migration tests | `initCore` and the focused functions from `@0xcurvy/curvy-sdk/rust-core`; inject a narrow structural adapter where a service needs several operations |
| `CurvyAccount` and auth-action return values | SDK auth/session internals and `devenv/tests/v3-stack.test.ts` | account/auth actions plus a key-free result built from `CurvyAccountData`; application code should not construct or retain a credential object |
| `IntentEstimation.plan` | frontend send/swap route preview | render `prepared.steps` and planner progress events; execution already uses `executeIntent` |
| `BaseStorage` inheritance | SDK `MapStorage` and `IndexedDBStorage`, plus possible external storage adapters | focused raw persistence ports composed with `createCurvyStorage(...)`; keep the concrete `MapStorage`/`IndexedDBStorage` constructors as convenience factories |

## Removal sequence

1. Migrate service crypto calls by operation. Start with `Core.send` users in
   ENS resolver and portal broadcaster, then the relayer's `scanNotes` call,
   then devenv/scripts. Initialize Rust once at each process entry point.
2. Replace the frontend's recursive estimated-plan preview with a flat or grouped
   view over `prepared.steps`; execution already uses `executeIntent`.
3. Introduce a key-free `AuthenticatedAccount` result (`CurvyAccountData` for a
   registered account, `{ id }` for a partial session). Move account assembly to
   a private function that writes keys straight to `config.keyring`; migrate auth
   return types and the single direct `new CurvyAccount(...)` test, then remove
   password/credential methods that have no callers.
4. Replace `BaseStorage` inheritance in two passes: first extract its balance,
   notes, history, transfer, and preference algorithms into functions over
   focused raw persistence ports; then have Map/IndexedDB constructors compose
   those facets into `CurvyStorage`. Publish the factory for custom adapters for
   one minor release before deprecating the abstract class.
5. Add a CI check that rejects new imports of the shim symbols outside their
   compatibility modules. Remove each shim only after the monorepo search is
   empty, then remove all remaining shims together in the next major release.

The compatibility modules must remain thin: no new behavior belongs in them.

`StorageInterface`, the `I*` contract aliases, `executePlan`, and the command-only
progress event had no remaining runtime consumers after the monorepo migration,
so they were removed instead of being carried as permanent aliases.

## What is intentionally still a class

`Note`, Merkle/tree wrappers, RPC clients, the event emitter, and the IndexedDB
database are resource or protocol value implementations, not application
facades. Ordinary integrations consume them through functions or structural
contracts. `Note` is still constructed by circuits and migration tooling across
the monorepo; replacing it should be a separate protocol-value migration, not a
side effect of deleting account/config compatibility shims.

## Removed facade still referenced by archived tests

`packages/devenv/tests/old` still imports `CurvySDK`, but that class is no
longer part of the SDK and the directory is not an active service integration.
Do not recreate the facade to make those tests compile. Port any scenarios that
still provide coverage value to `createCurvyConfig` plus functional actions,
then delete the archived copies. A CI source check should reject new
`CurvySDK` imports outside that archive until it is removed.
