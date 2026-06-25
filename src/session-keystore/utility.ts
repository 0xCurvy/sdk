/**
 * XOR secret splitting and window.name storage utilities.
 */

// ---------------------------------------------------------------------------
// Base64 helpers
// ---------------------------------------------------------------------------

const toBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const fromBase64 = (encoded: string): Uint8Array => {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const textEncoder = /* @__PURE__ */ new TextEncoder();
const textDecoder = /* @__PURE__ */ new TextDecoder();

// ---------------------------------------------------------------------------
// Random bytes (isomorphic)
// ---------------------------------------------------------------------------

const randomBytes = (length: number): Uint8Array => {
  // globalThis.crypto is available in all modern browsers and Node 19+.
  // The SDK requires Node >= 22, so this should always be available.
  return globalThis.crypto.getRandomValues(new Uint8Array(length));
};

// ---------------------------------------------------------------------------
// XOR secret splitting
// ---------------------------------------------------------------------------

/**
 * Split a secret string into two base64-encoded XOR shares.
 * `join(a, b)` reconstructs the original.
 */
export const split = (secret: string): [string, string] => {
  const buff = textEncoder.encode(secret);
  const rand = randomBytes(buff.length);
  const xored = new Uint8Array(buff.length);
  for (let i = 0; i < buff.length; i++) {
    xored[i] = rand[i] ^ buff[i];
  }
  return [toBase64(rand), toBase64(xored)];
};

/**
 * Reconstruct a secret from two XOR shares produced by `split()`.
 * Returns `null` if the shares have mismatched lengths.
 */
export const join = (a: string, b: string): string | null => {
  const aBuff = fromBase64(a);
  const bBuff = fromBase64(b);
  if (aBuff.length !== bBuff.length) {
    return null;
  }
  const output = new Uint8Array(aBuff.length);
  for (let i = 0; i < output.length; i++) {
    output[i] = aBuff[i] ^ bBuff[i];
  }
  return textDecoder.decode(output);
};

// ---------------------------------------------------------------------------
// window.name storage
// ---------------------------------------------------------------------------

const getWindowNameTarget = (): Window | null => {
  try {
    // Prefer window.top for cross-frame consistency, but fall back to window
    // if top is inaccessible (cross-origin iframe) or unavailable.
    const top = window.top;
    if (top && typeof top.name === "string") return top;
  } catch {
    // Cross-origin access to window.top throws — fall back to window
  }
  return window;
};

const loadObjectFromWindowName = (): Record<string, string> => {
  const target = getWindowNameTarget();
  if (!target?.name || target.name === "") {
    return {};
  }
  try {
    return JSON.parse(target.name) as Record<string, string>;
  } catch {
    return {};
  }
};

/**
 * Store a value under `name` inside `window.name` (JSON-serialized object).
 */
export const saveToWindowName = (name: string, data: string): void => {
  const target = getWindowNameTarget();
  if (!target) return;
  const obj = loadObjectFromWindowName();
  obj[name] = data;
  target.name = JSON.stringify(obj);
};

/**
 * Retrieve and **remove** the value stored under `name` in `window.name`.
 * The removal is intentional — each share is single-use to limit the exposure
 * window if an attacker reads `window.name` after the legitimate load.
 */
export const loadFromWindowName = (name: string): string | null => {
  const target = getWindowNameTarget();
  if (!target) return null;

  const saved = loadObjectFromWindowName();
  if (!(name in saved)) {
    return null;
  }

  const { [name]: out, ...rest } = saved;
  const json = JSON.stringify(rest);
  target.name = json === "{}" ? "" : json;
  return out || null;
};
