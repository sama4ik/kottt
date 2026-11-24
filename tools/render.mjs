// Full render of IceKing (video only, no audio track) -> out/video_noaudio.mp4
// env: FRAMES="a-b" (optional), CONC (default 3)
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const serveUrl = await bundle({ entryPoint: path.join(root, "src/iceking/index.ts"), publicDir: path.join(root, "public") });
const chromiumOptions = { gl: process.env.GL || "angle" };
const composition = await selectComposition({ serveUrl, id: "IceKing", chromiumOptions });
fs.mkdirSync("out", { recursive: true });
const fr = process.env.FRAMES ? process.env.FRAMES.split("-").map(Number) : null;
let last = -1;
const t0 = Date.now();
await renderMedia({
  composition, serveUrl, codec: "h264", crf: 14, pixelFormat: "yuv420p", outputLocation: process.env.OUT || "out/video_noaudio.mp4",
  chromiumOptions, concurrency: Number(process.env.CONC || 3), imageFormat: "jpeg", jpegQuality: 95, muted: true, frameRange: fr,
  timeoutInMilliseconds: 180000,
  onProgress: ({ renderedFrames }) => {
    const b = Math.floor(renderedFrames / 60);
    if (b !== last) { last = b; console.log(`progress ${renderedFrames}/${composition.durationInFrames} ${((Date.now() - t0) / 60000).toFixed(1)} min`); }
  },
});
console.log(`RENDER DONE ${((Date.now() - t0) / 60000).toFixed(1)} min`);
