/**
 * Concatenate multiple Uint8Array buffers into a single contiguous buffer.
 *
 * @example
 * concatBytes(new Uint8Array([1, 2]), new Uint8Array([3]));
 * // Uint8Array [1, 2, 3]
 */
export function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}
