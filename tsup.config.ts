import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    devtools: "src/features/devtools.ts",
    panel: "src/features/panel.ts",
    background: "src/background.ts",
    content: "src/content/elementPicker.ts",
    reactRuntimeHook: "src/content/reactRuntimeHook.ts",
    pageAgent: "src/content/pageAgent.ts",
  },
  format: ["iife"],
  platform: "browser",
  outDir: "dist",
  splitting: false,
  sourcemap: true,
  clean: true,
  noExternal: [/.*/],
  esbuildOptions(options) {
    options.define = {
      ...(options.define ?? {}),
      "process.env.NODE_ENV": JSON.stringify("production"),
    };
  },
});
