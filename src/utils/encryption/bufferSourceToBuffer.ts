import { Buffer } from "buffer";

/**
 * Normalizes a `BufferSource` (an `ArrayBuffer` or any typed-array/`DataView`
 * view) into a Node.js `Buffer`, preserving the view's byte offset and length.
 *
 * @example
 * bufferSourceToBuffer(new Uint8Array([1, 2, 3])); // <Buffer 01 02 03>
 * bufferSourceToBuffer(new Uint8Array([1, 2, 3]).buffer); // <Buffer 01 02 03>
 *
 * @throws if the argument is not an ArrayBuffer or ArrayBuffer view.
 */
const bufferSourceToBuffer = (input: BufferSource) => {
  if (input instanceof ArrayBuffer) {
    return Buffer.from(input);
  } else if (ArrayBuffer.isView(input)) {
    return Buffer.from(input.buffer, input.byteOffset, input.byteLength);
  } else {
    throw new Error("Argument is not a valid BufferSource");
  }
};

export { bufferSourceToBuffer };
