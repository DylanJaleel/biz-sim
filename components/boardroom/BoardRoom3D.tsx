"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { SEAT_ORDER } from "@/lib/game/startups";
import type { SeatId, SpeakerId, Vote } from "@/lib/game/types";
import { VOTE_LABEL } from "./derive";
import type { People } from "./people";

// Was der Raum zeigt, egal ob als 3D-Szene oder als Tisch von oben.
export interface SceneState {
  members: SeatId[];
  active: SpeakerId[];
  link?: { from: SpeakerId; to: SpeakerId; relation: "agree" | "disagree" };
  votes: Partial<Record<SpeakerId, Vote>>;
}

// Der Ratstisch im Halbrund als ruhige 3D-Szene. Modellfiguren aus Grundformen, keine Modelldateien.
// Wer spricht, bekommt Licht und ein leuchtendes Mikrofon, der Rest des Raums tritt zurück.

interface Seat {
  group: THREE.Group;
  person: THREE.Group;
  plate: THREE.MeshStandardMaterial;
  ring: THREE.MeshStandardMaterial;
}

interface Room {
  update(scene: SceneState): void;
  dispose(): void;
}

const VOTE_COLOR: Record<Vote, number> = { go: 0x2fb36f, conditions: 0xe7a23a, no: 0xe5584b };
const PLATE = new THREE.Color(0xf4f6f8);
const BLACK = new THREE.Color(0x000000);
const RING_ON = new THREE.Color(0xff5a4a);
const UP = new THREE.Vector3(0, 1, 0);

