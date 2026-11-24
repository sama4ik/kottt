// Ice King sets: tropical island (beach, market, beach bar), snowy Boston harbour, open sea, Indian harbour.
// All built from primitives with painted canvas textures (flat colour + dark seams, like paint.ts).
import * as THREE from "three";
import { ctex, rep, planksHD, stoneHD, roofHD, facadeHD, rng } from "./paint";
import { lam, glow, mesh, box, cyl, tbox, V3 } from "./engine";

export const BZ = -700; // Boston set centre z
export const IX = -700; // India set centre x
export const SEA_X = 400; // open-sea set centre x

// ---------------- painters ----------------
const speckle = (key: string, base: string, cols: string[], n: number, rmax: number, size = 512) => ctex(key, size, size, (g, r) => {
  g.fillStyle = base; g.fillRect(0, 0, size, size);
  for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; g.globalAlpha = 0.35 + 0.4 * r(); g.beginPath(); g.ellipse(r() * size, r() * size, 2 + r() * rmax, 1 + r() * rmax * 0.5, r() * 3, 0, 7); g.fill(); }
  g.globalAlpha = 1;
});
export const sandTex = () => speckle("sand", "#f0d49a", ["#e3c283", "#f7e2b4", "#d9b376"], 900, 7);
export const snowTex = () => speckle("snow", "#f4f7fb", ["#e3eaf4", "#ffffff", "#d8e2ef"], 600, 9);
export const dirtTex = () => speckle("dirtI", "#e2b77e", ["#d3a46b", "#ecc996", "#c99660"], 900, 8);
const waterTex = () => ctex("waterIK", 512, 512, (g, r) => {
  g.fillStyle = "#1d8fb5"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 26; i++) { const x = r() * 512, y = r() * 512, w = 30 + r() * 60; g.strokeStyle = i % 3 ? "#4fc0d6" : "#9fe6ee"; g.lineWidth = 3 + r() * 3; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + w / 2, y - 7, x + w, y); g.stroke(); }
  for (let i = 0; i < 40; i++) { g.fillStyle = "#16769c"; g.globalAlpha = 0.5; g.fillRect(r() * 512, r() * 512, 20 + r() * 40, 3); }
  g.globalAlpha = 1;
});
export const iceTex = (duck = false) => ctex(duck ? "iceDuck" : "ice", 256, 256, (g, r) => {
  const gr = g.createLinearGradient(0, 0, 256, 256); gr.addColorStop(0, "#e9fbff"); gr.addColorStop(1, "#a9e2f2");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = "#ffffff"; g.lineWidth = 10; g.globalAlpha = 0.85;
  g.beginPath(); g.moveTo(40, 200); g.lineTo(110, 130); g.stroke();
  g.lineWidth = 6; g.beginPath(); g.moveTo(70, 220); g.lineTo(120, 170); g.stroke();
  g.strokeStyle = "#7fc6dc"; g.lineWidth = 3; g.globalAlpha = 0.7;
  g.beginPath(); g.moveTo(150, 30); g.lineTo(175, 80); g.lineTo(165, 120); g.lineTo(200, 150); g.stroke();
  g.globalAlpha = 1;
  g.strokeStyle = "#5aa9c4"; g.lineWidth = 8; g.strokeRect(4, 4, 248, 248);
  if (duck) { // a duck frozen mid-paddle
    g.globalAlpha = 0.8; g.fillStyle = "#f4c430"; g.strokeStyle = "#7a5a20"; g.lineWidth = 5;
    g.beginPath(); g.ellipse(130, 150, 52, 34, 0, 0, 7); g.fill(); g.stroke();
    g.beginPath(); g.ellipse(168, 100, 26, 24, 0, 0, 7); g.fill(); g.stroke();
    g.fillStyle = "#f07a2a"; g.beginPath(); g.moveTo(190, 98); g.lineTo(222, 104); g.lineTo(190, 112); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = "#241726"; g.beginPath(); g.arc(172, 94, 5, 0, 7); g.fill();
    g.globalAlpha = 1;
  }
});
const stripeTex = (a: string, b: string) => ctex("stripe" + a + b, 256, 256, (g) => {
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect(i * 32, 0, 32, 256); }
  g.fillStyle = "rgba(40,20,30,.35)"; for (let i = 0; i < 8; i++) g.fillRect(i * 32 - 1, 0, 2, 256);
});
const thatchTex = () => ctex("thatch", 512, 512, (g, r) => {
  g.fillStyle = "#c9a24f"; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 900; i++) { const x = r() * 512, y = r() * 512; g.strokeStyle = ["#a98134", "#ddb867", "#8f6a2a"][i % 3]; g.lineWidth = 2 + r() * 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 8, y + 22 + r() * 20); g.stroke(); }
  g.fillStyle = "rgba(70,45,20,.45)"; for (let y = 0; y < 512; y += 64) g.fillRect(0, y, 512, 4);
});
const canvasTex = () => ctex("sailcloth", 256, 256, (g, r) => {
  g.fillStyle = "#f3ead2"; g.fillRect(0, 0, 256, 256);
  g.fillStyle = "rgba(150,130,100,.35)"; for (let x = 0; x < 256; x += 42) g.fillRect(x, 0, 3, 256);
  for (let i = 0; i < 60; i++) { g.fillStyle = "rgba(190,170,130,.25)"; g.fillRect(r() * 256, r() * 256, 18, 2); }
});
const hullTex = () => ctex("hull", 512, 256, (g, r) => {
  g.fillStyle = "#7a3b2a"; g.fillRect(0, 0, 512, 256);
  for (let y = 0; y < 256; y += 32) { g.fillStyle = "rgba(30,10,10,.55)"; g.fillRect(0, y, 512, 3); }
  g.fillStyle = "#e9dfc4"; g.fillRect(0, 40, 512, 26); // cream stripe
  g.fillStyle = "#2a1a18"; for (let x = 30; x < 512; x += 70) g.fillRect(x, 44, 18, 18); // gun ports
  g.fillStyle = "#2f3a3a"; g.fillRect(0, 210, 512, 46);
});
const arches = () => ctex("arches", 512, 256, (g) => {
  g.fillStyle = "#f4ede0"; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 4; i++) {
    const x = 32 + i * 120; g.fillStyle = "#c57d52"; g.beginPath(); g.moveTo(x, 230); g.lineTo(x, 110); g.quadraticCurveTo(x + 44, 30, x + 88, 110); g.lineTo(x + 88, 230); g.closePath(); g.fill();
    g.fillStyle = "#5a3a4a"; g.beginPath(); g.moveTo(x + 10, 230); g.lineTo(x + 10, 116); g.quadraticCurveTo(x + 44, 52, x + 78, 116); g.lineTo(x + 78, 230); g.closePath(); g.fill();
  }
  g.fillStyle = "#d9a441"; g.fillRect(0, 10, 512, 10); g.fillStyle = "rgba(120,90,70,.4)"; g.fillRect(0, 246, 512, 10);
});
const bottleCols = ["#3f8f5a", "#8c3b2a", "#d9a441", "#4a6fb0", "#6b3f7a"];

