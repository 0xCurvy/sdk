import { derivePublicKey, signMessage } from "@zk-kit/eddsa-poseidon";
import { Buffer } from "buffer";
import type { ICore, RawAnnouncement } from "@/interfaces/core";
import { Note } from "@/note";
import type {
  CoreLegacyKeyPairs,
  CoreScanArgs,
  CoreScanReturnType,
  CoreSendReturnType,
  CoreViewerScanArgs,
  CurvyKeyPairs,
  Signature,
} from "@/types/core";
import type { HexString, StringifyBigInts } from "@/types/helper";

import { isNode } from "@/utils/common";
import { type LazySingleton, lazySingleton } from "@/utils/promise";

declare const Go: {
  new (): {
    argv: string[];
    env: { [key: string]: string };
    exit: (code: number) => void;
    importObject: WebAssembly.Imports;
    exited: boolean;
    mem: DataView;
    run(instance: WebAssembly.Instance): void;
  };
};

declare const curvy: {
  send: (args: string) => string;
  scan: (args: string) => string;
  viewerScan: (args: string) => string;
  new_meta: () => string;
  get_meta: (args: string) => string;
  dbg_isValidBN254Point: (args: string) => boolean;
  dbg_isValidSECP256k1Point: (args: string) => boolean;
  version: () => string;
};

// Asset paths relative to the *compiled* module. tsup injects per-format string
// literals via `define` (see tsup.config.ts): "../assets/…" for the ESM chunk at
// dist/_esm/, "../../assets/…" for a dist/_cjs/<group>/index entry.
//
// The browser branch passes these as BARE identifiers to `new URL(x,
// import.meta.url)` — they MUST resolve to a string literal at that call site so
// Vite/webpack/Rollup can statically detect, emit, and rewrite the asset. A
// template like `new URL(`${base}/file.wasm`, …)` defeats that static analysis,
// so the full per-asset path is injected as one literal each.
declare const __CURVY_CORE_WASM_URL__: string;

// Node resolves from disk at runtime, so a computed path is fine here. The base
// is injected too, with a dev fallback (from src/core/) for vitest/ts-node where
// no define is present and the browser literals above are absent.
declare const __CURVY_ASSETS_REL__: string | undefined;
const NODE_ASSETS_DIR = typeof __CURVY_ASSETS_REL__ === "string" ? __CURVY_ASSETS_REL__ : "../../assets";
const NODE_CORE_WASM = `${NODE_ASSETS_DIR}/core/curvy-core-v1.0.2.wasm`;

class Core implements ICore {
  #wasmUrl: string | undefined;
  #wasmModule: WebAssembly.Module | null;

  // Each resource is loaded at most once and shared across concurrent callers
  // (the `lazySingleton` caches the in-flight promise), so two parallel crypto
  // calls can no longer race into duplicate `go.run()` / re-instantiation.
  #wasm: LazySingleton<WebAssembly.Instance>;

  constructor(wasmUrl?: string, wasmModule?: WebAssembly.Module) {
    this.#wasmUrl = wasmUrl;
    this.#wasmModule = wasmModule ?? null;

    this.#wasm = lazySingleton(() => this.#initWasm());
  }

  /**
   * Drop all cached WASM / asset instances so the next use re-initializes them.
   * Use to recover after a WASM crash (e.g. inside an MV3 service worker that
   * was torn down mid-operation).
   */
  reset(): void {
    this.#wasm.reset();
  }

  /**
   * Eagerly initialize the core WASM module. Idempotent and race-safe — call to
   * pre-warm during a loading screen; crypto methods load it on demand anyway.
   */
  async loadWasm(): Promise<void> {
    await this.#wasm();
  }

  async #initWasm(): Promise<WebAssembly.Instance> {
    // Install globalThis.Go on demand. A *dynamic* import (rather than a
    // top-level side-effect import) guarantees the Go runtime survives consumer
    // tree-shaking: bundlers hoist a bare `import "./wasm-exec.js"` into a hashed
    // chunk that the package.json `sideEffects` glob can't match, then drop it as
    // pure. A dynamic import in this reachable path is never tree-shaken.
    await import("./wasm-exec.js");
    const go = new Go();

