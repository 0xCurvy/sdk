// Re-export the kit-based `SolanaSigner` interface so recovery consumers can
// import it alongside `recoverPortal` without reaching into `@/rpc/solana`.
export type { SolanaSigner } from "@/rpc/solana";
export { type FindOwnedPortalsParameters, findOwnedPortals } from "./findOwnedPortals";
export { type FindPortalParameters, findPortal } from "./findPortal";
export { type RecoverPortalParameters, recoverPortal } from "./recoverPortal";