// ---------------- builders ----------------
export const palm = (root: THREE.Object3D, p: V3, h = 7, lean = 0.25, ry = 0, seed = 1) => {
  const g = new THREE.Group(); g.position.set(...p); g.rotation.y = ry; root.add(g);
  const trunk = lam("#9a7048"), ring = lam("#6f4c30"), leaf = lam("#3f9a43"), leaf2 = lam("#2f7d3a");
  const n = 7; let x = 0, y = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n, seg = h / n, dx = lean * seg * (0.4 + 1.6 * t);
    const c = cyl(g, 0.17 - 0.06 * t, 0.2 - 0.06 * t, seg * 1.04, trunk, [x + dx / 2, y + seg / 2, 0], 10, [0, 0, -Math.atan2(dx, seg)]);
    cyl(g, 0.21 - 0.06 * t, 0.21 - 0.06 * t, 0.08, ring, [x + dx, y + seg, 0], 10);
    x += dx; y += seg; void c;
  }
  const r = rng(seed);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + r() * 0.3, L = 2.3 + r() * 0.5;
    const fr = new THREE.Group(); fr.position.set(x, y, 0); fr.rotation.y = a; g.add(fr);
    const m = mesh(fr, new THREE.SphereGeometry(1, 14, 8), i % 2 ? leaf : leaf2, [L * 0.5, -0.35, 0], [0, 0, -0.42 - r() * 0.25]);
    m.scale.set(L * 0.55, 0.06, 0.32);
  }
  for (let i = 0; i < 3; i++) mesh(g, new THREE.SphereGeometry(0.17, 10, 8), lam("#6b4a2a"), [x + 0.18 * Math.cos(i * 2), y - 0.25, 0.18 * Math.sin(i * 2)]);
  return g;
};
export const hut = (root: THREE.Object3D, p: V3, ry = 0, s = 1) => {
  const g = new THREE.Group(); g.position.set(...p); g.rotation.y = ry; g.scale.setScalar(s); root.add(g);
  tbox(g, [3, 2.2, 3], "#e8d2a8", planksHD(), 1.2, [0, 1.1, 0]);
  box(g, [0.8, 1.5, 0.05], lam("#5a3a2a"), [0, 0.75, 1.53]);
  const roof = mesh(g, new THREE.ConeGeometry(2.6, 2, 4), lam("#ffffff", rep(thatchTex(), 2, 2)), [0, 3.2, 0], [0, Math.PI / 4, 0]);
  void roof; return g;
};
export const stall = (root: THREE.Object3D, p: V3, ry: number, a: string, b: string) => {
  const g = new THREE.Group(); g.position.set(...p); g.rotation.y = ry; root.add(g);
  const post = lam("#7a5232");
  for (const [x, z] of [[-1.3, -0.8], [1.3, -0.8], [-1.3, 0.8], [1.3, 0.8]]) cyl(g, 0.06, 0.06, 2.5, post, [x, 1.25, z], 8);
  const aw = box(g, [3, 0.06, 2], lam("#ffffff", stripeTex(a, b)), [0, 2.55, 0]); aw.rotation.x = 0.18;
  tbox(g, [2.6, 0.9, 1.2], "#c8955c", planksHD(), 1, [0, 0.45, 0.2]);
  for (let i = 0; i < 5; i++) mesh(g, new THREE.SphereGeometry(0.16, 10, 8), lam(["#f2a33a", "#e2453c", "#f4d23c", "#6fbf4a", "#f2a33a"][i]), [-0.8 + i * 0.4, 1.05, 0.25 + (i % 2) * 0.2]);
  return g;
};
export const iceBlock = (root: THREE.Object3D, p: V3, s: V3 = [0.6, 0.6, 0.6], ry = 0, duck = false) =>
  box(root, s, lam("#ffffff", iceTex(duck), duck ? "duck" : "ice"), p, ry);

