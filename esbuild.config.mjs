import esbuild from "esbuild";
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// OBSIDIAN_VAULT берётся из окружения или из .env (не в git).
if (existsSync(".env")) process.loadEnvFile(".env");

await esbuild.build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: ["obsidian", "electron", "@codemirror/*", "@lezer/*"],
  format: "cjs",
  target: "es2018",
  logLevel: "info",
  sourcemap: false,
  minify: true,
  outfile: "target/main.js",
});

const files = ["main.js", "manifest.json", "styles.css"];
copyFileSync("styles.css", "target/styles.css");
copyFileSync("manifest.json", "target/manifest.json");

// Установка в волт: <vault>/.obsidian/plugins/<id>/. data.json (настройки) не трогаем.
const vault = process.env.OBSIDIAN_VAULT?.trim();
if (vault) {
  if (!existsSync(join(vault, ".obsidian"))) {
    console.error(`OBSIDIAN_VAULT: no .obsidian folder in ${vault}`);
    process.exit(1);
  }
  const { id } = JSON.parse(readFileSync("manifest.json", "utf8"));
  const dest = join(vault, ".obsidian", "plugins", id);
  mkdirSync(dest, { recursive: true });
  for (const f of files) copyFileSync(join("target", f), join(dest, f));
  console.log(`installed → ${dest}`);
}
