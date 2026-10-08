import esbuild from "esbuild";
import { copyFileSync } from "node:fs";

await esbuild.build({
  entryPoints: ["main.ts"],
  bundle: true,
  external: ["obsidian", "electron", "@codemirror/*", "@lezer/*"],
  format: "cjs",
  target: "es2018",
  logLevel: "info",
  sourcemap: false,
  minify: true,
  outfile: "target/main.js",
});

copyFileSync("styles.css", "target/styles.css");
copyFileSync("manifest.json", "target/manifest.json");
