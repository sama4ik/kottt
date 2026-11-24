// Ice King cast: outfits, 2D props drawn into the character cards, effect cards, blinks and idle motion.
import { Pen, bodyFront, Outfit, Expr, INK, FrontOpts, townsfolk } from "./toon";
import { Put, V3 } from "./engine";

type P2 = [number, number];
export const SU = 0.00216; // metres per design unit (1000 units = 2.16 m card)
export const q = (x: number, s: number) => Math.round(x / s) * s;
const frac = (x: number) => x - Math.floor(x);
const hash = (n: number) => frac(Math.sin(n * 12.9898) * 43758.5453);
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const t = clamp01(x); return t * t * t * (t * (t * 6 - 15) + 10); };
export const easeOut = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
export const backOut = (x: number, s = 1.7) => { const t = clamp01(x) - 1; return 1 + t * t * ((s + 1) * t + s); };

// ---------------- outfits ----------------
export const TUDOR: Outfit = { jacket: "#2c3e6b", pants: "#3a3a48", boots: INK, hat: "tophat", buttons: "#e8c45a", moustache: "#5a3b2a", skin: "#ffe2c2" };
const ISK = ["#c99067", "#a8704a", "#8a5a3c", "#b87d55", "#9c6542"];
export const islander = (v: number): Outfit => {
  const o: Outfit = { jacket: ["#f4e9d2", "#e9a23b", "#4fb3a0", "#e46a5a", "#f2d04a", "#7fc06a"][v % 6], pants: ["#3b5b9a", "#e8e0c8", "#6a4a3a"][v % 3],
    boots: "#6a4a3a", hat: "hair", hair: "#2a1a14", skin: ISK[v % 5] };
  return v % 3 === 1 ? { ...o, dress: ["#e46a5a", "#4fb3a0", "#f2d04a"][v % 3] } : o;
};
export const sailor = (v: number): Outfit => ({ jacket: v ? "#6a3a2a" : "#2f4f6f", pants: v ? "#3a3a48" : "#e8e4d8", boots: INK, hat: "cap", cap: v ? "#2f3f5f" : "#a8323a", moustache: v ? "#3a2a20" : undefined, skin: v ? "#f5c9a0" : "#ffe2c2" });
export const BARTENDER: Outfit = { jacket: "#f4f1ea", pants: "#3a3a48", boots: "#4a3426", hat: "hair", hair: "#2a1a14", sash: "#c0353a", skin: "#a8704a", moustache: "#2a1a14" };
export const indian = (v: number): Outfit => {
  const o: Outfit = { jacket: ["#f4f1ea", "#f0a030", "#d9573a", "#3f8fb5", "#7b5ac9", "#e8c45a"][v % 6], pants: "#f4f1ea", boots: "#6a4a3a", hat: "hair", hair: "#1a1214", skin: ["#a8704a", "#8a5a3c", "#c99067"][v % 3] };
  return v % 2 ? { ...o, dress: ["#d9573a", "#3f8fb5", "#f0a030"][v % 3] } : o;
};
export { townsfolk };

