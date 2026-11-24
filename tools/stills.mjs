// usage: node stills.mjs <outDir> "5,40,..." [scale=0.5]
// Bundles src/iceking once, opens one browser (GPU ANGLE) and renders the listed frames as JPEGs.
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition, openBrowser } from "@remotion/renderer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const [, , out, list, scale = "0.5"] = process.argv;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const serveUrl = await bundle({ entryPoint: path.join(root, "src/iceking/index.ts"), publicDir: path.join(root, "public") });
const chromiumOptions = { gl: process.env.GL || "angle" };
const browser = await openBrowser("chrome", { chromiumOptions });
const composition = await selectComposition({ serveUrl, id: "IceKing", puppeteerInstance: browser, chromiumOptions });
fs.mkdirSync(out, { recursive: true });
for (const f of list.split(",").map(Number)) {
  const t = Date.now();
  await renderStill({ composition, serveUrl, frame: f, output: path.join(out, `f${String(f).padStart(4, "0")}.jpg`), imageFormat: "jpeg", jpegQuality: 90,
    scale: Number(scale), puppeteerInstance: browser, chromiumOptions, timeoutInMilliseconds: 120000,
    onBrowserLog: (l) => { if (l.type === "error" || /error|warn/i.test(l.text)) console.log("[browser]", l.type, l.text.slice(0, 300)); } });
  console.log("still", f, Date.now() - t, "ms");
}
await browser.close({ silent: true });
