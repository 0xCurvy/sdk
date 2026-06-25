const textEncoder = new TextEncoder();

function encode(message: string) {
  return textEncoder.encode(message);
}

export { textEncoder, encode };
