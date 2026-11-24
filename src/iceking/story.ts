// Ice King story: shots, cameras, light, depth of field, world animation and the cast per frame.
// Word frames (voice.words.csv x 30): ice 70, island 100-122 | Tudor 145, Boston 188, nobody 212 | bought 296, ship 321,
// newspapers 357, laughed 370 | sailed 420, tons 478, frozen pond 494-530 | arrived 551, nobody 572, cold drinks 645-669 |
// see 689, ice 726, habit 773 | gave 821, bartenders 834, free 857, everyone 875, hooked 895 | India 998 | laughed 1043, Ice King 1083-1107
import * as THREE from "three";
import { Put, V3 } from "./engine";
import { Light } from "./lights";
import { BZ, IX, SEA_X, Sets, Ship } from "./sets";
import { char, islander, sailor, indian, townsfolk, TUDOR, BARTENDER, fxSpark, fxPuff, fxDrip, fxGull, onCard, smooth, easeOut, backOut, clamp01, q } from "./cast";

export const FPS = 30, TOTAL = 1114;
type Key = { f: number; pos: V3; look: V3; fov: number; roll?: number };
export type Shot = { id: number; a: number; b: number; light: Light; sun: [number, number]; R: number; center: V3; keys: Key[];
  track?: (f: number) => V3; dof: (f: number) => { cInf: number; focus: V3 } };

const seaX = (f: number) => SEA_X + (f - 418) * 0.085;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const ramp = (f: number, a: number, b: number) => smooth((f - a) / (b - a));
const B = (x: number, y: number, z: number): V3 => [x, y, BZ + z];
const I = (x: number, y: number, z: number): V3 => [IX + x, y, z];

