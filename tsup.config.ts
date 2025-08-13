import { type Options, defineConfig } from "tsup";

export default defineConfig((options) => {
  const baseConfig: Options = {
    entry: ["./src/exports/*.[jt]s"],
    format: ["esm"],
    target: "es2024",
    platform: "neutral",
    treeshake: "recommended",
    sourcemap: true,
    minify: true,
    bundle: true,
    splitting: false,
    loader: {
      ".wasm": "file",
    },
    esbuildOptions: (options) => {
      options.assetNames = "[name]";
      options.loader = {
        ".wasm": "copy",
      };
    },
  };

  return [
    { ...baseConfig, dts: false, clean: true, outDir: "dist/esm" },
    {
      ...baseConfig,
      dts: { only: true },
      clean: false,
      outDir: "dist/types",
      esbuildOptions: undefined,
    },
  ];
});