export type Ship = { g: THREE.Group; sails: THREE.Mesh[]; flag: THREE.Mesh; cargo: THREE.Group };
export const ship = (root: THREE.Object3D, p: V3, ry: number, cargo = false, duck = false): Ship => {
  const g = new THREE.Group(); g.position.set(...p); g.rotation.y = ry; root.add(g);
  const L = 14, W = 4.2, H = 2.6;
  const sh = new THREE.Shape();
  sh.moveTo(-L / 2, -W / 2); sh.lineTo(L * 0.22, -W / 2); sh.quadraticCurveTo(L * 0.45, -W * 0.4, L / 2, 0);
  sh.quadraticCurveTo(L * 0.45, W * 0.4, L * 0.22, W / 2); sh.lineTo(-L / 2, W / 2); sh.lineTo(-L / 2, -W / 2);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: H, bevelEnabled: false, curveSegments: 10 });
  geo.rotateX(-Math.PI / 2); geo.translate(0, -0.9, 0);
  const ht = hullTex(); ht.wrapS = ht.wrapT = THREE.RepeatWrapping; ht.repeat.set(0.09, 0.38);
  const pk = planksHD().clone(); pk.wrapS = pk.wrapT = THREE.RepeatWrapping; pk.repeat.set(0.3, 0.3); pk.needsUpdate = true;
  mesh(g, geo, [lam("#ffffff", pk, "deck"), lam("#ffffff", ht, "hull")]);
  // rails
  const rail = lam("#5a3424");
  box(g, [L * 0.72, 0.5, 0.14], rail, [-L * 0.14, H - 0.9 + 0.25, W / 2 - 0.07]);
  box(g, [L * 0.72, 0.5, 0.14], rail, [-L * 0.14, H - 0.9 + 0.25, -W / 2 + 0.07]);
  box(g, [0.14, 0.5, W], rail, [-L / 2 + 0.07, H - 0.9 + 0.25, 0]);
  tbox(g, [2.6, 1.0, W], "#8a5634", planksHD(), 1, [-L / 2 + 1.3, H - 0.9 + 0.5, 0]); // stern cabin
  const deckY = H - 0.9, mast = lam("#6b4128"), sails: THREE.Mesh[] = [];
  const sailMat = lam("#ffffff", canvasTex(), "sail");
  for (const [mx, mh, sw] of [[1.6, 12, 4.6], [-2.6, 10.5, 4.0]] as [number, number, number][]) {
    cyl(g, 0.15, 0.19, mh, mast, [mx, deckY + mh / 2, 0], 10);
    for (const [yy, ww, hh] of [[mh * 0.92, sw * 0.8, mh * 0.3], [mh * 0.6, sw, mh * 0.36]] as [number, number, number][]) {
      cyl(g, 0.07, 0.07, ww + 0.4, mast, [mx + 0.05, deckY + yy, 0], 8, [Math.PI / 2, 0, 0]);
      const sg = new THREE.PlaneGeometry(ww, hh, 6, 6); const pos = sg.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) { const z = pos.getX(i) / ww; pos.setZ(i, 0.45 * (1 - 4 * z * z) * (0.6 + 0.4 * (0.5 - pos.getY(i) / hh))); }
      sg.translate(0, -hh / 2, 0); sg.computeVertexNormals();
      const s = mesh(g, sg, sailMat, [mx + 0.22, deckY + yy, 0], [0, Math.PI / 2, 0]);
      (s.material as THREE.Material).side = THREE.DoubleSide; sails.push(s);
    }
  }
  const flag = box(g, [0.9, 0.55, 0.03], lam("#c0353a"), [1.6 - 0.5, deckY + 12.3, 0], Math.PI / 2);
  cyl(g, 0.12, 0.05, 6, mast, [L / 2 + 1.6, deckY + 0.6, 0], 8, [0, 0, -1.2]); // bowsprit
  const cg = new THREE.Group(); cg.position.set(0, deckY, 0); g.add(cg);
  if (cargo) { // a stack of pond ice, tallest in the middle
    let k = 0;
    for (let lv = 0; lv < 3; lv++) for (let i = -2 + lv; i <= 2 - lv; i++) for (let j = -1; j <= 1; j++) {
      if (lv === 2 && j !== 0) continue;
      iceBlock(cg, [i * 0.95 - 0.4, 0.42 + lv * 0.8, j * 1.0], [0.9, 0.78, 0.95], 0, duck && lv === 1 && i === 0 && j === 1);
      k++;
    }
  }
  return { g, sails, flag, cargo: cg };
};

