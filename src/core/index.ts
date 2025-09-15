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

async function loadWasm(wasmUrl?: string): Promise<void> {
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

    const buffer = await fs.readFile(wasmUrl ?? wasmPath);
    const wasmBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;

    const instance = (await WebAssembly.instantiate(wasmBuffer, go.importObject)).instance;

    go.run(instance);
    return;
  }

  let instance: WebAssembly.Instance;
  if (wasmUrl) {
    instance = (await WebAssembly.instantiateStreaming(fetch(wasmUrl), go.importObject)).instance;
  } else {
    const { default: init } = await import("./curvy-core-v1.0.2.wasm?init");
    instance = await init(go.importObject);
  }
  go.run(instance);
}

class Core implements ICore {
  #eddsa: Eddsa | null = null;

  static async init(wasmUrl?: string): Promise<Core> {
    await loadWasm(wasmUrl);

    const core = new Core();

    core.#eddsa = await buildEddsa();
    return core;
  }

  #getBabyJubjubPublicKey(keyPairs: CoreLegacyKeyPairs): string {
    // @ts-expect-error
    const babyJubjubPublicKey = this.#eddsa.prv2pub(Buffer.from(keyPairs.k, "hex"));

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

  generateKeyPairs(): CurvyKeyPairs {
    const keyPairs = JSON.parse(curvy.new_meta()) as CoreLegacyKeyPairs;

    const babyJubjubPublicKeyStringified = this.#getBabyJubjubPublicKey(keyPairs);

    return {
      s: keyPairs.k,
      S: keyPairs.K,
      v: keyPairs.v,
      V: keyPairs.V,
      babyJubjubPublicKey: babyJubjubPublicKeyStringified,
    };
  }

  getCurvyKeys(s: string, v: string): CurvyKeyPairs {
    const inputs = JSON.stringify({ k: s, v });
    const result = JSON.parse(curvy.get_meta(inputs)) as CoreLegacyKeyPairs;

    const babyJubjubPublicKey = this.#getBabyJubjubPublicKey(result);

    return {
      s: result.k,
      v: result.v,
      S: result.K,
      V: result.V,
      babyJubjubPublicKey,
    } satisfies CurvyKeyPairs;
  }

  send(S: string, V: string) {
    const input = JSON.stringify({ K: S, V });

    return JSON.parse(curvy.send(input)) as CoreSendReturnType;
  }

  sendNote(S: string, V: string, noteData: { ownerBabyJubjubPublicKey: string; amounts: bigint[]; tokenGroupId: bigint }): Note {
    const { R, viewTag, spendingPubKey } = this.send(S, V);

    console.log("NEW NOTE", R, S, V, viewTag);

    return new Note({
      owner: {
        babyJubjubPublicKey: {
          x: noteData.ownerBabyJubjubPublicKey.split(".")[0],
          y: noteData.ownerBabyJubjubPublicKey.split(".")[1],
        },
        sharedSecret: `0x${Buffer.from(spendingPubKey.split(".")[0], "hex").toString("hex")}`,
      },
      balance: {
        amounts: noteData.amounts.map(amount => amount.toString()),
        tokenGroupId: noteData.tokenGroupId.toString(),
      },
      deliveryTag: {
        ephemeralKey: R,
        viewTag: viewTag,
      },
    });
  }

  getNoteOwnershipData(publicNotes: PublicNote[], s: string, v: string) {
    const scanResult = this.scanNotes(
      s,
      v,
      publicNotes.map(({ deliveryTag }) => deliveryTag),
    );

    const sharedSecrets = scanResult.spendingPubKeys.map((pubKey: string) =>
      pubKey.length > 0 ? BigInt(`0x${Buffer.from(pubKey.split(".")[0], "hex").toString("hex")}`) : null,
    );

    const { babyJubjubPublicKey: ownerBabyJubjubPublicKey } = this.getCurvyKeys(s, v);
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

    let wasm: any;
    let zkey: any;

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

      wasm = await fs.readFile(wasmPath);
      zkey = await fs.readFile(zkeyPath);
    }

    wasm = (
      await import(
        // @ts-expect-error
        "../../../zk-keys/staging/prod/verifyNoteOwnership/verifyNoteOwnership_10_js/verifyNoteOwnership_10.wasm?url"
      )
    ).default;

    zkey = (
      await import(
        // @ts-expect-error
        "../../../zk-keys/staging/prod/verifyNoteOwnership/keys/verifyNoteOwnership_10_0001.zkey?url"
      )
    ).default;

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
      wasm,
      zkey,
    );

    return {
      proof,
      publicSignals,
    };
  }

  scan(s: string, v: string, announcements: RawAnnouncement[]) {
    const input = JSON.stringify(this.#prepareScanArgs(s, v, announcements));

    const { spendingPubKeys, spendingPrivKeys } = JSON.parse(curvy.scan(input)) as CoreScanReturnType;

    return {
      spendingPubKeys: spendingPubKeys ?? [],
      spendingPrivKeys: (spendingPrivKeys ?? []).map(
        (pk) => `0x${pk.slice(2).padStart(64, "0")}` as const satisfies HexString,
      ),
    };
  }

  scanNotes(s: string, v: string, noteData: { ephemeralKey: string; viewTag: string }[]) {
    console.log("SCAN NOTES", s, v, noteData);

    const input = JSON.stringify(this.#prepareScanNotesArgs(s, v, noteData));

    const { spendingPubKeys, spendingPrivKeys } = JSON.parse(curvy.scan(input)) as CoreScanReturnType;

    return {
      spendingPubKeys: spendingPubKeys ?? [],
      spendingPrivKeys: (spendingPrivKeys ?? []).map(
        (pk) => `0x${pk.slice(2).padStart(64, "0")}` as const satisfies HexString,
      ),
    };
  }

  viewerScan(v: string, S: string, announcements: RawAnnouncement[]) {
    const input = JSON.stringify(this.#prepareViewerScanArgs(v, S, announcements));

    const { spendingPubKeys } = JSON.parse(curvy.scan(input)) as CoreScanReturnType;

    return {
      spendingPubKeys: spendingPubKeys ?? [],
    };
  }

  unpackAuthenticatedNotes(
    s: string,
    v: string,
    notes: AuthenticatedNote[],
    babyJubjubPublicKey: [string, string],
  ): Note[] {
    const scanResult = this.scanNotes(
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
          sharedSecret: `0x${Buffer.from(pubKey.split(".")[0], "hex").toString("hex")}`,
        },
        ...notes[index],
      });
    });
  }

  signWithBabyJubjubPrivateKey(message: bigint, babyJubjubPrivateKey: string): StringifyBigInts<Signature> {
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

  version(): string {
    return curvy.version();
  }
}

export { Core };
