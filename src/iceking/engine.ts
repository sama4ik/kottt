// Ice King engine: plain three.js renderer + postprocessing composer, driven frame-by-frame from Remotion.
// Post chain (from the bridge short): RenderPass -> InkPass (world lines) -> lens pre -> lens main -> bloom + Neutral tone map + grade.
import * as THREE from "three";
import { EffectComposer, RenderPass, EffectPass, BloomEffect, ToneMappingEffect, ToneMappingMode, BlendFunction } from "postprocessing";
import { InkPass, NOINK, noInkFallback } from "./ink";
import { LensBlur } from "./lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH, gradeFor } from "./grade";
import { TONE, CHAR, untone, twoTone } from "./shade";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";
import { LIGHTS, LOOK, Light } from "./lights";
import { Pen } from "./toon";
import { ctex, cloudHD } from "./paint";

export type V3 = [number, number, number];
export const vec = (a: V3) => new THREE.Vector3(a[0], a[1], a[2]);

// ---------------- materials + primitives ----------------
const mats = new Map<string, THREE.MeshLambertMaterial>();
export const lam = (col: string, map: THREE.Texture | null = null, key = "") => {
  const k = col + "|" + (map ? map.uuid : "") + "|" + key;
  let m = mats.get(k);
  if (!m) { m = twoTone(new THREE.MeshLambertMaterial({ color: col, map })); mats.set(k, m); }
  return m;
};
export const glow = (col: THREE.ColorRepresentation, k = 3) => new THREE.MeshBasicMaterial({ color: new THREE.Color(col).multiplyScalar(k), toneMapped: true });
export const mesh = (parent: THREE.Object3D, geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], p: V3 = [0, 0, 0], r: V3 = [0, 0, 0], shadow = true) => {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...p); m.rotation.set(...r);
  m.castShadow = shadow; m.receiveShadow = true;
  parent.add(m);
  return m;
};
export const box = (parent: THREE.Object3D, s: V3, mat: THREE.Material | THREE.Material[], p: V3 = [0, 0, 0], ry = 0, shadow = true) =>
  mesh(parent, new THREE.BoxGeometry(...s), mat, p, [0, ry, 0], shadow);
export const cyl = (parent: THREE.Object3D, rt: number, rb: number, h: number, mat: THREE.Material, p: V3 = [0, 0, 0], seg = 14, r: V3 = [0, 0, 0]) =>
  mesh(parent, new THREE.CylinderGeometry(rt, rb, h, seg), mat, p, r);
/** box with constant texel density: repeat = size / tile (m) */
export const tbox = (parent: THREE.Object3D, s: V3, col: string, tex: THREE.Texture, tile: number, p: V3 = [0, 0, 0], ry = 0) => {
  const g = new THREE.BoxGeometry(...s), uv = g.attributes.uv as THREE.BufferAttribute;
  // faces: +x,-x (d,h), +y,-y (w,d), +z,-z (w,h)
  const dims: [number, number][] = [[s[2], s[1]], [s[2], s[1]], [s[0], s[2]], [s[0], s[2]], [s[0], s[1]], [s[0], s[1]]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const j = f * 4 + i; uv.setXY(j, uv.getX(j) * dims[f][0] / tile, uv.getY(j) * dims[f][1] / tile); }
  const t = tex.clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.needsUpdate = true;
  return box(parent, s, lam(col, t, "tb" + tile), p, ry);
};