const house = (root: THREE.Object3D, p: V3, ry: number, w: number, h: number, wall: string, seed: number, snow = true) => {
  const g = new THREE.Group(); g.position.set(...p); g.rotation.y = ry; root.add(g);
  const d = 7, fac = facadeHD("fac" + seed, w, h, { wall, shutter: ["#2f5f6a", "#6a2f2f", "#3f4f2f"][seed % 3], door: true, brick: seed % 2 === 0 });
  const side = lam(wall), front = lam("#ffffff", fac, "f" + seed);
  box(g, [w, h, d], [side, side, side, side, front, side], [0, h / 2, 0]);
  const rs = new THREE.Shape(); rs.moveTo(-d / 2 - 0.3, 0); rs.lineTo(0, 2.6); rs.lineTo(d / 2 + 0.3, 0); rs.lineTo(-d / 2 - 0.3, 0);
  const rg = new THREE.ExtrudeGeometry(rs, { depth: w + 0.4, bevelEnabled: false }); rg.translate(0, 0, -(w + 0.4) / 2); rg.rotateY(Math.PI / 2);
  mesh(g, rg, [lam(wall), lam(snow ? "#eef3fa" : "#9a4f32", snow ? null : roofHD("#b5653f"), "roof")], [0, h, 0]);
  tbox(g, [0.7, 1.8, 0.7], "#8c4a3a", stoneHD(), 1, [w * 0.25, h + 1.9, -1]);
  if (snow) box(g, [0.85, 0.15, 0.85], lam("#f6f8fc"), [w * 0.25, h + 2.85, -1]);
  return g;
};

