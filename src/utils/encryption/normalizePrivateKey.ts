/**
 * Normalizes a private key string into canonical 32-byte hex form: strips an
 * optional `0x` prefix and left-pads to 64 hex characters. Callers add the `0x`
 * prefix as needed (e.g. `0x${normalizePrivateKey(key)}`). Padding ensures keys
 * with leading-zero bytes are not silently truncated.
 */
const normalizePrivateKey = (privateKey: string): string => privateKey.replace(/^0x/, "").padStart(64, "0");

export { normalizePrivateKey };
