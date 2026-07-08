import { Buffer } from "buffer";
import { textEncoder } from "@/utils/common/textEncoder";

const shaDigest = async (alg: "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512", message: string): Promise<string> => {
  const hash = await crypto.subtle.digest(alg, textEncoder.encode(message));
  return Buffer.from(hash).toString("hex");
};

export { shaDigest };
