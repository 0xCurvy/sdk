/**
 * SessionKeystore — XOR-split key-value store for sensitive session data
 *
 * Two-phase persistence (inspired by ProtonMail's Nov 2025 update):
 *
 *   Chrome 146+ freezes the browsing context during pagehide, so writes to
 *   window.name at teardown are NOT committed. The fix:
 *
 *   Phase 1 — on every mutation (set / delete):
 *     Map → JSON → XOR split → share A written to window.name immediately
 *     (share B kept as a pending callback)
 *
 *   Phase 2 — on pagehide / unload:
 *     Execute the pending callback → share B written to sessionStorage
 *
 *   window.name is always current before teardown. sessionStorage writes
 *   at pagehide still work reliably across all browsers.
 *
 * Restoration (on init):
 *   window.name share A + sessionStorage share B → XOR join → Map
 *
 * Events (via Emittery):
 *   created, read, updated, deleted, expired
 */

import Emittery from "emittery";
import { join, loadFromWindowName, saveToWindowName, split } from "./utility";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ExpirableEntry {
  readonly value: string;
  readonly expiresAt?: number;
}

export interface SessionKeystoreEvents {
  created: { key: string };
  read: { key: string };
  updated: { key: string };
  deleted: { key: string };
  expired: { key: string };
}

export interface SessionKeystoreOptions {
  name?: string;
}

// ---------------------------------------------------------------------------
// SessionKeystore
// ---------------------------------------------------------------------------

export class SessionKeystore extends Emittery<SessionKeystoreEvents> {
  readonly name: string;
  readonly #storageKey: string;

  #store: Map<string, ExpirableEntry> = new Map();
  #timeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();

  #initialized: Promise<void>;

  /** Pending phase-2 callback: writes share B to sessionStorage. */
  #pendingFinalize: (() => void) | null = null;
  /** AbortController to remove pagehide/unload listeners on destroy. */
  #abortController: AbortController | null = null;

  constructor(opts: SessionKeystoreOptions = {}) {
    super();
    this.name = opts.name || "default";
    this.#storageKey = `session-keystore:${this.name}`;

    if (typeof window !== "undefined") {
      this.#initialized = this.#init();
    } else {
      // Node.js — no persistence, no encryption needed
      this.#initialized = Promise.resolve();
    }
  }

  /**
   * Resolves once the keystore has restored any persisted session data.
   * Await before first use.
   */
  async ready(): Promise<void> {
    return this.#initialized;
  }

  // -------------------------------------------------------------------------
  // Init & lifecycle
  // -------------------------------------------------------------------------

  async #init(): Promise<void> {
    this.#load();