function token(name: string, fallback: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function createRoom(host: HTMLDivElement, canvas: HTMLCanvasElement, tags: () => (HTMLElement | null)[], youTag: () => HTMLElement | null): Room {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  const background = new THREE.Color();
  scene.background = background;
  const fog = new THREE.Fog(0xffffff, 14, 30);
  scene.fog = fog;
  const camera = new THREE.PerspectiveCamera(26, 16 / 9, 0.1, 80);

  const M = {
    floor: new THREE.MeshStandardMaterial({ roughness: 1 }),
    inlay: new THREE.MeshStandardMaterial({ roughness: 0.95 }),
    top: new THREE.MeshStandardMaterial({ roughness: 0.34, metalness: 0.04 }),
    plinth: new THREE.MeshStandardMaterial({ roughness: 0.85 }),
    chair: new THREE.MeshStandardMaterial({ roughness: 0.72 }),
    figure: new THREE.MeshStandardMaterial({ roughness: 0.88 }),
    metal: new THREE.MeshStandardMaterial({ color: 0x9aa3b0, roughness: 0.3, metalness: 0.85 }),
    paper: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }),
  };
  const dotMat = new THREE.MeshBasicMaterial({ toneMapped: false });

  function applyTheme() {
    background.set(token("--room-bg", "#eef1f5"));
    fog.color.copy(background);
    M.floor.color.set(token("--room-floor", "#e6eaf0"));
    M.inlay.color.set(token("--room-inlay", "#dde2ea"));
    M.top.color.set(token("--room-top", "#2a3240"));
    M.plinth.color.set(token("--room-plinth", "#4b5361"));
    M.chair.color.set(token("--room-chair", "#9aa3b1"));
    M.figure.color.set(token("--room-figure", "#eceef2"));
    dotMat.color.set(token("--accent", "#2342f5"));
  }

  const hemi = new THREE.HemisphereLight(0xffffff, 0x8a8f99, 1.5);
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(-4.5, 10, 6.5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  const fill = new THREE.DirectionalLight(0xe4ebff, 0.55);
  fill.position.set(6, 4, 4);
  scene.add(hemi, key, fill);

  function makeSpot(shadow: boolean) {
    const s = new THREE.SpotLight(0xfff0d6, 0, 4.5, 0.26, 0.65, 1.2);
    s.castShadow = shadow;
    if (shadow) {
      s.shadow.mapSize.set(1024, 1024);
      s.shadow.bias = -0.0004;
    }
    scene.add(s, s.target);
    return s;
  }
  const spots = [makeSpot(true), makeSpot(false)];
  const want = new Map<THREE.Light, number>([
    [hemi, 1.5],
    [key, 2.2],
    [spots[0]!, 0],
    [spots[1]!, 0],
  ]);

  function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D, shadow = true) {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = shadow;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function box(w: number, h: number, d: number, mat: THREE.Material, parent: THREE.Object3D, x: number, y: number, z: number) {
    const m = mesh(new THREE.BoxGeometry(w, h, d), mat, parent);
    m.position.set(x, y, z);
    return m;
  }
  function limb(a: [number, number, number], b: [number, number, number], r: number, mat: THREE.Material, parent: THREE.Object3D) {
    const A = new THREE.Vector3(...a);
    const B = new THREE.Vector3(...b);
    const dir = new THREE.Vector3().subVectors(B, A);
    const m = mesh(new THREE.CapsuleGeometry(r, Math.max(0.001, dir.length()), 6, 14), mat, parent);
    m.position.copy(A).add(B).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(UP, dir.normalize());
    return m;
  }

  const floor = mesh(new THREE.PlaneGeometry(60, 60), M.floor, scene, false);
  floor.rotation.x = -Math.PI / 2;

  // Lokal schaut jeder Platz nach +z, die Tischkante liegt bei z = 0.42.
  function chair(parent: THREE.Object3D) {
    box(0.52, 0.07, 0.5, M.chair, parent, 0, 0.45, -0.02);
    box(0.5, 0.7, 0.07, M.chair, parent, 0, 0.88, -0.29).rotation.x = -0.1;
    for (const d of [-1, 1]) {
      box(0.05, 0.035, 0.36, M.chair, parent, 0.28 * d, 0.66, -0.04);
      box(0.035, 0.18, 0.035, M.metal, parent, 0.28 * d, 0.56, -0.12);
    }
    mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.36, 12), M.metal, parent).position.y = 0.24;
    mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.03, 28), M.metal, parent).position.y = 0.04;
  }
  function figure(parent: THREE.Object3D) {
    const F = M.figure;
    const hips = mesh(new THREE.CapsuleGeometry(0.12, 0.16, 6, 14), F, parent);
    hips.rotation.z = Math.PI / 2;
    hips.position.set(0, 0.58, -0.08);
    for (const d of [-1, 1]) {
      limb([0.1 * d, 0.57, -0.06], [0.11 * d, 0.58, 0.32], 0.074, F, parent);
      limb([0.11 * d, 0.56, 0.34], [0.11 * d, 0.1, 0.38], 0.058, F, parent);
      box(0.09, 0.06, 0.22, F, parent, 0.11 * d, 0.035, 0.45);
      limb([0.23 * d, 1.1, -0.1], [0.25 * d, 0.86, 0.12], 0.054, F, parent);
      limb([0.25 * d, 0.86, 0.12], [0.15 * d, 0.835, 0.5], 0.047, F, parent);
      const hand = mesh(new THREE.SphereGeometry(0.05, 16, 12), F, parent);
      hand.position.set(0.14 * d, 0.835, 0.54);
      hand.scale.set(0.9, 0.7, 1.2);
    }
    const torso = mesh(new THREE.CapsuleGeometry(0.16, 0.3, 8, 18), F, parent);
    torso.scale.set(1.22, 1, 0.74);
    torso.position.set(0, 0.9, -0.1);
    torso.rotation.x = 0.09;
    mesh(new THREE.CylinderGeometry(0.048, 0.054, 0.12, 14), F, parent).position.set(0, 1.21, -0.07);
    const head = mesh(new THREE.SphereGeometry(0.105, 28, 20), F, parent);
    head.scale.set(0.92, 1.14, 1);
    head.position.set(0, 1.34, -0.05);
  }
  function seat(parent: THREE.Object3D, x: number, z: number, rot: number): Seat {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rot;
    parent.add(group);
    chair(group);
    const person = new THREE.Group();
    group.add(person);
    figure(person);
    const plate = new THREE.MeshStandardMaterial({ color: PLATE.clone(), roughness: 0.5 });
    box(0.36, 0.1, 0.025, plate, person, 0, 0.83, 0.7).rotation.x = -0.32;
    mesh(new THREE.CylinderGeometry(0.035, 0.042, 0.016, 18), M.metal, person).position.set(0.22, 0.785, 0.62);
    limb([0.22, 0.79, 0.62], [0.18, 1.0, 0.48], 0.006, M.metal, person);
    limb([0.18, 1.0, 0.48], [0.165, 1.02, 0.43], 0.013, M.plinth, person);
    const ring = new THREE.MeshStandardMaterial({ color: 0x2b313c, roughness: 0.5 });
    const ringMesh = mesh(new THREE.TorusGeometry(0.038, 0.006, 8, 28), ring, person, false);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.set(0.22, 0.795, 0.62);
    return { group, person, plate, ring };
  }
  function band(r0: number, r1: number, a0: number, a1: number, y: number, h: number, mat: THREE.Material, bevel: boolean) {
    const s = new THREE.Shape();
    s.absarc(0, 0, r1, a0, a1, false);
    s.absarc(0, 0, r0, a1, a0, true);
    s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: h, curveSegments: 96, bevelEnabled: bevel, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 3 });
    geo.rotateX(-Math.PI / 2);
    mesh(geo, mat, scene).position.y = y;
  }

  const RI = 2.05;
  const RO = 2.95;
  band(RI, RO, -0.3, Math.PI + 0.3, 0.72, 0.05, M.top, true);
  band(RI + 0.36, RI + 0.46, -0.21, Math.PI + 0.21, 0, 0.71, M.plinth, false);
  const inlay = mesh(new THREE.CircleGeometry(1.55, 96), M.inlay, scene, false);
  inlay.rotation.x = -Math.PI / 2;
  inlay.position.y = 0.003;

  // Dein Platz an der offenen Seite: ein Pult mit der Vorlage.
  const desk = new THREE.Group();
  desk.position.z = 1.9;
  scene.add(desk);
  box(1.1, 0.04, 0.56, M.top, desk, 0, 0.75, 0);
  box(0.95, 0.7, 0.05, M.plinth, desk, 0, 0.36, -0.2);
  for (const d of [-1, 1]) box(0.05, 0.72, 0.5, M.plinth, desk, 0.5 * d, 0.37, 0);
  box(0.21, 0.004, 0.297, M.paper, desk, -0.05, 0.773, 0.02).rotation.y = 0.12;
  box(0.21, 0.004, 0.297, M.paper, desk, 0.18, 0.772, 0.04).rotation.y = -0.2;

  const seats = [0.9, 0.7, 0.5, 0.3, 0.1].map((f) => {
    const a = f * Math.PI;
    const r = RO + 0.42;
    return seat(scene, r * Math.cos(a), -r * Math.sin(a), Math.atan2(-Math.cos(a), Math.sin(a)));
  });

  const arcDots = Array.from({ length: 24 }, () => {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), dotMat);
    d.visible = false;
    scene.add(d);
    return d;
  });

  const BASE_CAM = new THREE.Vector3(0, 5.0, 9.9);
  const BASE_LOOK = new THREE.Vector3(0, 0.72, -0.85);
  const camPos = new THREE.Vector3();
  const camLook = new THREE.Vector3();
  const wantPos = new THREE.Vector3();
  const wantLook = new THREE.Vector3();
  let state: SceneState | null = null;
  let first = true;
  let visible = true;
  let frame = 0;
  let last = performance.now();

  const slotOf = (id: SeatId) => SEAT_ORDER.indexOf(id);
  const headTop = (s: Seat, y: number) => s.group.localToWorld(new THREE.Vector3(0, y, -0.05));
  // Dein Platz ist das Pult: Linien zu dir enden über der Vorlage.
  const anchor = (id: SpeakerId, y: number) => (id === "you" ? new THREE.Vector3(0, y - 0.35, 1.9) : headTop(seats[slotOf(id)]!, y));

  function aim(light: THREE.SpotLight, s: Seat | undefined, power: number) {
    if (!s) {
      want.set(light, 0);
      return;
    }
    const p = s.group.position;
    light.position.set(p.x * 0.55, 4.0, p.z * 0.55 + 0.4);
    light.target.position.set(p.x, 1.0, p.z);
    want.set(light, power);
  }

  function update(next: SceneState) {
    state = next;
    const seated = new Set(next.members);
    const active = next.active.filter((id): id is SeatId => id !== "you" && seated.has(id));
    SEAT_ORDER.forEach((id, i) => {
      const s = seats[i]!;
      s.person.visible = seated.has(id);
      s.ring.emissive.copy(active.includes(id) ? RING_ON : BLACK);
      s.ring.emissiveIntensity = 1.6;
      const vote = next.votes[id];
      s.plate.color.copy(PLATE);
      if (vote) s.plate.color.lerp(new THREE.Color(VOTE_COLOR[vote]), 0.75);
      s.plate.emissive.set(vote ? VOTE_COLOR[vote] : 0x000000);
      s.plate.emissiveIntensity = 0.45;
    });
    scene.updateMatrixWorld(true);

    wantPos.copy(BASE_CAM);
    wantLook.copy(BASE_LOOK);
    const aspect = host.clientWidth / Math.max(1, host.clientHeight);
    if (aspect < 1.7) wantPos.sub(wantLook).multiplyScalar(Math.pow(1.7 / aspect, 0.9)).add(wantLook);
    if (active.length === 1) {
      const p = seats[slotOf(active[0]!)]!.group.position;
      wantLook.x += p.x * 0.28;
      wantLook.z += p.z * 0.18;
      wantPos.x += p.x * 0.22;
      wantPos.sub(wantLook).multiplyScalar(0.94).add(wantLook);
    }
    const speaking = active.length > 0;
    want.set(hemi, speaking ? 0.5 : 1.5);
    want.set(key, speaking ? 0.75 : 2.2);
    aim(spots[0]!, active[0] ? seats[slotOf(active[0])] : undefined, 70);
    aim(spots[1]!, active[1] ? seats[slotOf(active[1])] : undefined, 55);
    for (const d of arcDots) d.visible = Boolean(next.link);

    if (first || reduced) {
      camPos.copy(wantPos);
      camLook.copy(wantLook);
      for (const [light, value] of want) light.intensity = value;
      first = false;
    }
    if (!frame) loop();
  }

  function loop() {
    frame = 0;
    if (!visible || !state) return;
    const now = performance.now();
    const dt = Math.min(0.25, (now - last) / 1000);
    last = now;
    const k = reduced ? 1 : 1 - Math.pow(0.02, dt);
    camPos.lerp(wantPos, k);
    camLook.lerp(wantLook, k);
    let settling = camPos.distanceTo(wantPos) > 0.002;
    for (const [light, value] of want) {
      light.intensity += (value - light.intensity) * k;
      if (Math.abs(value - light.intensity) > 0.02) settling = true;
    }
    const drift = reduced ? 0 : Math.sin(now / 5200) * 0.12;
    camera.position.set(camPos.x + drift, camPos.y, camPos.z);
    camera.lookAt(camLook);

    if (state.link) {
      const a = anchor(state.link.from, 1.62);
      const b = anchor(state.link.to, 1.62);
      const mid = a.clone().add(b).multiplyScalar(0.5);
      mid.y += 1.0;
      mid.x *= 0.8;
      mid.z *= 0.8;
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      const offset = reduced || state.link.relation === "agree" ? 0 : (now / 1000) * 0.12;
      arcDots.forEach((d, j) => {
        const t = (j / arcDots.length + offset) % 1;
        d.position.copy(curve.getPoint(t));
        d.scale.setScalar(0.5 + 0.7 * Math.sin(t * Math.PI));
      });
    }

    const w = host.clientWidth;
    const h = host.clientHeight;
    const els = tags();
    seats.forEach((s, i) => {
      const el = els[i];
      if (!el) return;
      const v = headTop(s, 1.6).project(camera);
      el.style.transform = `translate(${(((v.x + 1) / 2) * w).toFixed(1)}px, ${(((1 - v.y) / 2) * h).toFixed(1)}px) translate(-50%, -100%)`;
    });
    const you = youTag();
    if (you) {
      const v = new THREE.Vector3(0, 0.95, 2.05).project(camera);
      you.style.transform = `translate(${(((v.x + 1) / 2) * w).toFixed(1)}px, ${(((1 - v.y) / 2) * h).toFixed(1)}px) translate(-50%, 0)`;
    }
    renderer.render(scene, camera);
    if (settling || !reduced) frame = requestAnimationFrame(loop);
  }

  function resize() {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (state) update(state);
  }

  applyTheme();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host);
  const io = new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    if (visible && !frame) {
      last = performance.now();
      loop();
    }
  });
  io.observe(host);
  const scheme = window.matchMedia("(prefers-color-scheme: dark)");
  const onScheme = () => {
    applyTheme();
    if (state) update(state);
  };
  scheme.addEventListener("change", onScheme);
  resize();

  return {
    update,
    dispose() {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      io.disconnect();
      scheme.removeEventListener("change", onScheme);
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of mats) m.dispose();
        }
      });
      renderer.dispose();
    },
  };
}