    go.importObject.gojs["runtime.wasmExit"] = (_sp: number) => {
      console.warn("wasmExit called, ignoring");
    };

    // Pre-compiled module (e.g. supplied by an MV3 extension to avoid a remote
    // fetch). Platform-agnostic: works in both Node and the browser.
    if (this.#wasmModule) {
      const instance = await WebAssembly.instantiate(this.#wasmModule, go.importObject);
      go.run(instance);
      return instance;
    }

    if (isNode) {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      const { fileURLToPath } = await import("node:url");

      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const wasmPath = path.resolve(__dirname, NODE_CORE_WASM);

      const buffer = await fs.readFile(this.#wasmUrl ?? wasmPath);
      const wasmBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;

      const instance = (await WebAssembly.instantiate(wasmBuffer, go.importObject)).instance;
      go.run(instance);
      return instance;
    }

    // Browser: resolve the bundled core WASM relative to this module unless the
    // caller supplied an explicit URL. Plain fetch + instantiate (not
    // instantiateStreaming) avoids MIME-type pitfalls when the asset is served
    // as application/octet-stream.
    const wasmUrl = this.#wasmUrl ?? new URL(__CURVY_CORE_WASM_URL__, import.meta.url).href;
    const wasmBuffer = await (await fetch(wasmUrl)).arrayBuffer();
    const instance = (await WebAssembly.instantiate(wasmBuffer, go.importObject)).instance;
    go.run(instance);
    return instance;
  }

  async getBabyJubjubPublicKey(babyJubjubPrivateKey: string): Promise<string> {
    const [x, y] = derivePublicKey(Buffer.from(babyJubjubPrivateKey, "hex"));

    return `${x.toString()}.${y.toString()}`;
  }

  #extractScanArgsFromAnnouncements(announcements: RawAnnouncement[]) {
    const Rs: Array<string> = [];
    const viewTags: Array<string> = [];

    for (const announcement of announcements) {
      Rs.push(announcement.ephemeralPublicKey);
      viewTags.push(announcement.viewTag);
    }

    return { Rs, viewTags };
  }

  #prepareScanArgs(s: string, v: string, announcements: RawAnnouncement[]): CoreScanArgs {
    const { viewTags, Rs } = this.#extractScanArgsFromAnnouncements(announcements);