// ---------------- 2D cards (characters + effects) ----------------
const blobTex = () => ctex("blob", 128, 128, (g) => {
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, "rgba(90,80,100,1)"); gr.addColorStop(0.55, "rgba(150,140,160,1)"); gr.addColorStop(1, "rgba(255,255,255,1)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
});
export class Card {
  mesh: THREE.Mesh; blob: THREE.Mesh; canvas: HTMLCanvasElement; g: CanvasRenderingContext2D; tex: THREE.CanvasTexture;
  key = ""; cw: number; ch: number; hM: number; sole: number;
  constructor(root: THREE.Object3D, cw = 600, ch = 1000, res = 1.6, hM = 2.16, sole = 975, lit = true) {
    this.cw = cw; this.ch = ch; this.hM = hM; this.sole = sole;
    this.canvas = document.createElement("canvas");
    this.canvas.width = Math.round(cw * res); this.canvas.height = Math.round(ch * res);
    this.g = this.canvas.getContext("2d")!;
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace; this.tex.anisotropy = 4;
    const wM = (hM * cw) / ch, geo = new THREE.PlaneGeometry(wM, hM);
    geo.translate(0, hM / 2 - (hM * (ch - sole)) / ch, 0); // origin at the soles
    const mat = lit ? cardShade(new THREE.MeshLambertMaterial({ map: this.tex, alphaTest: 0.5, side: THREE.DoubleSide }))
      : new THREE.MeshBasicMaterial({ map: this.tex, alphaTest: 0.5, side: THREE.DoubleSide, fog: false });
    (mat as THREE.Material).alphaToCoverage = true;
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: this.tex, alphaTest: 0.5 });
    this.mesh.layers.set(NOINK); this.mesh.castShadow = false; this.mesh.receiveShadow = false;
    this.blob = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), blobMaterial(blobTex()));
    this.blob.rotation.x = -Math.PI / 2; this.blob.layers.set(NOINK); this.blob.renderOrder = 1;
    root.add(this.mesh, this.blob);
  }
  draw(key: string, fn: (p: Pen) => void) {
    if (key === this.key) return;
    this.key = key;
    const g = this.g, k = this.canvas.width / this.cw;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, this.canvas.width, this.canvas.height);
    g.setTransform(k, 0, 0, k, 0, 0); g.lineCap = "round"; g.lineJoin = "round";
    fn(new Pen(g));
    this.tex.needsUpdate = true;
  }
}
export type Put = {
  key: string; draw: (p: Pen) => void; at: V3; scale?: number; blob?: number; yaw?: number; // yaw: fixed facing (else billboard)
  kind?: "char" | "fx"; flatUp?: boolean; shadow?: boolean;
};
export class CardPool {
  chars: Card[] = []; fxs: Card[] = [];
  constructor(private root: THREE.Object3D) {}
  place(list: Put[], cam: THREE.Camera, shadows: boolean) {
    let ci = 0, fi = 0;
    for (const p of list) {
      const fx = p.kind === "fx";
      let c: Card;
      if (fx) { if (!this.fxs[fi]) this.fxs[fi] = new Card(this.root, 400, 400, 1.2, 1, 400, false); c = this.fxs[fi++]; }
      else { if (!this.chars[ci]) this.chars[ci] = new Card(this.root); c = this.chars[ci++]; }
      c.draw(p.key, p.draw);
      const s = p.scale ?? 1;
      c.mesh.visible = true; c.mesh.position.set(...p.at); c.mesh.scale.setScalar(s);
      c.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.at[0], cam.position.z - p.at[2]), 0);
      c.mesh.castShadow = !fx && shadows && p.shadow !== false;
      const b = p.blob ?? (fx ? 0 : 1);
      c.blob.visible = b > 0;
      if (b > 0) { c.blob.position.set(p.at[0], p.at[1] + 0.012, p.at[2]); c.blob.scale.set(0.95 * s * b, 0.5 * s * b, 1); }
    }
    for (let i = ci; i < this.chars.length; i++) { this.chars[i].mesh.visible = false; this.chars[i].blob.visible = false; }
    for (let i = fi; i < this.fxs.length; i++) { this.fxs[i].mesh.visible = false; this.fxs[i].blob.visible = false; }
  }
}

