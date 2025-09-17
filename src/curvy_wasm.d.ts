declare module "*.wasm?init" {
  const init: (opts?: object, url?: string) => Promise<WebAssembly.Instance>;
  export default init;
}

declare module "*.wasm?url" {
  const url: string;
  export default url;
}

declare module "*.zkey?url" {
  const data: Uint8Array;
  export default data;
}
