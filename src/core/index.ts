import { createCoreAdapter } from "@/core/createCoreAdapter";
import { type CoreWasmSource, initCore as initRustCore } from "@/core/rustCore";
import type {
  CoreAdapter,
  CoreScanReturnType,
  CurvyKeyPairs,
  NoteDeliveryTag,
  RawAnnouncement,
  SendNoteData,
  Signature,
} from "@/core/types";
import type { Note } from "@/note";
import type { StringifyBigInts } from "@/types/helper";

export { type CreateCoreAdapterParameters, createCoreAdapter } from "@/core/createCoreAdapter";
export * from "@/core/types";

/**
 * Object-shaped adapter over the shared Rust/WASM module.
 *
 * @deprecated Use focused functions from `@0xcurvy/curvy-sdk/rust-core` for new
 * code. This adapter remains for services that still inject a `CoreAdapter`.
 */
class Core implements CoreAdapter {
  readonly #source: CoreWasmSource | undefined;
  readonly #adapter: CoreAdapter;

  constructor(wasmUrl?: string, wasmModule?: WebAssembly.Module) {
    this.#source = wasmModule ? { module: wasmModule } : wasmUrl ? { url: wasmUrl } : undefined;
    this.#adapter = createCoreAdapter({ wasmUrl, wasmModule });
  }

  /** The Rust module is immutable and shared per realm, so there is no instance cache to reset. */
  reset(): void {}

  /** Eagerly initialize the shared Rust module. Calls are idempotent and race-safe. */
  async loadWasm(): Promise<void> {
    await initRustCore(this.#source);
  }

  async getBabyJubjubPublicKey(babyJubjubPrivateKey: string): Promise<string> {
    return this.#adapter.getBabyJubjubPublicKey(babyJubjubPrivateKey);
  }

  async generateKeyPairs(): Promise<CurvyKeyPairs> {
    return this.#adapter.generateKeyPairs();
  }

  async getCurvyKeys(s: string, v: string): Promise<CurvyKeyPairs> {
    return this.#adapter.getCurvyKeys(s, v);
  }

  async send(S: string, V: string) {
    return this.#adapter.send(S, V);
  }

  async sendNote(S: string, V: string, noteData: SendNoteData): Promise<Note> {
    return this.#adapter.sendNote(S, V, noteData);
  }

  async scan(s: string, v: string, announcements: RawAnnouncement[]): Promise<CoreScanReturnType> {
    return this.#adapter.scan(s, v, announcements);
  }

  async scanNotes(s: string, v: string, noteData: NoteDeliveryTag[]): Promise<CoreScanReturnType> {
    return this.#adapter.scanNotes(s, v, noteData);
  }

  async viewerScan(v: string, S: string, announcements: RawAnnouncement[]) {
    return this.#adapter.viewerScan(v, S, announcements);
  }

  async signWithBabyJubjubPrivateKey(
    message: bigint,
    babyJubjubPrivateKey: string,
  ): Promise<StringifyBigInts<Signature>> {
    return this.#adapter.signWithBabyJubjubPrivateKey(message, babyJubjubPrivateKey);
  }

  isValidBN254Point(point: string): boolean {
    return this.#adapter.isValidBN254Point(point);
  }

  isValidSECP256k1Point(point: string): boolean {
    return this.#adapter.isValidSECP256k1Point(point);
  }

  version(): string {
    return this.#adapter.version();
  }
}

export { Core };