// ---------------- 2D props (design units, inside the character card) ----------------
export const ice2D = (p: Pen, cx: number, cy: number, s: number, rot = 0) => {
  const c = Math.cos(rot), sn = Math.sin(rot);
  const R = (x: number, y: number): P2 => [cx + x * c - y * sn, cy + x * sn + y * c];
  // a chunky block seen from slightly above: front face, lit top, shaded side (reads as a cube, not a pane)
  const d = s * 0.5, dy = d * 0.75, t = -0.75 * s, b = 0.8 * s, ol = Math.max(5, s * 0.1);
  p.poly([R(s, t), R(s + d, t - dy), R(s + d, b - dy), R(s, b)], "#86c9e0", ol);
  p.poly([R(-s, t), R(s, t), R(s + d, t - dy), R(-s + d, t - dy)], "#eefcff", ol);
  p.poly([R(-s, t), R(s, t), R(s, b), R(-s, b)], "#b6e6f5", ol);
  p.stroke([R(-s * 0.62, b * 0.55), R(-s * 0.1, t * 0.45)], s * 0.17, "#ffffff");
  p.stroke([R(-s * 0.35, b * 0.85), R(s * 0.05, b * 0.25)], s * 0.09, "#ffffff");
  p.stroke([R(s * 0.35, t * 0.3), R(s * 0.55, b * 0.15), R(s * 0.4, b * 0.6)], s * 0.05, "#6fb8d2");
  p.stroke([R(-s * 0.5, t - dy * 0.5), R(s * 0.2, t - dy * 0.5)], s * 0.06, "#ffffff");
};
export const paper2D = (p: Pen, hands: P2[], shake = 0) => {
  const a = hands[0], b = hands[hands.length - 1], x0 = Math.min(a[0], b[0]) - 30, x1 = Math.max(a[0], b[0]) + 30, y = (a[1] + b[1]) / 2;
  const d = shake * 6;
  p.poly([[x0, y - 95 + d], [x1, y - 100 - d], [x1 + 4, y + 40 - d], [x0 - 4, y + 44 + d]], "#efe8d4", 9);
  p.g.fillStyle = "#3a3540"; p.g.fillRect(x0 + 14, y - 82, x1 - x0 - 28, 16);            // masthead bar (no letters)
  p.g.fillStyle = "#9a948a";
  for (let i = 0; i < 6; i++) { p.g.fillRect(x0 + 14, y - 56 + i * 15, (x1 - x0) * 0.42, 6); p.g.fillRect(x0 + (x1 - x0) * 0.54, y - 56 + i * 15, (x1 - x0) * 0.36, 6); }
  p.stroke([[(x0 + x1) / 2, y - 92], [(x0 + x1) / 2, y + 40]], 3, "#b8b0a0");
};
/** tumbler held at (x, y) = hand; ice = cube y-offset (null = no cube) */
export const glass2D = (p: Pen, x: number, y: number, s: number, iceY: number | null, drink = "#e8a04a") => {
  const w0 = 0.36 * s, w1 = 0.44 * s, h = 1.15 * s, top = y - 0.75 * h, bot = y + 0.25 * h;
  p.poly([[x - w0, bot], [x + w0, bot], [x + w1 * 0.92, top + 0.3 * h], [x - w1 * 0.92, top + 0.3 * h]], drink, 0);
  if (iceY !== null) ice2D(p, x, Math.max(iceY, top + 0.42 * h), 0.26 * s, 0.25);
  p.poly([[x - w0, bot], [x + w0, bot], [x + w1, top], [x - w1, top]], null, 7);
  p.stroke([[x - w1 * 0.6, top + 0.15 * h], [x - w0 * 0.6, bot - 0.15 * h]], 0.07 * s, "#ffffff");
  p.dot(x, y, 0.13 * s); // the fingers
};
export const cup2D = (p: Pen, x: number, y: number, s: number, t: number) => {
  p.poly([[x - 0.4 * s, y - 0.5 * s], [x + 0.4 * s, y - 0.5 * s], [x + 0.32 * s, y + 0.3 * s], [x - 0.32 * s, y + 0.3 * s]], "#8a5a3c", 7);
  p.ell(x, y - 0.5 * s, 0.4 * s, 0.1 * s, "#6b3f22", 5);
  for (let i = 0; i < 3; i++) { // steam: three wavy rising strands
    const ph = frac(t * 0.6 + i / 3), yy = y - 0.6 * s - ph * 1.6 * s, pts: P2[] = [];
    for (let k = 0; k <= 6; k++) pts.push([x + (i - 1) * 0.22 * s + 0.09 * s * Math.sin(k * 1.1 + t * 4 + i), yy - k * 0.12 * s]);
    if (ph < 0.85) p.stroke(pts, 0.07 * s * (1 - ph), "#ffffff");
  }
  p.dot(x - 0.42 * s, y - 0.1 * s, 0.12 * s);
};
export const crown2D = (p: Pen, cx: number, by: number, w: number) => {
  const h = w * 0.62, pts: P2[] = [[cx - w, by]];
  for (let i = 0; i <= 4; i++) { const x = cx - w + (i * 2 * w) / 4; pts.push([x, by - h]); if (i < 4) pts.push([x + w / 4, by - h * 0.45]); }
  pts.push([cx + w, by]);
  p.poly(pts, "#ffd84a", 9);
  p.poly([[cx - w, by], [cx + w, by], [cx + w, by - h * 0.24], [cx - w, by - h * 0.24]], "#d9a020", 7);
  for (let i = 0; i <= 4; i++) p.ell(cx - w + (i * 2 * w) / 4, by - h - 6, 7, 7, "#fff3b0", 4);
  p.ell(cx, by - h * 0.12, 10, 8, "#c0353a", 4); p.ell(cx - w * 0.55, by - h * 0.12, 7, 6, "#3f8fb5", 4); p.ell(cx + w * 0.55, by - h * 0.12, 7, 6, "#3f8fb5", 4);
};
const sweat = (p: Pen, hc: number, u: number, t: number) => {
  for (let i = 0; i < 2; i++) {
    const ph = frac(t * 0.9 + i * 0.5), x = 300 + (i ? 58 : -62) * u, y = hc - 30 * u + ph * 46 * u;
    if (ph > 0.9) continue;
    p.poly([[x, y - 9 * u], [x + 4.5 * u, y], [x, y + 4.5 * u], [x - 4.5 * u, y]], "#9fdcf2", 4);
  }
};
const laughLines = (p: Pen, hc: number, u: number, t: number) => {
  const k = 0.6 + 0.4 * Math.abs(Math.sin(t * 9));
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
    const a = (-0.5 + i * 0.5) * 0.7, r0 = 70 * u, r1 = (70 + 14 * k) * u;
    p.stroke([[300 + s * r0 * Math.cos(a), hc + r0 * Math.sin(a)], [300 + s * r1 * Math.cos(a), hc + r1 * Math.sin(a)]], 3.4 * u);
  }
};