export const SHOTS: Shot[] = [
  { id: 1, a: 0, b: 131, light: "day", sun: [70, 45], R: 9, center: [0, 0, 0],
    keys: [{ f: 0, pos: [0.22, 1.55, 5.1], look: [0.1, 1.3, 0], fov: 38 }, { f: 131, pos: [0.16, 1.5, 4.3], look: [0.1, 1.34, 0], fov: 36 }],
    dof: () => ({ cInf: 10, focus: [-0.22, 1.75, 0.3] }) },
  { id: 2, a: 132, b: 289, light: "day", sun: [60, 32], R: 30, center: [0, 0, BZ],
    keys: [{ f: 132, pos: B(-44, 17, 0), look: B(6, 3, 0), fov: 42 }, { f: 205, pos: B(1.2, 2.3, 4.6), look: B(7.3, 1.3, -0.6), fov: 38 },
      { f: 289, pos: B(2.0, 2.0, 4.0), look: B(7.4, 1.3, -0.6), fov: 35 }],
    dof: (f) => ({ cInf: 8 * ramp(f, 190, 215), focus: B(6.0, 1.8, 0.6) }) },
  { id: 3, a: 290, b: 349, light: "day", sun: [60, 32], R: 14, center: [0, 0, BZ],
    keys: [{ f: 290, pos: B(7.2, 1.55, 4.2), look: B(8.6, 1.05, 1.6), fov: 34 }, { f: 303, pos: B(7.15, 1.5, 4.0), look: B(8.6, 1.0, 1.6), fov: 33 },
      { f: 328, pos: B(9.0, 3.2, 12.0), look: B(15, 5.5, -2), fov: 50 }, { f: 349, pos: B(9.2, 3.3, 12.6), look: B(15, 5.8, -2), fov: 50 }],
    dof: (f) => ({ cInf: 12 * (1 - ramp(f, 305, 320)), focus: B(8.6, 1.1, 1.6) }) },
  { id: 4, a: 350, b: 417, light: "day", sun: [-55, 35], R: 12, center: [0, 0, BZ],
    keys: [{ f: 350, pos: B(-6.0, 1.62, 6.4), look: B(-6.0, 1.4, 0), fov: 38 }, { f: 417, pos: B(-5.95, 1.58, 5.5), look: B(-6.0, 1.45, 0), fov: 36 }],
    dof: () => ({ cInf: 10, focus: B(-6.0, 1.8, -0.4) }) },
  { id: 5, a: 418, b: 544, light: "day", sun: [80, 40], R: 22, center: [SEA_X, 0, 0], track: (f) => [seaX(f) - SEA_X, 0, 0],
    keys: [{ f: 418, pos: [SEA_X - 15, 9.5, 17], look: [SEA_X + 1, 3.2, 0], fov: 40 }, { f: 485, pos: [SEA_X - 5, 5.5, 12.5], look: [SEA_X, 2.6, 0.4], fov: 38 },
      { f: 544, pos: [SEA_X - 0.6, 3.75, 6.3], look: [SEA_X - 0.4, 2.95, 0.9], fov: 34 }],
    dof: (f) => ({ cInf: 9 * ramp(f, 490, 512), focus: [seaX(f) - 0.4, 3.0, 1.5] }) },
  { id: 6, a: 545, b: 686, light: "golden", sun: [12, 8], R: 14, center: [14, 0, 15],
    keys: [{ f: 545, pos: [14.3, 2.1, 23.6], look: [14.3, 1.25, 15.3], fov: 38 }, { f: 612, pos: [14.3, 1.95, 22.4], look: [14.3, 1.3, 15.4], fov: 37 },
      { f: 640, pos: [15.0, 1.65, 19.6], look: [15.5, 1.55, 17.0], fov: 32 }, { f: 686, pos: [15.05, 1.65, 19.2], look: [15.5, 1.6, 17.0], fov: 31, roll: 0.02 }],
    dof: (f) => ({ cInf: lerp(8, 12, ramp(f, 622, 640)), focus: lerp3([14.2, 1.5, 15.6], [15.5, 1.95, 17.0], ramp(f, 622, 638)) }) },
  { id: 7, a: 687, b: 810, light: "night", sun: [110, 38], R: 9, center: [-14, 0, 14],
    keys: [{ f: 687, pos: [-12.6, 1.98, 18.7], look: [-13.12, 1.78, 15.2], fov: 34 }, { f: 810, pos: [-12.75, 1.98, 17.9], look: [-13.1, 1.84, 15.2], fov: 31 }],
    dof: () => ({ cInf: 13, focus: [-13.2, 1.85, 15.25] }) },
  { id: 8, a: 811, b: 929, light: "night", sun: [110, 38], R: 16, center: [-14, 0, 14],
    keys: [{ f: 811, pos: [-13.4, 1.95, 18.6], look: [-13.75, 1.45, 14.4], fov: 38 }, { f: 862, pos: [-13.2, 2.0, 18.9], look: [-13.65, 1.45, 14.5], fov: 38 },
      { f: 906, pos: [-10.2, 2.55, 23.8], look: [-11.9, 1.35, 15.6], fov: 40 }, { f: 929, pos: [-10.0, 2.6, 24.2], look: [-11.9, 1.4, 15.6], fov: 40 }],
    dof: (f) => ({ cInf: lerp(11, 5, ramp(f, 865, 900)), focus: lerp3([-13.7, 1.8, 14.4], [-11.0, 1.7, 17.2], ramp(f, 865, 900)) }) },
  { id: 9, a: 930, b: 1032, light: "day", sun: [70, 45], R: 45, center: [IX, 0, 0],
    keys: [{ f: 930, pos: I(0.8, 7.5, 41), look: I(0.3, 6.2, -30), fov: 46 }, { f: 1032, pos: I(0.0, 4.6, 33), look: I(-0.4, 5.6, -30), fov: 46 }],
    dof: () => ({ cInf: 0, focus: I(0, 2, 0) }) },
  { id: 10, a: 1033, b: 1113, light: "golden", sun: [8, 9], R: 16, center: [IX, 0, 0],
    keys: [{ f: 1033, pos: I(-3.1, 1.2, 9.6), look: I(-3, 3.1, 0.5), fov: 42 }, { f: 1080, pos: I(-3.07, 1.7, 7.0), look: I(-3, 3.7, 0.5), fov: 37, roll: 0.02 },
      { f: 1113, pos: I(-3.04, 2.2, 5.6), look: I(-3, 4.15, 0.5), fov: 27, roll: 0.07 }],
    dof: () => ({ cInf: 8, focus: I(-3, 4.3, 0.5) }) },
];
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f <= s.b) ?? SHOTS[SHOTS.length - 1];
export const FLASHES = [132, 930];
export const flashAt = (f: number) => { for (const c of FLASHES) { const d = f - c; if (d >= -4 && d < 2) return [0.2, 0.45, 0.75, 1, 0.7, 0.35][d + 4]; } return 0; };
const KICKS: [number, number][] = [[294, 0.035], [855, 0.02], [1090, 0.05]];