    return {
      k: s,
      v,
      Rs,
      viewTags,
    } satisfies CoreScanArgs;
  }

  #prepareScanNotesArgs(s: string, v: string, noteData: { ephemeralKey: string; viewTag: string }[]): CoreScanArgs {
    return {
      k: s,
      v,
      Rs: noteData.map((note) => note.ephemeralKey),
      viewTags: noteData.map((note) => note.viewTag),
    } satisfies CoreScanArgs;
  }

  #prepareViewerScanArgs(v: string, S: string, announcements: RawAnnouncement[]): CoreViewerScanArgs {
    const { viewTags, Rs } = this.#extractScanArgsFromAnnouncements(announcements);

    return {
      v,
      K: S,
      Rs,
      viewTags,
    } satisfies CoreViewerScanArgs;
  }

  async generateKeyPairs(): Promise<CurvyKeyPairs> {
    await this.loadWasm();

    const keyPairs = JSON.parse(curvy.new_meta()) as CoreLegacyKeyPairs;

    const babyJubjubPublicKeyStringified = await this.getBabyJubjubPublicKey(keyPairs.k);

    return {
      s: keyPairs.k,
      S: keyPairs.K,
      v: keyPairs.v,
      V: keyPairs.V,
      babyJubjubPublicKey: babyJubjubPublicKeyStringified,
    };
  }

  async getCurvyKeys(s: string, v: string): Promise<CurvyKeyPairs> {
    await this.loadWasm();

    const inputs = JSON.stringify({ k: s, v });
    const result = JSON.parse(curvy.get_meta(inputs)) as CoreLegacyKeyPairs;

    const babyJubjubPublicKey = await this.getBabyJubjubPublicKey(result.k);

    return {
      s: result.k,
      v: result.v,
      S: result.K,
      V: result.V,
      babyJubjubPublicKey,
    } satisfies CurvyKeyPairs;
  }

  async send(S: string, V: string) {
    await this.loadWasm();

    const input = JSON.stringify({ K: S, V });

    return JSON.parse(curvy.send(input)) as CoreSendReturnType;
  }

  async sendNote(
    S: string,
    V: string,
    noteData: { ownerBabyJubjubPublicKey: string; amount: bigint; token: bigint },
  ): Promise<Note> {
    let { R, viewTag, spendingPubKey } = await this.send(S, V);

    if (!viewTag.startsWith("0x")) {
      viewTag = `0x${viewTag}`;
    }

    // core.send returns the owner key, ephemeral R and shared secret as "x.y"
    // decimal-point strings; parse them into the note's bigint domain. R is the
    // ephemeral PUBLIC point [x, y]; sharedSecret is the x-coord of the ECDH
    // spending pubkey — derived coherently with R so the recipient can discover.
    const [ownerX, ownerY] = noteData.ownerBabyJubjubPublicKey.split(".");
    const [rX, rY] = R.split(".");

    return new Note({
      amount: noteData.amount,
      token: noteData.token,
      owner: {
        babyJubjubPublicKey: { x: BigInt(ownerX), y: BigInt(ownerY) },
        sharedSecret: BigInt(spendingPubKey.split(".")[0]),
      },
      ephemeralKey: [BigInt(rX), BigInt(rY)],
      viewTag: BigInt(viewTag),
    });
  }

  async scan(s: string, v: string, announcements: RawAnnouncement[]) {
    await this.loadWasm();

    const input = JSON.stringify(this.#prepareScanArgs(s, v, announcements));

    const { spendingPubKeys, spendingPrivKeys } = JSON.parse(curvy.scan(input)) as CoreScanReturnType;

    return {
      spendingPubKeys: spendingPubKeys ?? [],
      spendingPrivKeys: (spendingPrivKeys ?? []).map(
        (pk) => `0x${pk.slice(2).padStart(64, "0")}` as const satisfies HexString,
      ),
    };
  }

  async scanNotes(s: string, v: string, noteData: { ephemeralKey: string; viewTag: string }[]) {
    await this.loadWasm();

    const input = JSON.stringify(this.#prepareScanNotesArgs(s, v, noteData));

    const { spendingPubKeys, spendingPrivKeys } = JSON.parse(curvy.scan(input)) as CoreScanReturnType;

    return {
      spendingPubKeys: spendingPubKeys ?? [],
      spendingPrivKeys: (spendingPrivKeys ?? []).map(
        (pk) => `0x${pk.slice(2).padStart(64, "0")}` as const satisfies HexString,
      ),
    };
  }

  async viewerScan(v: string, S: string, announcements: RawAnnouncement[]) {
    await this.loadWasm();

    const input = JSON.stringify(this.#prepareViewerScanArgs(v, S, announcements));

    const { spendingPubKeys } = JSON.parse(curvy.scan(input)) as CoreScanReturnType;

    return {
      spendingPubKeys: spendingPubKeys ?? [],
    };
  }

  async signWithBabyJubjubPrivateKey(
    message: bigint,
    babyJubjubPrivateKey: string,
  ): Promise<StringifyBigInts<Signature>> {
    const signature = signMessage(Buffer.from(babyJubjubPrivateKey, "hex"), message);

    return {
      R8: [signature.R8[0].toString(), signature.R8[1].toString()],
      S: signature.S.toString(),
    };
  }

  isValidBN254Point(point: string): boolean {
    return curvy.dbg_isValidBN254Point(point);
  }

  isValidSECP256k1Point(point: string): boolean {
    return curvy.dbg_isValidSECP256k1Point(point);
  }

  version(): string {
    return curvy.version();
  }
}

export { Core };
