import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    format: ["cjs", "esm"],
    dts: false,
    clean: true,
    sourcemap: true,
    // No external deps — the SDK is pure fetch, zero runtime dependencies.
    platform: "neutral",
    target: "es2018",
    treeshake: true,
});
