import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(root);

const { values } = parseArgs({
  options: {
    publish: { type: "boolean", default: false },
  },
});

function run(command, env = {}) {
  execSync(command, {
    stdio: "inherit",
    env: { ...process.env, ...env },
    shell: true,
  });
}

run("rimraf dist");

if (values.publish) {
  for (const format of ["esm", "cjs"]) {
    run("tsup", {
      CURVY_SDK_PUBLISH: "1",
      CURVY_SDK_FORMAT: format,
      CURVY_SDK_PASS: "js",
    });
    run("tsup", {
      CURVY_SDK_PUBLISH: "1",
      CURVY_SDK_FORMAT: format,
      CURVY_SDK_PASS: "dts",
      NODE_OPTIONS: "--max-old-space-size=8192",
    });
  }
} else {
  run("tsup", { CURVY_SDK_PASS: "js" });
  run("tsup", {
    CURVY_SDK_PASS: "dts",
    NODE_OPTIONS: "--max-old-space-size=8192",
  });
}

run("node scripts/postbuild.mjs");
