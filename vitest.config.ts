import * as path from "node:path";

export default {
  test: {
    globals: true,
    // @zk-kit/eddsa-poseidon (ESM) imports blakejs (CJS) via named exports that
    // node's cjs-module-lexer can't statically detect — under vitest's default
    // node_modules externalization that throws "Named export 'blake2bFinal' not
    // found". Inlining routes it through Vite/esbuild, which interops CJS named
    // imports correctly (the production tsup bundle handles this already).
    server: {
      deps: {
        inline: ["@zk-kit/eddsa-poseidon", "blakejs"],
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
};
