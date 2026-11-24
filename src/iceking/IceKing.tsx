// "The Ice Man Everyone Laughed At": 1080x1920, 30 fps, 1114 frames (= voice length). Pure function of the frame.
import React, { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";
import { Renderer, Sky, CardPool } from "./engine";
import { buildSets, Sets } from "./sets";
import { shotAt, camAt, worldAt, actorsAt, flashAt } from "./story";
import { LIGHTS } from "./lights";

class Film {
  r: Renderer; sky: Sky; sets: Sets; pool: CardPool; root = new THREE.Group();
  private fwd = new THREE.Vector3(); private fp = new THREE.Vector3();
  constructor(canvas: HTMLCanvasElement, w: number, h: number) {
    this.r = new Renderer(canvas, w, h);
    this.r.scene.add(this.root);
    this.sky = new Sky(this.root);
    this.sets = buildSets(this.root);
    this.pool = new CardPool(this.root);
  }
  frame(f: number) {
    const s = shotAt(f), c = camAt(f), cam = this.r.cam;
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.aspect = this.r.w / this.r.h; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    worldAt(f, this.sets);
    this.root.updateMatrixWorld(true);
    this.sky.apply(s.light, cam, this.r.scene, new THREE.Vector3(...c.look), s.sun, s.R, s.center);
    this.pool.place(actorsAt(f, this.sets), cam, LIGHTS[s.light].actorShadow);
    const d = s.dof(f);
    cam.getWorldDirection(this.fwd);
    const fd = this.fp.set(...d.focus).sub(cam.position).dot(this.fwd);
    this.r.render(s.light, fd, d.cInf);
  }
}

export const IceKing: React.FC = () => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);
  const film = useRef<Film | null>(null);
  useLayoutEffect(() => {
    const h = delayRender("ice frame " + f);
    try {
      if (!film.current) film.current = new Film(ref.current!, width, height);
      film.current.frame(f);
    } finally { continueRender(h); }
  }, [f, width, height]);
  const fl = flashAt(f);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <canvas ref={ref} width={width} height={height} style={{ width: "100%", height: "100%" }} />
      {fl > 0 && <AbsoluteFill style={{ background: "#ffffff", opacity: fl }} />}
    </AbsoluteFill>
  );
};
