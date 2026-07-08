// Bridge allowlists mirror the broadcaster's. Keep in sync with
// packages/services/portal-broadcaster/src/broadcaster/portal-broadcaster.ts
// (ALLOWED_LIFI_BRIDGES / ALLOWED_LIFI_SOLANA_EXIT_BRIDGES) — drift here means
// our pre-deposit estimate disagrees with what the broadcaster actually routes
// through, by potentially more than just a few bps.
export const LIFI_BRIDGES_EVM = ["gasZipBridge", "relaydepository", "across"];
// Solana entries are constrained to bridges whose calldata layout the
// on-chain extractor on the Solana side understands.
export const LIFI_BRIDGES_SOLANA_ENTRY = ["across", "relaydepository"];
// Solana exits use a narrower set — only LiFi facets where the receiver lives
// at a predictable offset in the bridge-specific data blob.
export const LIFI_BRIDGES_SOLANA_EXIT = ["across", "mayan", "near"];
