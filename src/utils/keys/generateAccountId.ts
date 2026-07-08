import { shaDigest } from "@/utils/hash/shaDigest";

// The account ID is the full SHA-256 hex of {s, v}. (An earlier 12-char
// truncation was never actually applied; shortening it now would invalidate
// every existing account ID, so the full digest is the stable identifier.)
const generateAccountId = (s: string, v: string) => shaDigest("SHA-256", JSON.stringify({ s, v }));

export { generateAccountId };