    // Phase 2: finalize on pagehide (preferred) with unload fallback.
    // Both may fire — #finalize() is idempotent.
    this.#abortController = new AbortController();
    window.addEventListener("pagehide", () => this.#finalize(), { signal: this.#abortController.signal });
    window.addEventListener("unload", () => this.#finalize(), { signal: this.#abortController.signal });
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  set(key: string, value: string, expiresAt?: Date | number): void {
    const d = expiresAt === undefined ? undefined : typeof expiresAt === "number" ? expiresAt : expiresAt.valueOf();

    const entry: ExpirableEntry = { value, expiresAt: d };
    const existing = this.#store.get(key);
    this.#store.set(key, entry);

    if (this.#setTimeout(key) === "expired") {
      return;
    }

    if (!existing) {
      void this.emit("created", { key });
      this.#writeShare1();
    } else if (existing.value !== value) {
      void this.emit("updated", { key });
      this.#writeShare1();
    }
  }

  get(key: string, now = Date.now()): string | null {
    const entry = this.#store.get(key);
    if (!entry) {
      return null;
    }
    if (entry.expiresAt !== undefined && entry.expiresAt <= now) {
      this.#expired(key);
      return null;
    }
    void this.emit("read", { key });
    return entry.value;
  }

  delete(key: string): void {
    this.#clearTimeout(key);
    this.#store.delete(key);
    void this.emit("deleted", { key });
    this.#writeShare1();
  }

  clear(): void {
    for (const key of [...this.#store.keys()]) {
      this.delete(key);
    }
  }

  get size(): number {
    return this.#store.size;
  }

  has(key: string): boolean {
    return this.#store.has(key);
  }

  keys(): IterableIterator<string> {
    return this.#store.keys();
  }

  // -------------------------------------------------------------------------
  // Two-phase persistence
  // -------------------------------------------------------------------------

  /**
   * Manually persist both shares synchronously.
   * Flushes both phase 1 (window.name) and phase 2 (sessionStorage).
   */
  persist(): void {
    if (typeof window === "undefined") {
      return;
    }
    this.#pendingFinalize = null;
    const finalize = this.#save();
    finalize();
  }

  /**
   * Phase 1 + Phase 2 split: XOR-split the store, write share A to
   * window.name immediately, return a callback that writes share B to
   * sessionStorage.
   *
   * Chrome 146+ freezes the browsing context during pagehide, so writes
   * to window.name at teardown are NOT committed. By writing window.name
   * on every mutation, share A is always current before teardown.
   * sessionStorage writes at pagehide still work reliably.
   */
  #save(): () => void {
    if (this.#store.size === 0) {
      // Clear any stale shares
      saveToWindowName(this.#storageKey, "");
      return () => window.sessionStorage.removeItem(this.#storageKey);
    }
    const json = JSON.stringify(Array.from(this.#store.entries()));
    const [a, b] = split(json);
    saveToWindowName(this.#storageKey, a);
    return () => window.sessionStorage.setItem(this.#storageKey, b);
  }

  /**
   * Phase 1: Write share A to window.name on every mutation.
   * Stores the phase-2 callback for later execution at pagehide.
   */
  #writeShare1(): void {
    if (typeof window === "undefined") {
      return;
    }
    this.#pendingFinalize = this.#save();
  }

  /**
   * Phase 2: Write share B to sessionStorage.
   * Called on pagehide/unload. Idempotent — safe if both events fire.
   * Does NOT write window.name — share A is always kept current by
   * #writeShare1(), so it's already committed before teardown.
   */
  #finalize(): void {
    if (this.#pendingFinalize) {
      this.#pendingFinalize();
      this.#pendingFinalize = null;
    }
  }

  // -------------------------------------------------------------------------
  // Load
  // -------------------------------------------------------------------------

  #load(): void {
    const a = loadFromWindowName(this.#storageKey);
    const b = window.sessionStorage.getItem(this.#storageKey);
    window.sessionStorage.removeItem(this.#storageKey);

    if (!a || !b) {
      return;
    }

    const json = join(a, b);
    if (!json) {
      return;
    }

    let entries: [string, ExpirableEntry][];
    try {
      entries = JSON.parse(json) as [string, ExpirableEntry][];
    } catch {
      return;
    }

    this.#store = new Map(entries);

    // Re-establish expiration timeouts
    for (const key of this.#store.keys()) {
      this.#setTimeout(key);
    }

    // Re-populate window.name immediately so the data is ready for the next
    // teardown. Without this, a reload with no new mutations would leave
    // window.name empty and #pendingFinalize null — the second refresh
    // would have nothing to persist.
    if (this.#store.size > 0) {
      this.#writeShare1();
    }
  }

  // -------------------------------------------------------------------------
  // Destroy
  // -------------------------------------------------------------------------

  /**
   * Destroy the session — clear all secrets, remove persisted shares,
   * detach event listeners.
   */
  async destroy(): Promise<void> {
    this.clear();
    if (typeof window !== "undefined") {
      this.#abortController?.abort();
      this.#abortController = null;
      window.sessionStorage.removeItem(this.#storageKey);
    }
    this.#pendingFinalize = null;
  }

  // -------------------------------------------------------------------------
  // Expiration
  // -------------------------------------------------------------------------

  #setTimeout(key: string): "expired" | undefined {
    this.#clearTimeout(key);
    const entry = this.#store.get(key);
    if (entry?.expiresAt === undefined) {
      return;
    }
    const timeout = entry.expiresAt - Date.now();
    if (timeout <= 0) {
      this.#expired(key);
      return "expired";
    }
    const t = setTimeout(() => this.#expired(key), timeout);
    this.#timeouts.set(key, t);
    return undefined;
  }

  #clearTimeout(key: string): void {
    const t = this.#timeouts.get(key);
    if (t !== undefined) {
      clearTimeout(t);
      this.#timeouts.delete(key);
    }
  }

  #expired(key: string): void {
    this.#clearTimeout(key);
    this.#store.delete(key);
    void this.emit("expired", { key });

    // Re-persist after the purge. Without this, #pendingFinalize (and
    // window.name) still hold the pre-expiry shares, so the expired secret is
    // re-written to sessionStorage at pagehide and survives the next refresh.
    this.#writeShare1();
    // When the store empties, drop the persisted share B immediately rather than
    // waiting for the deferred pagehide finalize.
    if (this.#store.size === 0 && typeof window !== "undefined") {
      window.sessionStorage.removeItem(this.#storageKey);
    }
  }
}

export { join, loadFromWindowName, saveToWindowName, split } from "./utility";