interface BoardRoom3DProps {
  scene: SceneState;
  people: People;
  label: string;
  onFail: () => void;
}

export default function BoardRoom3D({ scene, people, label, onFail }: BoardRoom3DProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tagRefs = useRef<(HTMLElement | null)[]>([]);
  const youRef = useRef<HTMLElement | null>(null);
  const roomRef = useRef<Room | null>(null);

  useEffect(() => {
    try {
      roomRef.current = createRoom(hostRef.current!, canvasRef.current!, () => tagRefs.current, () => youRef.current);
    } catch {
      onFail();
    }
    return () => {
      roomRef.current?.dispose();
      roomRef.current = null;
    };
    // Die Szene entsteht einmal; Änderungen laufen über update().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    roomRef.current?.update(scene);
  }, [scene]);

  const seated = new Set(scene.members);
  return (
    <div className="room3d" ref={hostRef} data-link={scene.link ? `${scene.link.from}>${scene.link.to}` : undefined}>
      <canvas ref={canvasRef} role="img" aria-label={label} />
      <div className="room3d__tags" aria-hidden="true">
        {SEAT_ORDER.map((id, i) => {
          if (!seated.has(id)) return <span key={id} ref={(el) => void (tagRefs.current[i] = el)} hidden />;
          const m = people[id];
          const vote = scene.votes[id];
          const on = scene.active.includes(id);
          const cls = ["room3d__tag"];
          if (on) cls.push("is-on");
          if (scene.active.length > 0 && !on) cls.push("is-dim");
          if (vote) cls.push(`room3d__tag--${vote}`);
          return (
            <span key={id} ref={(el) => void (tagRefs.current[i] = el)} className={cls.join(" ")} data-vote={vote}>
              <b>{m.name}</b>
              {vote ? <span className="room3d__vote">{VOTE_LABEL[vote]}</span> : on && <span className="room3d__area">{m.role}</span>}
            </span>
          );
        })}
        <span
          ref={youRef}
          className={["room3d__tag", "room3d__tag--you", scene.active.includes("you") ? "is-on" : "", scene.votes.you ? `room3d__tag--${scene.votes.you}` : ""].join(" ")}
        >
          <b>Du</b>
          {scene.votes.you && <span className="room3d__vote">{VOTE_LABEL[scene.votes.you]}</span>}
        </span>
      </div>
    </div>
  );
}