export const camAt = (f: number) => {
  const s = shotAt(f), K = s.keys;
  let i = 0; while (i < K.length - 2 && f > K[i + 1].f) i++;
  const k0 = K[i], k1 = K[Math.min(i + 1, K.length - 1)];
  const t = k1.f === k0.f ? 0 : smooth((f - k0.f) / (k1.f - k0.f));
  const off = s.track ? s.track(f) : [0, 0, 0];
  const pos = lerp3(k0.pos, k1.pos, t), look = lerp3(k0.look, k1.look, t);
  for (const [kf, a] of KICKS) { const d = f - kf; if (d >= 0 && d < 7) look[1] += a * (d % 2 ? -1 : 1) * (1 - d / 7) * 3; }
  return { pos: [pos[0] + off[0], pos[1] + off[1], pos[2] + off[2]] as V3, look: [look[0] + off[0], look[1] + off[1], look[2] + off[2]] as V3,
    fov: lerp(k0.fov, k1.fov, t), roll: lerp(k0.roll ?? 0, k1.roll ?? 0, t) };
};

// ---------------- world animation ----------------
const v = new THREE.Vector3();
const rock = (sh: Ship, f: number, k = 1, seed = 0) => { sh.g.rotation.x = 0.022 * k * Math.sin(f * 0.07 + seed); sh.g.rotation.z = 0.014 * k * Math.sin(f * 0.09 + seed); };
export const deck = (sh: Ship, x: number, z = 0): V3 => { sh.g.updateMatrixWorld(true); v.set(x, 1.72, z); sh.g.localToWorld(v); return [v.x, v.y, v.z]; };
export const worldAt = (f: number, S: Sets) => {
  S.waterTex.offset.set(f * 0.0005, f * 0.0003);
  (S.water.material as THREE.MeshLambertMaterial).color.set(f >= 132 && f <= 417 ? "#a9c2d2" : "#ffffff"); // cold grey-blue harbour in Boston
  // snow
  const pos = S.snow.geometry.attributes.position as THREE.BufferAttribute, base = S.snow.userData.base as Float32Array;
  for (let i = 0; i < pos.count; i++) {
    let y = base[i * 3 + 1] - f * 0.045; y = ((y % 16) + 16) % 16;
    pos.setXYZ(i, base[i * 3] + 0.35 * Math.sin(f * 0.04 + i), y, base[i * 3 + 2] + 0.25 * Math.cos(f * 0.03 + i * 0.7));
  }
  pos.needsUpdate = true; S.snow.visible = f >= 132 && f <= 417;
  // coin bag falls onto the crate at f 294 (word "bought" 296)
  const fb = clamp01((f - 285) / 9);
  S.coinBag.visible = f >= 285;
  S.coinBag.position.y = 0.9 + 1.6 * (1 - fb * fb);
  const sq = f >= 294 ? 1 - 0.25 * Math.exp(-(f - 294) / 2.5) * Math.cos((f - 294) * 1.2) : 1;
  S.coinBag.scale.set(2 - sq, sq, 2 - sq);
  // Boston ship: sails furled until he buys it, drop at f 312-326 (word "ship" 321)
  const so = f < 312 ? 0.07 : 0.07 + 0.93 * backOut((f - 312) / 14, 1.2);
  for (const s of S.bostonShip.sails) s.scale.y = so;
  rock(S.bostonShip, f, 0.4);
  // sea ship sails south (+x) and rocks
  S.seaShip.g.position.set(seaX(f), -0.3 + 0.07 * Math.sin(f * 0.11), 0); rock(S.seaShip, f, 1);
  rock(S.islandShip, f, 0.5, 2);
  // India ship glides in (f 930-1010)
  S.indiaShip.g.position.z = lerp(46, 16, easeOut((f - 930) / 80)); rock(S.indiaShip, f, 0.7, 4);
  // ice on the market table slowly sags; bar ice slides to the bartender (f 840-855, "free" 857)
  S.marketIce.scale.y = lerp(1, 0.86, clamp01((f - 545) / 140)); S.marketIce.position.y = 0.85 + 0.35 * S.marketIce.scale.y;
  S.barIce.position.x = lerp(1.0, -0.35, smooth((f - 840) / 15));
  S.lanterns.forEach((m, i) => (m.material as THREE.MeshBasicMaterial).color.set("#ffb347").multiplyScalar(4.6 + 0.7 * Math.sin(f * 0.6 + i * 2.1)));
};

