const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function encode(message: string) {
  return textEncoder.encode(message);
}

function decode(buffer: ArrayBuffer) {
  return textDecoder.decode(buffer);
}

export { textEncoder, textDecoder, encode, decode };
