export type { StorageInterface } from "@/interfaces/storage";
export { SessionKeystore } from "@/session-keystore";
export { BaseStorage } from "./base-storage";
export { MapStorage } from "./map-storage";
// Note: the Dexie-backed `IndexedDBStorage` is intentionally NOT re-exported here.
// Import it from the `@0xcurvy/curvy-sdk/storage/idb` subpath so `dexie` only
// enters bundles that actually use it.
