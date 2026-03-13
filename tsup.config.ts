import { defineConfig, type Options } from "tsup";

export default defineConfig((_) => {
  const baseConfig: Options = {
    entry: ["./src/index.ts"],
    format: ["esm"],
    target: "es2024",
    platform: "neutral",
    treeshake: "recommended",
    sourcemap: true,
    minify: true,
    esbuildOptions: (options) => {
      options.assetNames = "[name]";
      options.loader = {
        ".wasm": "copy",
        ".zkey": "copy",
      };
    },
  };

  return [
    { ...baseConfig, dts: false, clean: true, outDir: "dist/_esm" },
    {
      ...baseConfig,
      dts: { only: true },
      clean: false,
      outDir: "dist/_types",
      esbuildOptions: undefined,
    },
  ];
});