// ---------------- sky, sun, clouds, light rig ----------------
export class Sky {
  sky: THREE.Mesh; mat: THREE.ShaderMaterial; sun = new THREE.DirectionalLight("#fff0d6", 2.6); hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1);
  fog = new THREE.Fog("#bccbec", 25, 420); clouds: THREE.Mesh[] = []; cloudMaps: Record<Light, THREE.Texture[]>;
  constructor(root: THREE.Object3D) {
    this.mat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el));
          c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el));
          c = mix(c, c4, smoothstep(e.z, e.w, el));
          gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.mat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096);
    root.add(this.sky, this.sun, this.sun.target, this.hemi);
    this.cloudMaps = { day: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud)), golden: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.golden.cloud)), night: [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.night.cloud)) };
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.cloudMaps.day[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      m.layers.set(NOINK); m.renderOrder = -0.8; root.add(m); this.clouds.push(m);
    }
  }
  /** sun az (deg from camera forward, + = screen right) / el; focus = shadow camera centre; R = shadow box half size */
  apply(light: Light, cam: THREE.PerspectiveCamera, scene: THREE.Scene, focus: THREE.Vector3, sunAE: [number, number] | null, R: number, center: V3) {
    const L = LIGHTS[light], K = LOOK[light];
    const fwd = new THREE.Vector3(); cam.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
    const az = THREE.MathUtils.degToRad(sunAE ? sunAE[0] : L.az), el = THREE.MathUtils.degToRad(sunAE ? sunAE[1] : L.el);
    const hx = fwd.x * Math.cos(az) - fwd.z * Math.sin(az), hz = fwd.z * Math.cos(az) + fwd.x * Math.sin(az);
    const sunDir = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize(); // az 0 = sun ahead (backlight), +90 = screen right
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -R; sc.right = R; sc.top = R; sc.bottom = -R; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (R / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    const su = this.mat.uniforms;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((d) => THREE.MathUtils.degToRad(d));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar;
    scene.fog = this.fog; scene.background = null;
    // clouds: a ring around the set centre, 140-260 m out
    this.clouds.forEach((m, i) => {
      const a = (i / this.clouds.length) * Math.PI * 2 + 0.4, d = 170 + 60 * Math.sin(i * 2.3);
      m.position.set(center[0] + Math.cos(a) * d, 38 + 22 * ((i * 37) % 5) / 5, center[2] + Math.sin(a) * d);
      m.scale.set(70 + 25 * (i % 3), 32 + 10 * (i % 2), 1);
      m.lookAt(cam.position.x, m.position.y, cam.position.z);
      (m.material as THREE.MeshBasicMaterial).map = this.cloudMaps[light][i % 4];
    });
    return sunDir;
  }
}

// ---------------- renderer + composer ----------------
export class Renderer {
  gl: THREE.WebGLRenderer; composer: EffectComposer; cam: THREE.PerspectiveCamera; scene = new THREE.Scene();
  ink: InkPass; lens: LensBlur; grade: GradeEffect; w: number; h: number;
  constructor(canvas: HTMLCanvasElement, w: number, h: number) {
    this.w = w; this.h = h;
    this.gl = new THREE.WebGLRenderer({ canvas, antialias: false, stencil: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
    this.gl.setPixelRatio(1); this.gl.setSize(w, h, false);
    this.gl.shadowMap.enabled = true; this.gl.shadowMap.type = THREE.PCFSoftShadowMap;
    this.gl.toneMapping = THREE.NoToneMapping; this.gl.outputColorSpace = THREE.SRGBColorSpace;
    this.cam = new THREE.PerspectiveCamera(40, w / h, 0.2, 1500);
    this.cam.layers.enable(NOINK);
    this.composer = new EffectComposer(this.gl, { frameBufferType: THREE.HalfFloatType, multisampling: 4 });
    this.composer.addPass(new RenderPass(this.scene, this.cam));
    this.ink = new InkPass(this.scene, this.cam);
    this.composer.addPass(this.ink);
    this.lens = new LensBlur({ maxCoC: 24, nearScale: 1.2 });
    this.composer.addPass(new EffectPass(this.cam, this.lens.pre));
    this.composer.addPass(new EffectPass(this.cam, this.lens.main));
    const bloom = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.6, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
    this.grade = new GradeEffect(GRADES.day, GRADE_STRENGTH.day);
    this.composer.addPass(new EffectPass(this.cam, bloom, new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }), this.grade));
    this.composer.setSize(w, h, false);
    CARD_K.uPx.value = h / 1920;
  }
  render(light: Light, focusDist: number, cInf: number) {
    noInkFallback(this.scene);
    this.lens.focus = Math.max(0.3, focusDist);
    this.lens.cInf = cInf;
    gradeFor(this.grade, light === "golden" ? "golden" : "day");
    this.composer.render();
  }
}
