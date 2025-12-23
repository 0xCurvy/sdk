import "./wasm-exec.js";

import { buildEddsa, type Eddsa } from "circomlibjs";
import { groth16 } from "snarkjs";
import type { ICore } from "@/interfaces/core";
import type { RawAnnouncement } from "@/types/api";
import type {
  CoreLegacyKeyPairs,
  CoreScanArgs,
  CoreScanReturnType,
  CoreSendReturnType,
  CoreViewerScanArgs,
  CurvyKeyPairs,
  NoteOwnershipData,
  Signature,
} from "@/types/core";
import type { HexString, StringifyBigInts } from "@/types/helper";
import type { AuthenticatedNote } from "@/types/note";
import { Note, type PublicNote } from "@/types/note";
import { isNode } from "@/utils/helpers";
import { poseidonHash } from "@/utils/poseidon-hash";

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

class Core implements ICore {
  #wasmUrl: string | undefined;
  #coreWasmInstance: WebAssembly.Instance | null;

  // Node is Buffer, browser is string / Uint8Array
  #noteProvingWasm: string | Buffer | null;
  #noteProvingZkey: Uint8Array | Buffer | null;

  #eddsa: Eddsa | null;

  constructor(wasmUrl?: string) {
    this.#wasmUrl = wasmUrl;
    this.#coreWasmInstance = null;
    this.#eddsa = null;
    this.#noteProvingWasm = null;
    this.#noteProvingZkey = null;
  }

