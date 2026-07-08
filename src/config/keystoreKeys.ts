/**
 * Reserved keystore key for the persisted login JWT. Per-account keypairs share
 * the same keystore, so writer (createCurvyConfig) and reader (restoreSession)
 * MUST agree on this literal — hence the single source of truth. Account
 * iteration skips this key.
 */
export const KEYSTORE_JWT_KEY = "__jwt__";
