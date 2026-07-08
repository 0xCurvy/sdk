import { bytesToHex } from "@/utils/encoding";

function arrayBufferToHex(buffer: ArrayBuffer) {
  return bytesToHex(new Uint8Array(buffer));
}

export { arrayBufferToHex };