// ---------------- blink + idle ----------------
export const blinkAt = (f: number, seed: number) => {
  let t = Math.floor(hash(seed) * 30), i = 0;
  while (t <= f) {
    const d = f - t;
    if (d < 4) return [0.6, 1, 1, 0.5][d];
    t += 15 + Math.floor(54 * hash(seed * 7.1 + i * 1.37)); i++;
  }
  return 0;
};

export type Pose = {
  o: Outfit; seed: number; expr: Expr; look?: number; tilt?: number; headTilt?: number; facing?: -1 | 0 | 1;
  hands?: FrontOpts["hands"]; wave?: number; mode?: FrontOpts["mode"]; phase?: number;
  prop?: { ice?: number; paper?: number; glass?: number | null; glassUp?: boolean; cup?: number; crown?: number; sweat?: boolean; laugh?: boolean };
  scale?: number; bob?: number; idle?: number; shadow?: boolean;
};
/** a character card at `at` (soles), with idle sway, blinks and the requested props */
export const char = (f: number, at: V3, P: Pose): Put => {
  const idle = P.idle ?? 1;
  const tilt = q((P.tilt ?? 0) + idle * 1.1 * Math.sin(f * 0.06 + P.seed), 0.25);
  const headTilt = q((P.headTilt ?? 0) + idle * 1.8 * Math.sin(f * 0.045 + P.seed * 2.1), 0.25);
  const blink = P.expr === "laugh" || P.expr === "relief" || P.expr === "smile_closed" ? 0 : blinkAt(f, P.seed);
  const pr = P.prop ?? {}, t = f / 30;
  const animKey = (pr.sweat || pr.cup !== undefined || pr.laugh) ? q(t, 1 / 15) : 0;
  const key = [P.seed, P.expr, q(P.look ?? 0, 0.1), tilt, headTilt, blink, JSON.stringify(P.hands ?? 0), q(P.wave ?? -9, 0.05), P.mode ?? "stand", q(P.phase ?? 0, 0.02),
    JSON.stringify(pr), animKey, P.facing ?? 0].join("|");
  const draw = (p: Pen) => bodyFront(p, P.o, {
    mode: P.mode ?? "stand", phase: P.phase ?? 0, expr: P.expr, look: P.look ?? 0, blink, tilt, headTilt, hands: P.hands, wave: P.wave, seed: P.seed, facing: P.facing ?? 0,
    extra: (pp, stage, k) => {
      const hs = k.hands;
      if (stage === "body") {
        if (pr.ice !== undefined && hs.length >= 2) { const m: P2 = [(hs[0][0] + hs[1][0]) / 2, (hs[0][1] + hs[1][1]) / 2]; ice2D(pp, m[0], m[1] - 52 * pr.ice, 62 * pr.ice, -0.08); for (const h of hs) pp.dot(h[0], h[1], 5.5 * k.u); }
        if (pr.paper !== undefined) paper2D(pp, hs, pr.paper);
        if (pr.glass !== undefined) { const h = hs[hs.length - 1]; glass2D(pp, h[0], h[1] - 8, 84, pr.glass === null ? null : h[1] - 8 - pr.glass); }
        if (pr.cup !== undefined) { const h = hs[hs.length - 1]; cup2D(pp, h[0], h[1] - 4, 70, t); }
      } else {
        if (pr.sweat) sweat(pp, k.hc, k.u, t);
        if (pr.laugh) laughLines(pp, k.hc, k.u, t);
        if (pr.crown !== undefined) { const hatTop = k.crown + 0.22 * k.HH - 0.8 * k.HH; crown2D(pp, 300, hatTop + 14 - pr.crown, 0.5 * k.W); }
      }
    },
  });
  const s = P.scale ?? 1;
  return { key, draw, at: [at[0], at[1] + (P.bob ?? 0), at[2]], scale: s, kind: "char", shadow: P.shadow };
};
/** world point of a design-unit position on a (roughly camera-facing) card standing at `at` */
export const onCard = (at: V3, cx: number, cy: number, s = 1, dz = 0.06): V3 => [at[0] + (cx - 300) * SU * s, at[1] + (975 - cy) * SU * s, at[2] + dz];