// ---------------- cast per frame ----------------
const shake = (f: number, f0: number, amp = 7, dur = 28) => (f < f0 ? 0 : amp * Math.sin((f - f0) * 0.55) * Math.max(0, 1 - (f - f0) / dur));
const add = (L: Put[], p: Put | null) => { if (p) L.push(p); };
export const actorsAt = (f: number, S: Sets): Put[] => {
  const s = shotAt(f), L: Put[] = [];
  switch (s.id) {
    case 1: { // hook: Tudor offers ice on a tropical beach
      L.push(char(f, [-0.22, 0, 0.3], { o: TUDOR, seed: 11, facing: 1, look: 0.6, expr: f < 60 ? "smile" : "grin", hands: { l: [-0.55, 0.45, true], r: [0.45, 0.4, true] }, prop: { ice: 1 } }));
      const fan = f < 64 ? { r: [0.05 + 0.07 * Math.sin(f * 0.7), -0.06, true] as [number, number, boolean] } : undefined;
      L.push(char(f, [0.52, 0, -0.5], { o: islander(0), seed: 23, facing: -1, look: -0.7, expr: f < 66 ? "nervous" : f < 104 ? "shock" : "nervous", hands: fan, prop: { sweat: true }, bob: f >= 66 && f < 72 ? 0.03 : 0 }));
      add(L, fxSpark(f, 64, onCard([-0.22, 0, 0.3], 411, 488), 0.45));
      break;
    }
    case 2: { // snowy Boston, nobody will ship it
      const t2 = f - 132;
      L.push(char(f, B(2 - t2 * 0.035, 0, -3), { o: townsfolk(1), seed: 41, mode: "stroll", phase: (t2 * 0.035 / 0.8) % 1, expr: "neutral" }));
      L.push(char(f, B(-6 - t2 * 0.03, 0, 3.5), { o: townsfolk(4), seed: 42, mode: "stroll", phase: (t2 * 0.03 / 0.8 + 0.3) % 1, expr: "neutral" }));
      L.push(char(f, B(6.0, 0, 0.6), { o: TUDOR, seed: 11, facing: 1, look: 0.8, expr: f < 212 ? "grin" : f < 245 ? "nervous" : "pained",
        hands: f < 212 ? { l: [0.12, 0.62], r: [0.55, 0.25] } : { l: [0.3, 0.3], r: [0.3, 0.3] } }));
      L.push(char(f, B(8.4, 0, 0.2), { o: sailor(0), seed: 31, facing: -1, look: -0.6, expr: f < 208 ? "neutral" : "stern", headTilt: shake(f, 208), hands: f >= 206 ? { l: [-0.75, 0.62, true], r: [-0.75, 0.55, true] } : undefined }));
      L.push(char(f, B(9.8, 0, -1.6), { o: sailor(1), seed: 32, facing: -1, look: -0.5, expr: f < 212 ? "neutral" : "stern", headTilt: shake(f, 212, 6), hands: f >= 210 ? { l: [0.32, -0.12], r: [0.32, -0.12] } : undefined }));
      break;
    }
    case 3: { // bought his own ship
      add(L, fxPuff(f, 294, B(8.6, 0.88, 1.75), 0.7));
      add(L, fxSpark(f, 296, B(8.85, 1.25, 1.9), 0.3, 10));
      break;
    }
    case 4: { // the newspapers laughed
      const lf = 366;
      [[-6.72, 0.4, 0, 51], [-6.0, -0.7, 1, 52], [-5.28, 0.2, 2, 53]].forEach(([x, z, v, sd], i) => {
        const lt = f - lf - i * 2, laugh = lt >= 0;
        L.push(char(f, B(x, 0, z), { o: townsfolk(v), seed: sd, facing: i === 0 ? 1 : i === 2 ? -1 : 0, look: laugh ? (i - 1) * -0.4 : 0, expr: laugh ? "laugh" : "neutral",
          tilt: laugh ? 5 * Math.sin(lt * 0.9) : 0, bob: laugh ? 0.03 * Math.abs(Math.sin(lt * 0.9)) : 0, hands: { l: [-0.15, 0.34, true], r: [-0.15, 0.34, true] },
          prop: { paper: laugh ? q(Math.sin(lt * 0.9), 0.5) : 0, laugh } }));
      });
      break;
    }
    case 5: { // sailing south with a frozen pond
      L.push(char(f, deck(S.seaShip, 4.6), { o: TUDOR, seed: 11, facing: 1, look: 0.5, expr: "grin", hands: { l: [0.18, 0.6], r: [0.5, -0.4] } }));
      for (let i = 0; i < 3; i++) L.push(fxGull(f, [seaX(f) + 6 + i * 3 + 2 * Math.sin(f * 0.02 + i), 9 + i * 1.5 + 0.6 * Math.sin(f * 0.05 + i), -4 - i * 2], 1.2, i));
      add(L, fxSpark(f, 492, [seaX(f) - 0.4, 3.05, 1.6], 0.55, 16));
      break;
    }
    case 6: { // nobody wanted it
      const no = f >= 572;
      L.push(char(f, [13.3, 0, 16.3], { o: TUDOR, seed: 11, facing: 1, look: 0.6, expr: f < 580 ? "grin" : "pained", hands: f < 580 ? { r: [0.45, 0.25] } : { l: [0.3, 0.25], r: [0.3, 0.25] } }));
      L.push(char(f, [14.9, 0, 16.0], { o: islander(1), seed: 61, facing: 1, look: 0.5, expr: no ? "stern" : "neutral", headTilt: shake(f, 574, 6),
        hands: f < 560 ? undefined : f < 572 ? { r: [0.5, 0.28, true] } : { l: [0.4, 0.3], r: [0.4, 0.3] } }));
      L.push(char(f, [13.6, 0, 14.5], { o: islander(2), seed: 62, facing: -1, look: -0.5, expr: no ? "nervous" : "neutral", headTilt: shake(f, 578, 6), hands: no ? { l: [-0.6, 0.55, true], r: [-0.6, 0.5, true] } : undefined }));
      L.push(char(f, [14.7, 0, 14.2], { o: islander(3), seed: 63, facing: 0, look: 0, expr: no ? "stern" : "neutral", headTilt: shake(f, 576, 5) }));
      const sip = f >= 640 && f < 668;
      L.push(char(f, [15.5, 0, 17.0], { o: islander(4), seed: 64, facing: -1, look: -0.3, expr: sip ? "relief" : f >= 668 ? "smile_closed" : "neutral",
        hands: { r: sip ? [0.04, 0.14, true] : [0.02, 0.4, true] }, prop: { cup: 1 } }));
      add(L, fxDrip(f, [14.55, 0.5, 15.42], 0.35, 0)); add(L, fxDrip(f, [13.9, 0.5, 15.42], 0.35, 0.5));
      break;
    }
    case 7: { // the habit: ice into a glass
      const drop = 724 - f; // cube falls 716 -> 724 ("ice" 726)
      const iceY = f < 716 ? null : f < 724 ? 40 + 26 * drop * drop / 8 : 34;
      L.push(char(f, [-13.2, 0, 15.25], { o: TUDOR, seed: 11, facing: 0, look: f < 760 ? 0.2 : 0, expr: f < 760 ? "smile" : "grin", hands: { l: [0.25, -0.45], r: [-0.22, 0.02, true] }, prop: { glass: iceY === null ? null : iceY } }));
      L.push(char(f, [-14.4, 0, 13.4], { o: BARTENDER, seed: 71, facing: 1, look: 0.4, expr: f < 772 ? "neutral" : "smile", hands: { r: [-0.25 + 0.06 * Math.sin(f * 0.4), 0.52, true] } }));
      add(L, fxSpark(f, 770, onCard([-13.2, 0, 15.25], 335, 400), 0.6, 20));
      break;
    }
    case 8: { // gives it away until everyone is hooked
      L.push(char(f, [-13.0, 0, 15.3], { o: TUDOR, seed: 11, facing: -1, look: -0.6, expr: "grin", hands: f < 856 ? { l: [0.55, 0.42] } : { l: [0.3, -0.5] } }));
      L.push(char(f, [-14.4, 0, 13.4], { o: BARTENDER, seed: 71, facing: 1, look: 0.5, expr: f < 851 ? "shock" : "grin", bob: f >= 857 && f < 866 ? 0.04 * Math.sin((f - 857) * 0.7) : 0,
        hands: f >= 857 ? { l: [0.35, -0.6], r: [0.35, -0.6] } : undefined }));
      const Q: [number, number][] = [[-11.6, 16.4], [-10.9, 17.3], [-10.1, 18.1], [-9.3, 18.9], [-8.4, 19.6]];
      Q.forEach(([x, z], i) => {
        const up = f >= 891 + i;
        L.push(char(f, [x, 0, z], { o: islander(i + 5), seed: 80 + i, facing: -1, look: -0.4, expr: up ? (i % 2 ? "smile_closed" : "grin") : "smile",
          hands: { r: up ? [0.25, -0.35, true] : [0.15, 0.22, true] }, prop: { glass: 34 }, bob: up ? 0.05 * Math.abs(Math.sin((f - 891 - i) * 0.5)) : 0 }));
        add(L, fxSpark(f, 893 + i * 2, [x + 0.25, 2.05, z + 0.1], 0.3, 12));
      });
      break;
    }
    case 9: { // years later: India
      L.push(char(f, deck(S.indiaShip, 4.6), { o: TUDOR, seed: 11, facing: 0, expr: "grin", wave: Math.sin(f * 0.3) }));
      for (let i = 0; i < 7; i++) {
        const x = -1.6 + i * 1.05, z = 3.3 + (i % 2) * 0.9;
        L.push(char(f, I(x, 0, z), { o: indian(i), seed: 90 + i, facing: 1, look: 0.5, expr: f < 975 ? "neutral" : i % 2 ? "grin" : "smile", wave: f >= 975 + i * 2 ? Math.sin(f * 0.35 + i) : undefined }));
      }
      for (let i = 0; i < 3; i++) L.push(fxGull(f, I(-6 + i * 4 + (f - 930) * 0.05, 11 + i, -6 - i * 3), 1.6, i + 2));
      break;
    }
    case 10: { // the Ice King
      const cd = f < 1076 ? 9999 : f < 1090 ? 420 * Math.pow((1090 - f) / 14, 2) : 0;
      const up = f >= 1092;
      L.push(char(f, I(-3, 2.4, 0.5), { o: TUDOR, seed: 11, facing: 0, look: 0, expr: f < 1088 ? "smile" : "grin",
        hands: up ? { l: [0.3, -0.72], r: [0.3, -0.72] } : undefined, wave: up ? undefined : Math.sin(f * 0.3), prop: f >= 1076 ? { crown: cd } : undefined,
        bob: f >= 1090 && f < 1098 ? -0.03 * Math.sin((f - 1090) * 0.8) : 0, shadow: true }));
      const C: [number, number][] = [[-4.25, 3.4], [-3.55, 4.3], [-2.45, 4.2], [-1.75, 3.3], [-4.9, 2.4], [-1.1, 2.5]];
      C.forEach(([x, z], i) => L.push(char(f, I(x, 0, z), { o: indian(i + 1), seed: 100 + i, facing: x < -3 ? 1 : -1, look: x < -3 ? 0.3 : -0.3, expr: i % 2 ? "laugh" : "grin",
        hands: { l: [0.3, -0.65], r: [0.3, -0.65] }, bob: 0.06 * Math.abs(Math.sin(f * 0.32 + i)) })));
      add(L, fxSpark(f, 1090, I(-3, 4.45, 0.6), 0.9, 18));
      break;
    }
  }
  return L;
};