  async loadNoteProvingUtils(): Promise<void> {
    if (this.#noteProvingWasm && this.#noteProvingZkey) {
      return;
    }

    if (isNode) {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      const { fileURLToPath } = await import("node:url");

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const wasmPath = path.resolve(
        __dirname,
        "../../../zk-keys/staging/prod/verifyNoteOwnership/verifyNoteOwnership_10_js/verifyNoteOwnership_10.wasm",
      );
      const zkeyPath = path.resolve(
        __dirname,
        "../../../zk-keys/staging/prod/verifyNoteOwnership/keys/verifyNoteOwnership_10_0001.zkey",
      );

      this.#noteProvingWasm = await fs.readFile(wasmPath);
      this.#noteProvingZkey = await fs.readFile(zkeyPath);
    } else {
      this.#noteProvingWasm = (
        await import(
          "../../../zk-keys/staging/prod/verifyNoteOwnership/verifyNoteOwnership_10_js/verifyNoteOwnership_10.wasm?url"
        )
      ).default;

      this.#noteProvingZkey = (
        await import("../../../zk-keys/staging/prod/verifyNoteOwnership/keys/verifyNoteOwnership_10_0001.zkey?url")
      ).default;
    }
  }

  async loadWasm(): Promise<void> {
    if (this.#coreWasmInstance) {
      return;
    }

    const go = new Go();

    go.importObject.gojs["runtime.wasmExit"] = (_sp: number) => {
      console.warn("wasmExit called, ignoring");
    };

    if (isNode) {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      const { fileURLToPath } = await import("node:url");

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const wasmPath = path.resolve(__dirname, "./curvy-core-v1.0.2.wasm");

      const buffer = await fs.readFile(this.#wasmUrl ?? wasmPath);
      const wasmBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;

      this.#coreWasmInstance = (await WebAssembly.instantiate(wasmBuffer, go.importObject)).instance;

      go.run(this.#coreWasmInstance);
      return;
    }

    if (this.#wasmUrl) {
      this.#coreWasmInstance = (await WebAssembly.instantiateStreaming(fetch(this.#wasmUrl), go.importObject)).instance;
    } else {
      const { default: init } = await import("./curvy-core-v1.0.2.wasm?init");
      this.#coreWasmInstance = await init(go.importObject);
    }

    go.run(this.#coreWasmInstance);
  }

  async loadEddsa(): Promise<void> {
    if (this.#eddsa) {
      return;
    }

    this.#eddsa = await buildEddsa();
  }

  async getBabyJubjubPublicKey(babyJubjubPrivateKey: string): Promise<string> {
    await this.loadEddsa();

    // @ts-expect-error
    const babyJubjubPublicKey = this.#eddsa.prv2pub(Buffer.from(babyJubjubPrivateKey, "hex"));

    return babyJubjubPublicKey.map((p) => this.#eddsa?.F.toObject(p).toString()).join(".");
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

    return new Note({
      owner: {
        babyJubjubPublicKey: {
          x: noteData.ownerBabyJubjubPublicKey.split(".")[0],
          y: noteData.ownerBabyJubjubPublicKey.split(".")[1],
        },
        sharedSecret: spendingPubKey.split(".")[0],
      },
      balance: {
        amount: noteData.amount.toString(),
        token: noteData.token.toString(),
      },
      deliveryTag: {
        ephemeralKey: R,
        viewTag: viewTag as HexString,
      },
    });
  }

  async getNoteOwnershipData(publicNotes: PublicNote[], s: string, v: string) {
    const scanResult = await this.scanNotes(
      s,
      v,
      publicNotes.map(({ deliveryTag }) => deliveryTag),
    );

    const sharedSecrets = scanResult.spendingPubKeys.map((pubKey: string) =>
      pubKey.length > 0 ? BigInt(pubKey.split(".")[0]) : null,
    );

    const { babyJubjubPublicKey: ownerBabyJubjubPublicKey } = await this.getCurvyKeys(s, v);
    const bjjKeyBigint = ownerBabyJubjubPublicKey.split(".").map(BigInt);

    const ownershipData: NoteOwnershipData[] = [];

    for (let i = 0; i < publicNotes.length; i++) {
      const sharedSecret = sharedSecrets[i];

      if (sharedSecret !== null) {
        const computedHash = poseidonHash([...bjjKeyBigint, sharedSecrets[i]!]).toString();
        if (computedHash === publicNotes[i].ownerHash) {
          ownershipData.push({
            ownerHash: publicNotes[i].ownerHash,
            sharedSecret,
          });
        }
      }
    }

    return ownershipData;
  }

  async generateNoteOwnershipProof(
    ownedNotes: {
      ownerHash: string;
      sharedSecret: bigint;
    }[],
    babyJubjubPublicKey: string,
  ) {
    const NUM_NOTES = 10;

    await this.loadNoteProvingUtils();

    if (!this.#noteProvingWasm || !this.#noteProvingZkey) {
      throw new Error("Generete note ownership proof: could not load note proving wasm or zkey!");
    }

    const paddedOwnedNotes = ownedNotes.concat(
      ...Array(NUM_NOTES - ownedNotes.length).fill({
        babyJubjubPublicKey: "0.0",
        sharedSecret: "0",
        ownerHash: "0",
      }),
    );

    const { proof, publicSignals } = await groth16.fullProve(
      {
        inputNoteOwners: paddedOwnedNotes.map(({ sharedSecret }) => [
          ...babyJubjubPublicKey.split("."),
          sharedSecret.toString(),
        ]),
        ownerHashes: paddedOwnedNotes.map(({ ownerHash }) => ownerHash),
      },
      this.#noteProvingWasm,
      this.#noteProvingZkey,
    );

    return {
      proof,
      publicSignals,
    };
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

  async unpackAuthenticatedNotes(
    s: string,
    v: string,
    notes: AuthenticatedNote[],
    babyJubjubPublicKey: [string, string],
  ): Promise<Note[]> {
    const scanResult = await this.scanNotes(
      s,
      v,
      notes.map(({ deliveryTag }) => deliveryTag),
    );

    return scanResult.spendingPubKeys.map((pubKey: string, index: number) => {
      return new Note({
        owner: {
          babyJubjubPublicKey: {
            x: babyJubjubPublicKey[0],
            y: babyJubjubPublicKey[1],
          },
          sharedSecret: pubKey.split(".")[0],
        },
        ...notes[index],
      });
    });
  }

  async signWithBabyJubjubPrivateKey(
    message: bigint,
    babyJubjubPrivateKey: string,
  ): Promise<StringifyBigInts<Signature>> {
    await this.loadEddsa();

    const privateKey = `0x${Buffer.from(babyJubjubPrivateKey, "hex").toString("hex")}`;

    const privateKeyBuffer = Buffer.from(privateKey.slice(2), "hex");
    const messageBuffer = this.#eddsa!.babyJub.F.e(message);

    const signature = this.#eddsa!.signPoseidon(privateKeyBuffer, messageBuffer);

    return {
      R8: [
        this.#eddsa!.babyJub.F.toObject(signature.R8[0]).toString(),
        this.#eddsa!.babyJub.F.toObject(signature.R8[1]).toString(),
      ],
      S: signature.S.toString(),
    };
  }

  isValidBN254Point(point: string): boolean {
    return curvy.dbg_isValidBN254Point(point);
  }

  isValidSECP256k1Point(point: string): boolean {
    return curvy.dbg_isValidSECP256k1Point(point);
  }

  prepareOwnerForSTA(sharedSecret: bigint, s: string) {
    const babyJubjubPublicKeyPoints = this.#eddsa!.prv2pub(Buffer.from(s, "hex"));
    const babyJubjubPublicKey = babyJubjubPublicKeyPoints.map((p) => this.#eddsa!.F.toObject(p).toString()).join(".");

    const owner = {
      babyJubjubPublicKey: {
        x: BigInt(babyJubjubPublicKey.split(".")[0]),
        y: BigInt(babyJubjubPublicKey.split(".")[1]),
      },
      sharedSecret,
    };

    return { ownerHash: Note.generateOwnerHash(owner).toString(), babyJubjubPublicKey };
  }

  version(): string {
    return curvy.version();
  }
}

export { Core };