// ---------------- effect cards (400 x 400 units = 1 m, origin bottom centre) ----------------
const star = (p: Pen, x: number, y: number, r: number, col = "#fffbe0") => {
  const pts: P2[] = [];
  for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4 - Math.PI / 2, rr = i % 2 ? r * 0.28 : r; pts.push([x + rr * Math.cos(a), y + rr * Math.sin(a)]); }
  p.poly(pts, col, Math.max(3, r * 0.08));
};
export const fxSpark = (f: number, f0: number, at: V3, s = 0.5, dur = 14): Put | null => {
  const t = (f - f0) / dur; if (t < 0 || t > 1) return null;
  const k = Math.sin(Math.PI * t), tq = q(t, 1 / 14);
  return { kind: "fx", at: [at[0], at[1] - 0.5 * s, at[2]], scale: s, key: "spark" + tq, draw: (p) => {
    const kk = Math.sin(Math.PI * tq);
    star(p, 200, 200, 150 * kk); star(p, 300, 110, 50 * kk); star(p, 95, 290, 40 * kk);
  } } as Put & { _k?: number } as Put;
};
export const fxPuff = (f: number, f0: number, at: V3, s = 0.6, dur = 12): Put | null => {
  const t = (f - f0) / dur; if (t < 0 || t > 1) return null;
  const tq = q(t, 1 / 12);
  return { kind: "fx", at, scale: s, key: "puff" + tq, draw: (p) => {
    for (let i = 0; i < 6; i++) { const a = Math.PI * (0.1 + 0.16 * i), r = 60 + 120 * tq; p.ell(200 + r * Math.cos(a) * (i % 2 ? 1 : -1), 330 - r * Math.sin(a) * 0.6, 40 * (1 - tq) + 8, 32 * (1 - tq) + 6, "#efe6d6", 5); }
  } };
};
export const fxDrip = (f: number, at: V3, s = 0.35, seed = 0): Put => {
  const t = frac(f / 26 + seed), tq = q(t, 1 / 13);
  return { kind: "fx", at, scale: s, key: "drip" + tq, draw: (p) => {
    const y = 40 + tq * 330; p.poly([[200, y - 34], [216, y], [200, y + 16], [184, y]], "#9fdcf2", 5);
  } };
};
export const fxGull = (f: number, at: V3, s = 1.1, seed = 0): Put => {
  const fl = q(Math.sin(f * 0.35 + seed * 3), 0.25);
  return { kind: "fx", at, scale: s, key: "gull" + fl, draw: (p) => {
    const y = 200, d = 40 * fl;
    p.stroke([[110, y - d], [160, y - 14 - d * 0.3], [200, y]], 12, INK);
    p.stroke([[200, y], [240, y - 14 - d * 0.3], [290, y - d]], 12, INK);
    p.stroke([[118, y - d], [160, y - 14 - d * 0.3], [200, y]], 6, "#ffffff");
    p.stroke([[200, y], [240, y - 14 - d * 0.3], [282, y - d]], 6, "#ffffff");
  } };
};
