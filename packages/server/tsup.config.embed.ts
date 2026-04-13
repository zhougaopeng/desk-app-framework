import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: false,
  clean: true,
  target: "node22",
  splitting: true,
  tsconfig: "tsconfig.tsup.json",
});
