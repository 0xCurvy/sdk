import type {
  CoreAdapter,
  CoreScanReturnType,
  CurvyKeyPairs,
  NoteDeliveryTag,
  RawAnnouncement,
  SendNoteData,
  Signature,
} from "@/core/types";
import { Note } from "@/note";
import type { HexString, StringifyBigInts } from "@/types/helper";
import { type CoreWasmSource, initCore, pubFromPrivateKey, sign, stealthCore } from "./rustCore";

export type CreateCoreAdapterParameters = {
  wasmUrl?: string;
  wasmModule?: WebAssembly.Module;
};

function normalizeSpendPrivateKey(privateKey: string): HexString {
  const hex = privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey;
  if (hex.length > 64 || (hex.length > 0 && !/^[0-9a-fA-F]+$/.test(hex))) {
    throw new Error(`Unexpected spend private key shape: "${privateKey}"`);
  }
  return `0x${hex.padStart(64, "0")}` as HexString;
}

/** Create the object-shaped crypto adapter consumed by SDK actions. */
export function createCoreAdapter(parameters: CreateCoreAdapterParameters = {}): CoreAdapter {
  const source: CoreWasmSource | undefined = parameters.wasmModule
    ? { module: parameters.wasmModule }
    : parameters.wasmUrl
      ? { url: parameters.wasmUrl }
      : undefined;

  const ensureReady = () => initCore(source);

  const babyJubjubPublicKey = async (privateKey: string): Promise<string> => {
    await ensureReady();
    const [x, y] = pubFromPrivateKey(privateKey);
    return `${x}.${y}`;
  };

  const toCurvyKeyPairs = async (meta: { k: string; v: string; K: string; V: string }): Promise<CurvyKeyPairs> => ({
    s: meta.k,
    v: meta.v,
    S: meta.K,
    V: meta.V,
    babyJubjubPublicKey: await babyJubjubPublicKey(meta.k),
  });

  const send = async (S: string, V: string) => {
    await ensureReady();
    return stealthCore.send(S, V);
  };

  const runScan = async (s: string, v: string, Rs: string[], viewTags: string[]): Promise<CoreScanReturnType> => {
    await ensureReady();

    // Preserve input/result alignment; unmatched announcements remain empty.
    const spendingPubKeys = Array.from({ length: Rs.length }, () => "");
    const spendingPrivKeys = Array.from({ length: Rs.length }, () => normalizeSpendPrivateKey(""));
    for (const match of stealthCore.scan(s, v, Rs, viewTags)) {
      spendingPubKeys[match.index] = match.spendingPubKey;
      spendingPrivKeys[match.index] = normalizeSpendPrivateKey(match.spendingPrivKey);
    }
    return { spendingPubKeys, spendingPrivKeys };
  };

  return {
    async generateKeyPairs() {
      await ensureReady();
      return toCurvyKeyPairs(stealthCore.new_meta());
    },
    async getCurvyKeys(s, v) {
      await ensureReady();
      return toCurvyKeyPairs(stealthCore.get_meta(s, v));
    },
    send,
    async sendNote(S: string, V: string, noteData: SendNoteData): Promise<Note> {
      let { R, viewTag, spendingPubKey } = await send(S, V);
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
    },
    getBabyJubjubPublicKey: babyJubjubPublicKey,
    async signWithBabyJubjubPrivateKey(message: bigint, privateKey: string): Promise<StringifyBigInts<Signature>> {
      await ensureReady();
      const signature = sign(message, privateKey);
      return {
        R8: [signature.R8[0].toString(), signature.R8[1].toString()],
        S: signature.S.toString(),
      };
    },
    scan(s: string, v: string, announcements: RawAnnouncement[]) {
      return runScan(
        s,
        v,
        announcements.map((announcement) => announcement.ephemeralPublicKey),
        announcements.map((announcement) => announcement.viewTag),
      );
    },
    scanNotes(s: string, v: string, notes: NoteDeliveryTag[]) {
      return runScan(
        s,
        v,
        notes.map((note) => note.ephemeralKey),
        notes.map((note) => note.viewTag),
      );
    },
    async viewerScan(v: string, S: string, announcements: RawAnnouncement[]) {
      await ensureReady();
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
    },
    isValidBN254Point: (point) => stealthCore.dbg_isValidBN254Point(point),
    isValidSECP256k1Point: (point) => stealthCore.dbg_isValidSECP256k1Point(point),
    version: () => stealthCore.version(),
  };
}
