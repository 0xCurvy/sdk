declare module "*.wasm?init" {
  const init: (opts?: object, url?: string) => Promise<WebAssembly.Instance>;
  export default init;
}
