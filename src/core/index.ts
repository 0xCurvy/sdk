import type { ICore, NoteDeliveryTag, RawAnnouncement, SendNoteData } from "@/interfaces/core";
import { Note } from "@/note";
import {
  type CoreWasmSource,
  initCore as initRustCore,
  pubFromPrivateKey,
  sign,
  stealthCore,
} from "@/proving/rustCore";
import type { CoreScanReturnType, CurvyKeyPairs, Signature } from "@/types/core";
import type { HexString, StringifyBigInts } from "@/types/helper";

/** ICore compatibility adapter over the shared Rust/WASM crypto module. */
class Core implements ICore {
  readonly #source: CoreWasmSource | undefined;

  constructor(wasmUrl?: string, wasmModule?: WebAssembly.Module) {
    this.#source = wasmModule ? { module: wasmModule } : wasmUrl ? { url: wasmUrl } : undefined;
  }

  /** The Rust module is immutable and shared per realm, so there is no instance cache to reset. */
  reset(): void {}

  /** Eagerly initialize the shared Rust module. Calls are idempotent and race-safe. */
  async loadWasm(): Promise<void> {
    await initRustCore(this.#source);
  }

  #normalizeSpendPrivKey(privateKey: string): HexString {
    const hex = privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey;
    if (hex.length > 64 || (hex.length > 0 && !/^[0-9a-fA-F]+$/.test(hex))) {
      throw new Error(`Core: unexpected spend private key shape: "${privateKey}"`);
    }
    return `0x${hex.padStart(64, "0")}` as HexString;
  }

  async getBabyJubjubPublicKey(babyJubjubPrivateKey: string): Promise<string> {
    await this.loadWasm();
    const [x, y] = pubFromPrivateKey(babyJubjubPrivateKey);
    return `${x}.${y}`;
  }

  async #toCurvyKeyPairs(meta: { k: string; v: string; K: string; V: string }): Promise<CurvyKeyPairs> {
    return {
      s: meta.k,
      v: meta.v,
      S: meta.K,
      V: meta.V,
      babyJubjubPublicKey: await this.getBabyJubjubPublicKey(meta.k),
    };
  }

  async generateKeyPairs(): Promise<CurvyKeyPairs> {
    await this.loadWasm();
    return this.#toCurvyKeyPairs(stealthCore.new_meta());
  }

  async getCurvyKeys(s: string, v: string): Promise<CurvyKeyPairs> {
    await this.loadWasm();
    return this.#toCurvyKeyPairs(stealthCore.get_meta(s, v));
  }

  async send(S: string, V: string) {
    await this.loadWasm();
    return stealthCore.send(S, V);
  }

  async sendNote(S: string, V: string, noteData: SendNoteData): Promise<Note> {
    let { R, viewTag, spendingPubKey } = await this.send(S, V);
    if (!viewTag.startsWith("0x")) viewTag = `0x${viewTag}`;

    const [ownerX, ownerY] = noteData.ownerBabyJubjubPublicKey.split(".");
    const [ephemeralX, ephemeralY] = R.split(".");
    return new Note({
      amount: noteData.amount,
      token: noteData.token,
      owner: {
        babyJubjubPublicKey: { x: BigInt(ownerX), y: BigInt(ownerY) },
        sharedSecret: BigInt(spendingPubKey.split(".")[0]),
      },
      ephemeralKey: [BigInt(ephemeralX), BigInt(ephemeralY)],
      viewTag: BigInt(viewTag),
    });
  }

  async #runScan(s: string, v: string, Rs: string[], viewTags: string[]): Promise<CoreScanReturnType> {
    await this.loadWasm();

    // Rust returns sparse candidates; preserve ICore's legacy index-aligned
    // arrays until its callers migrate to an explicit candidate shape.
    const spendingPubKeys = Array.from({ length: Rs.length }, () => "");
    const spendingPrivKeys = Array.from({ length: Rs.length }, () => this.#normalizeSpendPrivKey(""));
    for (const match of stealthCore.scan(s, v, Rs, viewTags)) {
      spendingPubKeys[match.index] = match.spendingPubKey;
      spendingPrivKeys[match.index] = this.#normalizeSpendPrivKey(match.spendingPrivKey);
    }
    return { spendingPubKeys, spendingPrivKeys };
  }

  async scan(s: string, v: string, announcements: RawAnnouncement[]): Promise<CoreScanReturnType> {
    return this.#runScan(
      s,
      v,
      announcements.map((announcement) => announcement.ephemeralPublicKey),
      announcements.map((announcement) => announcement.viewTag),
    );
  }

  async scanNotes(s: string, v: string, noteData: NoteDeliveryTag[]): Promise<CoreScanReturnType> {
    return this.#runScan(
      s,
      v,
      noteData.map((note) => note.ephemeralKey),
      noteData.map((note) => note.viewTag),
    );
  }

  async viewerScan(v: string, S: string, announcements: RawAnnouncement[]) {
    await this.loadWasm();
    const spendingPubKeys = Array.from({ length: announcements.length }, () => "");
    for (const match of stealthCore.viewerScan(
      v,
      S,
      announcements.map((announcement) => announcement.ephemeralPublicKey),
      announcements.map((announcement) => announcement.viewTag),
    )) {
      spendingPubKeys[match.index] = match.spendingPubKey;
    }
    return { spendingPubKeys };
  }

  async signWithBabyJubjubPrivateKey(
    message: bigint,
    babyJubjubPrivateKey: string,
  ): Promise<StringifyBigInts<Signature>> {
    await this.loadWasm();
    const signature = sign(message, babyJubjubPrivateKey);
    return {
      R8: [signature.R8[0].toString(), signature.R8[1].toString()],
      S: signature.S.toString(),
    };
  }

  isValidBN254Point(point: string): boolean {
    return stealthCore.dbg_isValidBN254Point(point);
  }

  isValidSECP256k1Point(point: string): boolean {
    return stealthCore.dbg_isValidSECP256k1Point(point);
  }

  version(): string {
    return stealthCore.version();
  }
}

export { Core };
