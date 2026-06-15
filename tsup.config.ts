import { defineConfig } from "tsup";

export default defineConfig([
  {
    // CLI — bundled into a self-contained CJS file. Shipped with the plugin and
    // must run with NO node_modules present. CJS is required (not ESM) because
    // bundling transitive CJS deps that use dynamic require() breaks esbuild's
    // ESM shim ("Dynamic require of 'events' is not supported").
    entry: ["src/cli.ts"],
    format: ["cjs"],
    noExternal: [/.+/],
    dts: false,
    clean: true,
    sourcemap: false,
    target: "node20",
    splitting: false,
  },
  {
    // SDK library — deps stay external (build-from-source use with node_modules).
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    clean: false, // preserve the CLI output from the config above
    sourcemap: false,
    target: "node20",
    splitting: false,
  },
]);