// ---------------- the world ----------------
export type Sets = {
  water: THREE.Mesh; waterTex: THREE.Texture;
  bostonShip: Ship; seaShip: Ship; islandShip: Ship; indiaShip: Ship;
  coinBag: THREE.Group; snow: THREE.Points; marketIce: THREE.Mesh; lanterns: THREE.Mesh[]; barIce: THREE.Mesh;
};
export const buildSets = (root: THREE.Object3D): Sets => {
  // ocean
  const wt = waterTex(); wt.wrapS = wt.wrapT = THREE.RepeatWrapping; wt.repeat.set(300, 300);
  const water = mesh(root, new THREE.PlaneGeometry(3000, 3000), lam("#ffffff", wt, "water"), [0, -0.35, 0], [-Math.PI / 2, 0, 0], false);
  water.castShadow = false;

  // ===== ISLAND (origin): beach, market, bar =====
  const sand = sandTex(); sand.wrapS = sand.wrapT = THREE.RepeatWrapping; sand.repeat.set(30, 30);
  mesh(root, new THREE.CylinderGeometry(48, 50, 1, 64), lam("#ffffff", sand, "sand"), [0, -0.5, 30], [0, 0, 0], false);
  for (const [p, h, l, r] of [[[3.2, 0, -2.5], 7.5, 0.3, 0.4], [-4.5, 0, -6], [6.5, 0, -8], [-8, 0, 1], [9, 0, 4], [18, 0, 9], [-17, 0, 7], [-10, 0, 18], [21, 0, 18], [-3, 0, -9], [12, 0, -4]].map((v, i) =>
    Array.isArray(v[0]) ? v : [v, 6 + (i % 3), 0.2 + 0.1 * (i % 2), i]) as [V3, number, number, number][]) palm(root, p, h, l, r * 1.3, r + 3);
  hut(root, [-6, 0, -3], 0.4, 0.9); hut(root, [10, 0, 0], -0.3, 1); hut(root, [24, 0, 12], -0.8, 1.1);
  stall(root, [11, 0, 11.5], 0.15, "#e2453c", "#f6efe0"); stall(root, [17.5, 0, 12.5], -0.2, "#2f8fb5", "#f6efe0");
  tbox(root, [2.0, 0.85, 1.1], "#b98450", planksHD(), 1, [14.2, 0.425, 15]);
  const marketIce = iceBlock(root, [14.2, 1.2, 15], [0.75, 0.7, 0.75], 0.2);
  const islandShip = ship(root, [24, -0.3, -18], 0.5, false);
  // beach bar
  const bar = new THREE.Group(); bar.position.set(-14, 0, 14); root.add(bar);
  tbox(bar, [3.6, 1.1, 0.8], "#9a6238", planksHD(), 0.8, [0, 0.55, 0]);
  box(bar, [3.8, 0.08, 1.0], lam("#5a3424"), [0, 1.14, 0]);
  for (const [x, z] of [[-1.9, -2.2], [1.9, -2.2], [-1.9, 0.6], [1.9, 0.6]]) cyl(bar, 0.09, 0.1, 3.0, lam("#6b4128"), [x, 1.5, z], 8);
  mesh(bar, new THREE.ConeGeometry(3.6, 1.8, 4), lam("#ffffff", rep(thatchTex(), 3, 2), "barroof"), [0, 3.75, -0.8], [0, Math.PI / 4, 0]);
  tbox(bar, [3.6, 2.4, 0.2], "#c8955c", planksHD(), 0.8, [0, 1.2, -2.3]);
  for (let s = 0; s < 2; s++) { box(bar, [3.2, 0.06, 0.35], lam("#5a3424"), [0, 1.3 + s * 0.6, -2.05]);
    for (let i = 0; i < 9; i++) cyl(bar, 0.05, 0.06, 0.32, lam(bottleCols[(i + s) % 5]), [-1.45 + i * 0.36, 1.49 + s * 0.6, -2.05], 8); }
  const lanterns: THREE.Mesh[] = [];
  for (const x of [-1.5, 0, 1.5]) { cyl(bar, 0.01, 0.01, 0.5, lam("#2a1a18"), [x, 2.75, 0.4], 4); lanterns.push(mesh(bar, new THREE.SphereGeometry(0.17, 12, 10), glow("#ffb347", 5), [x, 2.45, 0.4], [0, 0, 0], false)); }
  const barIce = iceBlock(bar, [1.2, 1.42, 0.05], [0.5, 0.45, 0.45], 0.3);

  // ===== BOSTON (z = BZ): snowy street down to the quay, ship moored =====
  const B = new THREE.Group(); B.position.set(0, 0, BZ); root.add(B);
  const sn = snowTex(); sn.wrapS = sn.wrapT = THREE.RepeatWrapping; sn.repeat.set(24, 18);
  mesh(B, new THREE.BoxGeometry(90, 1, 70), lam("#ffffff", sn, "snow"), [-35, -0.5, 0], [0, 0, 0], false);
  tbox(B, [1, 1.2, 70], "#9aa0a6", stoneHD("quay", ["#a7a9ab", "#9a9ea2", "#b2b4b6", "#8e9296"], "#6f7377"), 1, [10.5, -0.4, 0]);
  const houseCols = ["#b5653f", "#e8d8b8", "#8c3b4a", "#d9b98a", "#6f7f8f", "#c98a5a"];
  for (let i = 0; i < 6; i++) {
    const x = -30 + i * 6.2, h = 7 + (i % 3) * 1.4;
    house(B, [x, 0, -8.5], 0, 6, h, houseCols[i], i);
    house(B, [x + 2, 0, 8.5], Math.PI, 6, h + 0.8, houseCols[(i + 3) % 6], i + 10);
  }
  const bostonShip = ship(B, [15, -0.3, 0], Math.PI / 2 + 0.03, false);
  // sled of ice + crate
  const sled = new THREE.Group(); sled.position.set(6.9, 0, -1.7); B.add(sled);
  box(sled, [2.2, 0.12, 1.1], lam("#7a5232"), [0, 0.25, 0]);
  for (const z of [-0.5, 0.5]) box(sled, [2.5, 0.08, 0.08], lam("#3a2a22"), [0, 0.06, z]);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) iceBlock(sled, [-0.65 + i * 0.65, 0.6 + j * 0.0, -0.25 + j * 0.5], [0.6, 0.55, 0.45], 0.05 * i);
  iceBlock(sled, [0, 1.15, 0], [0.6, 0.5, 0.5], 0.2);
  tbox(B, [1.1, 0.9, 0.9], "#a0703f", planksHD(), 0.6, [8.6, 0.45, 1.6]); // crate on the quay (coin bag lands here)
  const coinBag = new THREE.Group(); coinBag.position.set(8.6, 0.9, 1.6); B.add(coinBag);
  const bagM = mesh(coinBag, new THREE.SphereGeometry(0.26, 16, 12), lam("#9c7a4c"), [0, 0.22, 0]); bagM.scale.set(1.1, 0.9, 1.1);
  cyl(coinBag, 0.07, 0.1, 0.12, lam("#8a6a40"), [0, 0.47, 0], 12);
  cyl(coinBag, 0.08, 0.08, 0.05, lam("#5a2f22"), [0, 0.46, 0], 12);
  mesh(coinBag, new THREE.ConeGeometry(0.15, 0.12, 12), lam("#9c7a4c"), [0, 0.58, 0], [Math.PI, 0, 0]);
  for (let i = 0; i < 4; i++) cyl(coinBag, 0.07, 0.07, 0.025, lam("#f2cf4a"), [0.3 + 0.05 * i, 0.02 + 0.026 * i, 0.12 - 0.04 * i], 12);
  for (let i = 0; i < 7; i++) cyl(coinBag, 0.065, 0.065, 0.022, lam("#f2cf4a"), [-0.35 + 0.11 * i, 0.012, 0.3 + 0.06 * Math.sin(i * 2.1)], 12, [0.1 * Math.sin(i), 0, 0.12 * Math.cos(i)]);
  // falling snow (Points, NOINK via fallback)
  const N = 1400, pos = new Float32Array(N * 3), rr = rng(9);
  for (let i = 0; i < N; i++) { pos[i * 3] = -30 + rr() * 50; pos[i * 3 + 1] = rr() * 16; pos[i * 3 + 2] = BZ - 14 + rr() * 30; }
  const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const flake = ctex("flake", 64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.6, "rgba(255,255,255,.9)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
  const snow = new THREE.Points(sg, new THREE.PointsMaterial({ map: flake, size: 0.09, transparent: true, depthWrite: false, color: new THREE.Color(1.15, 1.15, 1.2) }));
  snow.userData.base = pos.slice(); root.add(snow);

  // ===== OPEN SEA: the ice ship =====
  const seaShip = ship(root, [SEA_X, -0.3, 0], 0, true, true);

  // ===== INDIA (x = IX): palace, quay, ice pile =====
  const I = new THREE.Group(); I.position.set(IX, 0, 0); root.add(I);
  const dirt = dirtTex(); dirt.wrapS = dirt.wrapT = THREE.RepeatWrapping; dirt.repeat.set(20, 20);
  mesh(I, new THREE.BoxGeometry(110, 1, 80), lam("#ffffff", dirt, "dirt"), [0, -0.5, -34], [0, 0, 0], false);
  tbox(I, [110, 1.2, 1], "#d9c9a8", stoneHD("ghat", ["#e5d6b8", "#d9c9a8", "#efe2c6", "#cdbb98"], "#a8957a"), 1, [0, -0.4, 6]);
  const P = new THREE.Group(); P.position.set(0, 0, -38); I.add(P);
  const arc = arches(); const wallF = lam("#ffffff", arc, "arch"), wallS = lam("#f4ede0");
  box(P, [34, 9, 14], [wallS, wallS, wallS, wallS, wallF, wallS], [0, 4.5, 0]);
  box(P, [36, 0.6, 15], lam("#e8dcc4"), [0, 9.2, 0]);
  tbox(P, [12, 4, 12], "#f4ede0", arc, 6, [0, 11.5, 0]);
  const dome = mesh(P, new THREE.SphereGeometry(6.2, 32, 18, 0, Math.PI * 2, 0, Math.PI / 2), lam("#f7f1e6"), [0, 13.4, 0]); dome.scale.y = 1.25;
  cyl(P, 0.08, 0.3, 2.2, lam("#d9a441"), [0, 22.2, 0], 10);
  for (const [x, z] of [[-17, 7], [17, 7], [-17, -7], [17, -7]]) {
    cyl(P, 1.0, 1.25, 22, lam("#f4ede0"), [x, 11, z], 16);
    cyl(P, 1.5, 1.5, 0.5, lam("#e8dcc4"), [x, 16, z], 16);
    const d2 = mesh(P, new THREE.SphereGeometry(1.25, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), lam("#f7f1e6"), [x, 22, z]); d2.scale.y = 1.4;
  }
  for (const [x, z, h] of [[-26, -18, 8], [24, -20, 9], [-12, -6, 7], [14, -4, 7.5], [-32, -2, 6.5], [30, -6, 7]] as [number, number, number][]) palm(I, [x, 0, z], h, 0.22, x, Math.abs(x));
  stall(I, [-9, 0, -1], 0.3, "#f0a030", "#f6efe0"); stall(I, [9, 0, -2], -0.3, "#c0353a", "#f6efe0");
  const indiaShip = ship(I, [4.6, -0.3, 14], Math.PI / 2, true);
  // the ice pile Tudor stands on (top at y = 2.4)
  const pile = new THREE.Group(); pile.position.set(-3, 0, 0.5); I.add(pile);
  for (let lv = 0; lv < 3; lv++) { const n = 4 - lv; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++)
    iceBlock(pile, [(i - (n - 1) / 2) * 0.82, 0.4 + lv * 0.8, (j - (n - 1) / 2) * 0.82], [0.8, 0.8, 0.8], 0.04 * ((i + j) % 3)); }

  return { water, waterTex: wt, bostonShip, seaShip, islandShip, indiaShip, coinBag, snow, marketIce, lanterns, barIce };
};
