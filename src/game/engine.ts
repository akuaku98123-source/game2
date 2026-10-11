import * as THREE from "three";
import {
  POIS,
  TILE,
  TILE_COLORS,
  tileHeight,
  tileKind,
  insideIsland,
  clampInside,
  inRunway,
  planePath,
  PLANE_ALT,
  SEA_LEVEL,
  RUNWAY,
} from "./map";

/* ============================================================
   BLOCK FIRE — Bermuda island battle royale engine
   plane → dive → parachute → loot → fight → BOOYAH
   ============================================================ */

export type WeaponId = "pistol" | "smg" | "shotgun" | "ar" | "sniper";

export interface WeaponSpec {
  id: WeaponId;
  name: string;
  code: string;
  rarity: number;
  dmg: number;
  mag: number;
  reserve: number;
  rate: number;
  reload: number;
  spread: number;
  pellets: number;
  recoil: number;
  auto: boolean;
  headMult: number;
  range: number;
  bars: { DAMAGE: number; RATE: number; RANGE: number; CONTROL: number };
}

export const WEAPONS: WeaponSpec[] = [
  {
    id: "pistol",
    name: "M500",
    code: "SIDEARM",
    rarity: 0,
    dmg: 32,
    mag: 6,
    reserve: 42,
    rate: 300,
    reload: 1400,
    spread: 0.013,
    pellets: 1,
    recoil: 0.03,
    auto: false,
    headMult: 2,
    range: 70,
    bars: { DAMAGE: 40, RATE: 34, RANGE: 45, CONTROL: 74 },
  },
  {
    id: "smg",
    name: "MP40",
    code: "SMG",
    rarity: 1,
    dmg: 16,
    mag: 30,
    reserve: 150,
    rate: 74,
    reload: 1600,
    spread: 0.024,
    pellets: 1,
    recoil: 0.015,
    auto: true,
    headMult: 1.8,
    range: 48,
    bars: { DAMAGE: 34, RATE: 92, RANGE: 40, CONTROL: 62 },
  },
  {
    id: "shotgun",
    name: "M1014",
    code: "SHOTGUN",
    rarity: 2,
    dmg: 14,
    mag: 7,
    reserve: 42,
    rate: 560,
    reload: 2100,
    spread: 0.07,
    pellets: 8,
    recoil: 0.06,
    auto: false,
    headMult: 1.6,
    range: 28,
    bars: { DAMAGE: 88, RATE: 30, RANGE: 26, CONTROL: 44 },
  },
  {
    id: "ar",
    name: "AK47",
    code: "ASSAULT RIFLE",
    rarity: 3,
    dmg: 26,
    mag: 30,
    reserve: 180,
    rate: 95,
    reload: 1900,
    spread: 0.016,
    pellets: 1,
    recoil: 0.02,
    auto: true,
    headMult: 2.2,
    range: 110,
    bars: { DAMAGE: 62, RATE: 74, RANGE: 74, CONTROL: 60 },
  },
  {
    id: "sniper",
    name: "AWM",
    code: "SNIPER",
    rarity: 4,
    dmg: 96,
    mag: 5,
    reserve: 30,
    rate: 1250,
    reload: 2600,
    spread: 0.003,
    pellets: 1,
    recoil: 0.075,
    auto: false,
    headMult: 1.9,
    range: 240,
    bars: { DAMAGE: 100, RATE: 14, RANGE: 100, CONTROL: 36 },
  },
];

export const WEAPON_BY_ID: Record<WeaponId, WeaponSpec> = WEAPONS.reduce((a, w) => {
  a[w.id] = w;
  return a;
}, {} as Record<WeaponId, WeaponSpec>);

export const RARITY: { label: string; color: string }[] = [
  { label: "COMMON", color: "#B9C0C7" },
  { label: "UNCOMMON", color: "#5FD36A" },
  { label: "RARE", color: "#4FA8FF" },
  { label: "EPIC", color: "#B45BFF" },
  { label: "LEGENDARY", color: "#FFB020" },
];

export type Phase3 = "plane" | "dive" | "chute" | "ground" | "over";

export interface HudState {
  hp: number;
  maxHp: number;
  ep: number;
  maxEp: number;
  alive: number;
  kills: number;
  phase: Phase3;
  alt: number;
  weapon: WeaponId | null;
  ammo: number;
  reserve: number;
  slots: (WeaponId | null)[];
  active: number;
  reloading: boolean;
  prompt: string | null;
  secs: number;
  px: number;
  pz: number;
  heading: number;
  chuteReady: boolean;
}

export interface MinimapState {
  px: number;
  pz: number;
  heading: number;
  enemies: { x: number; z: number }[];
  loot: { x: number; z: number; c: number }[];
  plane: { x: number; z: number; a: number } | null;
  marker: { x: number; z: number } | null;
  phase: Phase3;
}

export interface OverResult {
  win: boolean;
  score: number;
  kills: number;
  secs: number;
  alive: number;
}

export type GEvent =
  | { t: "stamp"; text: string; sub: string; kind: "head" | "kill" | "loot" | "win"; sx: number; sy: number }
  | { t: "feed"; text: string; mine: boolean }
  | { t: "hurt" }
  | { t: "hit"; head: boolean }
  | { t: "banner"; text: string; sub: string }
  | { t: "lock"; locked: boolean }
  | { t: "prompt"; text: string | null }
  | { t: "autojump" };

export interface Callbacks {
  onHud: (s: HudState) => void;
  onEvent: (e: GEvent) => void;
  onOver: (r: OverResult) => void;
}

type Box = { minX: number; maxX: number; minZ: number; maxZ: number; minY: number; maxY: number };

interface Bot {
  root: THREE.Group;
  mats: THREE.MeshLambertMaterial[];
  legL: THREE.Object3D;
  legR: THREE.Object3D;
  armL: THREE.Object3D;
  armR: THREE.Object3D;
  torso: THREE.Object3D;
  hp: number;
  speed: number;
  dmg: number;
  dead: boolean;
  deathT: number;
  walk: number;
  fireCd: number;
  losCd: number;
  los: boolean;
  strafe: number;
  flash: number;
  name: string;
  scale: number;
  kind: number;
  wx: number;
  wz: number;
  react: number;
}

interface Loot {
  id: number;
  x: number;
  y: number;
  z: number;
  w: WeaponId;
  taken: boolean;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  max: number;
  size: number;
  rot: number;
  rotV: number;
  col: THREE.Color;
}

const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const UP = new THREE.Vector3(0, 1, 0);
const snap = (v: number) => Math.floor(v / TILE) * TILE + TILE / 2;

function rayBox(o: THREE.Vector3, d: THREE.Vector3, b: Box, maxT: number): number {
  let tmin = 0.0001;
  let tmax = maxT;
  const oa = [o.x, o.y, o.z];
  const da = [d.x, d.y, d.z];
  const lo = [b.minX, b.minY, b.minZ];
  const hi = [b.maxX, b.maxY, b.maxZ];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(da[i]) < 1e-8) {
      if (oa[i] < lo[i] || oa[i] > hi[i]) return -1;
      continue;
    }
    const inv = 1 / da[i];
    let t1 = (lo[i] - oa[i]) * inv;
    let t2 = (hi[i] - oa[i]) * inv;
    if (t1 > t2) {
      const t = t1;
      t1 = t2;
      t2 = t;
    }
    if (t1 > tmin) tmin = t1;
    if (t2 < tmax) tmax = t2;
    if (tmin > tmax) return -1;
  }
  return tmin;
}

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------- WebAudio synth ---------------- */
class Sfx {
  ctx: AudioContext | null = null;
  noise: AudioBuffer | null = null;
  master: GainNode | null = null;
  enabled = true;

  init() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.45;
      this.master.connect(this.ctx.destination);
      const len = Math.floor(this.ctx.sampleRate * 0.5);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this.noise = buf;
    } catch {
      this.ctx = null;
    }
  }

  private burst(dur: number, vol: number, freq: number, q: number, type: BiquadFilterType = "bandpass") {
    if (!this.ctx || !this.noise || !this.master || !this.enabled) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = this.ctx.createGain();
    const t = this.ctx.currentTime;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  private tone(f0: number, f1: number, dur: number, vol: number, type: OscillatorType = "square") {
    if (!this.ctx || !this.master || !this.enabled) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const t = this.ctx.currentTime;
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  shot(kind: WeaponId) {
    if (kind === "pistol") {
      this.burst(0.14, 0.45, 1700, 0.8);
      this.tone(300, 90, 0.1, 0.2, "square");
    } else if (kind === "smg") {
      this.burst(0.1, 0.4, 1900, 0.9);
      this.tone(360, 120, 0.07, 0.16, "square");
    } else if (kind === "shotgun") {
      this.burst(0.32, 0.65, 700, 0.5);
      this.tone(140, 40, 0.24, 0.3, "sawtooth");
    } else if (kind === "ar") {
      this.burst(0.16, 0.5, 1400, 0.7);
      this.tone(220, 60, 0.12, 0.24, "sawtooth");
    } else {
      this.burst(0.36, 0.6, 900, 0.6);
      this.tone(320, 50, 0.3, 0.28, "triangle");
    }
  }
  punch() {
    this.burst(0.12, 0.4, 420, 0.7);
    this.tone(160, 70, 0.1, 0.18, "square");
  }
  hit() {
    this.tone(1500, 900, 0.06, 0.16, "square");
  }
  head() {
    this.tone(2100, 1400, 0.1, 0.2, "square");
    this.tone(900, 600, 0.14, 0.12, "triangle");
  }
  kill() {
    this.burst(0.34, 0.5, 420, 0.4, "lowpass");
    this.tone(160, 50, 0.3, 0.24, "square");
  }
  hurt() {
    this.tone(180, 70, 0.25, 0.26, "sawtooth");
    this.burst(0.2, 0.3, 300, 0.6);
  }
  loot() {
    this.tone(660, 990, 0.09, 0.16, "square");
    window.setTimeout(() => this.tone(990, 1320, 0.1, 0.14, "square"), 80);
  }
  reload() {
    this.tone(420, 300, 0.06, 0.13, "square");
    window.setTimeout(() => this.tone(300, 520, 0.07, 0.13, "square"), 220);
  }
  empty() {
    this.tone(900, 400, 0.05, 0.11, "square");
  }
  chute() {
    this.burst(0.5, 0.3, 900, 0.4, "highpass");
    this.tone(420, 700, 0.3, 0.1, "sine");
  }
  win() {
    [523, 659, 784, 1046].forEach((f, i) =>
      window.setTimeout(() => this.tone(f, f * 1.5, 0.24, 0.2, "square"), i * 130)
    );
  }
  over() {
    this.tone(340, 70, 1.1, 0.28, "sawtooth");
  }
  ui() {
    this.tone(600, 900, 0.06, 0.12, "square");
  }
}

export class Game {
  private container: HTMLElement;
  private cb: Callbacks;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private raf = 0;
  private ro: ResizeObserver | null = null;

  private solids: Box[] = [];
  private partMesh!: THREE.InstancedMesh;
  private parts: Particle[] = [];
  private dummy = new THREE.Object3D();
  private tracers: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; t: number; dur: number }[] = [];
  private tracerHead = 0;

  private vm = new THREE.Group();
  private gunVm: THREE.Group | null = null;
  private fistVm = new THREE.Group();
  private vmBase = V(0.3, -0.3, -0.52);
  private vmKick = 0;
  private muzzle = new THREE.Mesh();
  private flashT = 0;
  private bobT = 0;

  private loot: Loot[] = [];
  private lootCrates!: THREE.InstancedMesh;
  private lootBeams!: THREE.InstancedMesh;
  private markerBeam: THREE.Mesh | null = null;
  private bots: Bot[] = [];

  private pos = V(0, 120, 0);
  private vel = V();
  private yaw = 0;
  private pitch = -0.6;
  private recoilP = 0;
  private recoilY = 0;
  private hp = 100;
  private maxHp = 100;
  private ep = 50;
  private maxEp = 50;
  private lastHurt = -99;
  private grounded = false;

  private phase: Phase3 = "plane";
  private running = false;
  private paused = false;
  private finished = false;

  private slots: (WeaponId | null)[] = [null, null];
  private active = 0;
  private ammoMap: Record<string, { ammo: number; reserve: number }> = {};
  private lastShot = 0;
  private reloading = false;
  private reloadEnd = 0;
  private firing = false;
  private bloom = 0;

  private kills = 0;
  private secs = 0;
  private shots = 0;
  private hits = 0;
  private shake = 0;
  private planeT = 0;
  private marker: { x: number; z: number } | null = null;
  private jumpStarted = false;
  private prompt: string | null = null;

  private locked = false;
  readonly touch: boolean;
  private move = { x: 0, y: 0 };
  private keys: Record<string, boolean> = {};
  private lastHud = "";
  private sfx = new Sfx();
  private reduceMotion = false;
  private disposed = false;
  private sun!: THREE.DirectionalLight;

  constructor(container: HTMLElement, cb: Callbacks) {
    this.container = container;
    this.cb = cb;
    this.touch = window.matchMedia("(pointer: coarse)").matches;
    this.reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    this.renderer = new THREE.WebGLRenderer({ antialias: !this.touch, powerPreference: "high-performance", alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.touch ? 1.4 : 2));
    this.renderer.setSize(container.clientWidth || 1, container.clientHeight || 1, false);
    if (!this.touch) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    const el = this.renderer.domElement;
    el.style.display = "block";
    el.style.width = "100%";
    el.style.height = "100%";
    el.style.touchAction = "none";
    container.appendChild(el);

    this.camera = new THREE.PerspectiveCamera(74, 1, 0.1, 1600);
    this.camera.rotation.order = "YXZ";
    this.scene.add(this.camera);
    this.scene.fog = new THREE.Fog(0x9ed6ee, 260, 900);

    this.buildSky();
    this.buildTerrain();
    this.buildPOIs();
    this.buildTrees();
    this.buildLoot();
    this.buildLights();
    this.buildPools();
    this.buildViewmodel();
    this.spawnBots();

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.resize();
    this.bind();
    this.loop();
  }

  /* ================= world ================= */
  private buildSky() {
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(1200, 18, 12),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          top: { value: new THREE.Color("#2f9bdc") },
          bot: { value: new THREE.Color("#d7eef7") },
        },
        vertexShader: "varying float h; void main(){ vec4 wp = modelMatrix * vec4(position,1.0); h = normalize(wp.xyz).y; gl_Position = projectionMatrix * viewMatrix * wp; }",
        fragmentShader: "varying float h; uniform vec3 top; uniform vec3 bot; void main(){ gl_FragColor = vec4(mix(bot, top, clamp(h*1.5+0.12,0.0,1.0)),1.0); }",
      })
    );
    sky.frustumCulled = false;
    this.scene.add(sky);

    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(2400, 2400, 1, 1),
      new THREE.MeshLambertMaterial({ color: 0x2c86c6 })
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = SEA_LEVEL;
    this.scene.add(sea);
  }

  private buildTerrain() {
    const tiles: { x: number; z: number; h: number; k: number }[] = [];
    const half = Math.ceil(155 / TILE);
    for (let i = -half; i <= half; i++) {
      for (let j = -half; j <= half; j++) {
        const cx = i * TILE + TILE / 2;
        const cz = j * TILE + TILE / 2;
        if (!insideIsland(cx, cz, -TILE)) continue;
        tiles.push({ x: cx, z: cz, h: tileHeight(cx, cz), k: tileKind(cx, cz) });
      }
    }
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshLambertMaterial({ vertexColors: false });
    const mesh = new THREE.InstancedMesh(geo, mat, tiles.length);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.receiveShadow = !this.touch;
    const c = new THREE.Color();
    tiles.forEach((t, i) => {
      this.dummy.position.set(t.x, t.h / 2, t.z);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.set(TILE + 0.04, t.h, TILE + 0.04);
      this.dummy.updateMatrix();
      mesh.setMatrixAt(i, this.dummy.matrix);
      c.set(TILE_COLORS[t.k] || "#69a84a");
      c.offsetHSL(0, 0, (Math.random() - 0.5) * 0.03);
      mesh.setColorAt(i, c);
      this.solids.push({
        minX: t.x - TILE / 2,
        maxX: t.x + TILE / 2,
        minZ: t.z - TILE / 2,
        maxZ: t.z + TILE / 2,
        minY: 0,
        maxY: t.h,
      });
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    this.scene.add(mesh);
  }

  private groundY(x: number, z: number): number {
    return tileHeight(snap(x), snap(z));
  }

  private addBox(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: number | string,
    solid = true,
    rotY = 0
  ): THREE.Mesh {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color }));
    m.position.set(x, y + h / 2, z);
    m.rotation.y = rotY;
    m.castShadow = !this.touch && h >= 2;
    m.receiveShadow = !this.touch;
    this.scene.add(m);
    if (solid && rotY === 0) {
      this.solids.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, minY: y, maxY: y + h });
    } else if (solid) {
      const r = (Math.hypot(w, d) / 2) * 0.92;
      this.solids.push({ minX: x - r, maxX: x + r, minZ: z - r, maxZ: z + r, minY: y, maxY: y + h });
    }
    return m;
  }

  private buildPOIs() {
    const rnd = mulberry(20260214);
    const roofCols = [0x8a5a3a, 0x6d7a86, 0x9b6b4a, 0x7a7f6a];
    const wallCols = [0xd9d2be, 0xc9bda3, 0xbfc7c9, 0xd7c9a6];

    POIS.forEach((p) => {
      const base = this.groundY(p.x, p.z);

      if (p.kind === "runway") {
        // runway strip
        const len = RUNWAY.w;
        const strip = this.addBox(RUNWAY.x, base + 0.02, RUNWAY.z, len, 0.12, RUNWAY.d, 0x6f7268, false, RUNWAY.rot);
        strip.receiveShadow = !this.touch;
        for (let i = -4; i <= 4; i++) {
          const lx = (i / 4) * (len / 2 - 6);
          const c = Math.cos(RUNWAY.rot);
          const s = Math.sin(RUNWAY.rot);
          this.addBox(
            RUNWAY.x + lx * c,
            base + 0.14,
            RUNWAY.z + lx * s,
            4,
            0.06,
            1.2,
            0xf2ead6,
            false,
            RUNWAY.rot
          );
        }
        // hangar at the end of the strip
        this.addBox(RUNWAY.x + 46, base, RUNWAY.z + 26, 26, 9, 16, 0x9aa1a6, true, 0.34);
        this.addBox(RUNWAY.x + 46, base + 9, RUNWAY.z + 26, 27, 1.2, 17, 0x7c838a, false, 0.34);
        return;
      }

      const count = p.kind === "port" ? 7 : 4 + Math.floor(rnd() * 3);
      for (let i = 0; i < count; i++) {
        const ang = (i / count) * Math.PI * 2 + rnd() * 0.6;
        const dist = 4 + rnd() * (p.r - 6);
        const bx = p.x + Math.cos(ang) * dist;
        const bz = p.z + Math.sin(ang) * dist;
        if (!insideIsland(bx, bz, 8)) continue;
        const g = this.groundY(bx, bz);
        const roll = rnd();

        if (p.kind === "port" || roll < 0.3) {
          // shipping container
          const w = 6.5;
          const d = 2.6;
          const h = 2.7;
          const rot = rnd() < 0.5 ? 0 : Math.PI / 2;
          this.addBox(bx, g, bz, w, h, d, [0x5f7355, 0x8a6a3a, 0x7b6a4a, 0x6b7a86][Math.floor(rnd() * 4)], true, rot);
          if (rnd() < 0.4) this.addBox(bx, g + h, bz, w * 0.85, h, d * 0.85, 0x54684d, true, rot);
        } else if (roll < 0.62) {
          // house
          const w = 7 + rnd() * 5;
          const d = 6 + rnd() * 4;
          const h = 3.4 + rnd() * 2.2;
          const wall = wallCols[Math.floor(rnd() * wallCols.length)];
          this.addBox(bx, g, bz, w, h, d, wall, true);
          this.addBox(bx, g + h, bz, w + 1.1, 0.7, d + 1.1, roofCols[Math.floor(rnd() * roofCols.length)], false);
          this.addBox(bx, g, bz + d / 2 + 0.02, 1.6, 2.4, 0.2, 0x4a3a28, false);
        } else if (roll < 0.82) {
          // crates cluster
          const s = 1.5 + rnd() * 0.6;
          this.addBox(bx, g, bz, s, s, s, 0x9a7444, true);
          if (rnd() < 0.5) this.addBox(bx + s * 0.7, g, bz + s * 0.3, s * 0.8, s * 0.8, s * 0.8, 0x86643a, true);
          if (rnd() < 0.35) this.addBox(bx, g + s, bz, s * 0.85, s * 0.85, s * 0.85, 0xa9824d, true);
        } else {
          // low wall for cover
          const rot = rnd() * Math.PI;
          this.addBox(bx, g, bz, 7 + rnd() * 4, 2.4, 1, 0xc4b48f, true, rot);
        }
      }

      if (p.kind === "hill") {
        // stone platform + tower on high ground
        this.addBox(p.x, base, p.z, 14, 1.4, 14, 0x9a9d92, true);
        this.addBox(p.x, base + 1.4, p.z, 5, 7, 5, 0xb9bcb0, true);
        this.addBox(p.x, base + 8.4, p.z, 7, 1, 7, 0x8f938a, false);
        if (p.name === "OBSERVATORY") {
          const dome = new THREE.Mesh(
            new THREE.SphereGeometry(4.4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
            new THREE.MeshLambertMaterial({ color: 0xdfe4e8 })
          );
          dome.position.set(p.x + 9, base + 1.4, p.z + 4);
          dome.castShadow = !this.touch;
          this.scene.add(dome);
          this.solids.push({ minX: p.x + 4.6, maxX: p.x + 13.4, minZ: p.z - 0.4, maxZ: p.z + 8.4, minY: base, maxY: base + 4 });
        }
      }

      if (p.name === "MARS ELECTRIC") {
        for (let i = 0; i < 3; i++) {
          const x = p.x - 8 + i * 8;
          this.addBox(x, base, p.z + 14, 5, 14, 5, 0x8b9096, true);
          this.addBox(x, base + 14, p.z + 14, 6.5, 1.4, 6.5, 0x6f747a, false);
        }
      }

      if (p.name === "GRAVEYARD") {
        for (let i = 0; i < 14; i++) {
          const x = p.x + (rnd() - 0.5) * 26;
          const z = p.z + (rnd() - 0.5) * 22;
          const g = this.groundY(x, z);
          this.addBox(x, g, z, 1.4, 2 + rnd() * 1.4, 0.5, 0x9aa0a0, true, rnd() * 0.6 - 0.3);
        }
      }
    });

    // scattered rocks + driftwood on the beach ring
    const rr = mulberry(777);
    for (let i = 0; i < 46; i++) {
      const a = rr() * Math.PI * 2;
      const r = 60 + rr() * 60;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (!insideIsland(x, z, 4)) continue;
      const g = this.groundY(x, z);
      const s = 1.2 + rr() * 2.6;
      this.addBox(x, g, z, s, s * (0.6 + rr() * 0.7), s * 0.9, rr() < 0.5 ? 0x9a9a90 : 0xb5ae9a, true, rr() * 3);
    }
  }

  private buildTrees() {
    const rnd = mulberry(9091);
    const spots: { x: number; z: number; h: number }[] = [];
    let guard = 0;
    while (spots.length < 150 && guard < 5000) {
      guard++;
      const a = rnd() * Math.PI * 2;
      const r = rnd() * 118;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (!insideIsland(x, z, 6)) continue;
      let near = false;
      for (const p of POIS) {
        if (Math.hypot(x - p.x, z - p.z) < p.r + 5) {
          near = true;
          break;
        }
      }
      if (near || inRunway(x, z)) continue;
      spots.push({ x, z, h: this.groundY(x, z) });
    }

    const trunkGeo = new THREE.BoxGeometry(1, 1, 1);
    const leafGeo = new THREE.BoxGeometry(1, 1, 1);
    const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshLambertMaterial({ color: 0x7a5a38 }), spots.length);
    const leafA = new THREE.InstancedMesh(leafGeo, new THREE.MeshLambertMaterial({ color: 0x3f8a3c }), spots.length);
    const leafB = new THREE.InstancedMesh(leafGeo, new THREE.MeshLambertMaterial({ color: 0x4fa247 }), spots.length);
    const col = new THREE.Color();
    spots.forEach((s, i) => {
      const th = 5 + rnd() * 4;
      const tw = 1.3 + rnd() * 0.4;
      this.dummy.position.set(s.x, s.h + th / 2, s.z);
      this.dummy.rotation.set(0, rnd() * 3, 0);
      this.dummy.scale.set(tw, th, tw);
      this.dummy.updateMatrix();
      trunks.setMatrixAt(i, this.dummy.matrix);

      const spread = 5.5 + rnd() * 3.5;
      this.dummy.position.set(s.x, s.h + th + 1.6, s.z);
      this.dummy.scale.set(spread, 3.6, spread);
      this.dummy.updateMatrix();
      leafA.setMatrixAt(i, this.dummy.matrix);
      col.setHSL(0.29 + rnd() * 0.06, 0.5, 0.32 + rnd() * 0.12);
      leafA.setColorAt(i, col);

      this.dummy.position.set(s.x, s.h + th + 3.8, s.z);
      this.dummy.scale.set(spread * 0.6, 2.6, spread * 0.6);
      this.dummy.updateMatrix();
      leafB.setMatrixAt(i, this.dummy.matrix);
      col.setHSL(0.28 + rnd() * 0.06, 0.55, 0.4 + rnd() * 0.1);
      leafB.setColorAt(i, col);

      this.solids.push({
        minX: s.x - tw * 0.6,
        maxX: s.x + tw * 0.6,
        minZ: s.z - tw * 0.6,
        maxZ: s.z + tw * 0.6,
        minY: s.h,
        maxY: s.h + th,
      });
    });
    trunks.instanceMatrix.needsUpdate = true;
    leafA.instanceMatrix.needsUpdate = true;
    leafB.instanceMatrix.needsUpdate = true;
    if (leafA.instanceColor) leafA.instanceColor.needsUpdate = true;
    if (leafB.instanceColor) leafB.instanceColor.needsUpdate = true;
    [trunks, leafA, leafB].forEach((m) => {
      m.castShadow = !this.touch;
      m.receiveShadow = false;
      this.scene.add(m);
    });
  }

  private buildLoot() {
    const rnd = mulberry(4242);
    const table: WeaponId[] = ["pistol", "pistol", "pistol", "smg", "smg", "smg", "shotgun", "shotgun", "ar", "ar", "sniper"];
    let id = 0;
    POIS.forEach((p) => {
      const n = p.kind === "runway" ? 5 : 4;
      for (let i = 0; i < n; i++) {
        const a = rnd() * Math.PI * 2;
        const d = rnd() * (p.r - 3);
        const x = p.x + Math.cos(a) * d;
        const z = p.z + Math.sin(a) * d;
        if (!insideIsland(x, z, 8)) continue;
        this.loot.push({
          id: id++,
          x,
          y: this.groundY(x, z) + 0.55,
          z,
          w: table[Math.floor(rnd() * table.length)],
          taken: false,
        });
      }
    });

    const crateGeo = new THREE.BoxGeometry(1, 1, 1);
    this.lootCrates = new THREE.InstancedMesh(
      crateGeo,
      new THREE.MeshLambertMaterial({ color: 0xffffff }),
      Math.max(1, this.loot.length)
    );
    this.lootCrates.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.lootCrates.frustumCulled = false;

    this.lootBeams = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
      Math.max(1, this.loot.length)
    );
    this.lootBeams.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.lootBeams.frustumCulled = false;

    const c = new THREE.Color();
    this.loot.forEach((l, i) => {
      c.set(RARITY[WEAPON_BY_ID[l.w].rarity].color);
      this.lootCrates.setColorAt(i, c);
      this.lootBeams.setColorAt(i, c);
    });
    if (this.lootCrates.instanceColor) this.lootCrates.instanceColor.needsUpdate = true;
    if (this.lootBeams.instanceColor) this.lootBeams.instanceColor.needsUpdate = true;
    this.scene.add(this.lootCrates);
    this.scene.add(this.lootBeams);
    this.updateLootInstances(0);
  }

  private updateLootInstances(t: number) {
    for (let i = 0; i < this.loot.length; i++) {
      const l = this.loot[i];
      const s = l.taken ? 0.0001 : 1;
      this.dummy.position.set(l.x, l.y, l.z);
      this.dummy.rotation.set(0, t * 1.4 + i, 0);
      this.dummy.scale.set(1.1, 1.1, 1.1).multiplyScalar(s);
      this.dummy.updateMatrix();
      this.lootCrates.setMatrixAt(i, this.dummy.matrix);

      this.dummy.position.set(l.x, l.y + 3.4, l.z);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.set(0.7, 7 * s, 0.7);
      this.dummy.updateMatrix();
      this.lootBeams.setMatrixAt(i, this.dummy.matrix);
    }
    this.lootCrates.instanceMatrix.needsUpdate = true;
    this.lootBeams.instanceMatrix.needsUpdate = true;
  }

  private buildLights() {
    this.scene.add(new THREE.HemisphereLight(0x9fd8f2, 0xcbb980, 0.55));
    const sun = new THREE.DirectionalLight(0xfff3d6, 1.05);
    sun.position.set(60, 90, 40);
    if (!this.touch) {
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      const c = sun.shadow.camera as THREE.OrthographicCamera;
      c.left = -45;
      c.right = 45;
      c.top = 45;
      c.bottom = -45;
      c.near = 1;
      c.far = 240;
      c.updateProjectionMatrix();
      sun.shadow.bias = -0.0018;
    }
    this.scene.add(sun);
    this.scene.add(sun.target);
    this.sun = sun;
  }

  private buildPools() {
    const MAXP = 700;
    this.partMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshBasicMaterial({ toneMapped: false }),
      MAXP
    );
    this.partMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.partMesh.frustumCulled = false;
    const white = new THREE.Color(1, 1, 1);
    for (let i = 0; i < MAXP; i++) {
      this.dummy.position.set(0, -80, 0);
      this.dummy.scale.setScalar(0.0001);
      this.dummy.updateMatrix();
      this.partMesh.setMatrixAt(i, this.dummy.matrix);
      this.partMesh.setColorAt(i, white);
      this.parts.push({
        x: 0,
        y: -80,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        max: 1,
        size: 0.2,
        rot: 0,
        rotV: 0,
        col: new THREE.Color(1, 1, 1),
      });
    }
    this.partMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.partMesh);

    const tGeo = new THREE.BoxGeometry(1, 1, 1);
    for (let i = 0; i < 20; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffe6a8,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      });
      const m = new THREE.Mesh(tGeo, mat);
      m.visible = false;
      m.frustumCulled = false;
      this.scene.add(m);
      this.tracers.push({ mesh: m, mat, t: 0, dur: 0.06 });
    }
  }

  /* ---------------- viewmodel ---------------- */
  private buildGun(spec: WeaponSpec) {
    if (this.gunVm) {
      this.vm.remove(this.gunVm);
      this.gunVm.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
      });
    }
    const g = new THREE.Group();
    const dark = new THREE.MeshBasicMaterial({ color: 0x2c302a });
    const mid = new THREE.MeshBasicMaterial({ color: 0x4a5142 });
    const wood = new THREE.MeshBasicMaterial({ color: 0x7a5230 });
    const skin = new THREE.MeshBasicMaterial({ color: 0xd9a06a });
    const long = spec.id === "sniper" ? 1.05 : spec.id === "shotgun" ? 0.8 : spec.id === "pistol" ? 0.34 : 0.66;

    const blk = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
      b.position.set(x, y, z);
      g.add(b);
      return b;
    };
    blk(0.11, 0.11, 0.14, skin, -0.02, -0.05, -0.1);
    blk(0.1, 0.1, 0.13, skin, 0.16, -0.03, -0.36);
    blk(0.1, 0.13, 0.16 + long * 0.5, dark, 0.06, 0, -0.3);
    blk(0.07, 0.15, 0.15, mid, 0.06, -0.12, -0.26);
    blk(0.06, 0.09, 0.24, wood, 0.06, -0.03, -0.02);
    blk(0.05, 0.05, long, dark, 0.06, 0.06, -0.42 - long / 2);
    if (spec.id === "sniper") {
      blk(0.05, 0.05, 0.22, mid, 0.06, 0.13, -0.4);
      blk(0.06, 0.06, 0.05, dark, 0.06, 0.13, -0.3);
      blk(0.05, 0.05, 0.05, dark, 0.06, 0.13, -0.5);
    }
    if (spec.id === "shotgun") blk(0.07, 0.07, 0.3, wood, 0.06, 0.03, -0.62);
    if (spec.pellets === 1 && spec.auto) blk(0.05, 0.16, 0.1, dark, 0.06, -0.14, -0.34);

    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xffd27a,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    this.muzzle = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.4), flashMat);
    this.muzzle.position.set(0.06, 0.06, -0.55 - long);
    this.muzzle.visible = false;
    g.add(this.muzzle);

    this.gunVm = g;
    this.vm.add(g);
  }

  private buildViewmodel() {
    const skin = new THREE.MeshBasicMaterial({ color: 0xd9a06a });
    const fist = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.24), skin);
    fist.position.set(0.3, -0.28, -0.5);
    const fist2 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.24), skin);
    fist2.position.set(-0.28, -0.3, -0.62);
    this.fistVm.add(fist, fist2);
    this.fistVm.visible = false;
    this.vm.add(this.fistVm);
    this.vm.position.copy(this.vmBase);
    this.camera.add(this.vm);
    this.buildGun(WEAPON_BY_ID.ar);
  }

  /* ================= bots ================= */
  private makeBot(kind: number): { root: THREE.Group; mats: THREE.MeshLambertMaterial[] } {
    const root = new THREE.Group();
    const mats: THREE.MeshLambertMaterial[] = [];
    const pal =
      kind === 0
        ? { main: 0x4f6b8a, dark: 0x33465c, skin: 0xd9a06a, visor: 0x2b2f26 }
        : kind === 1
          ? { main: 0x6b4f8a, dark: 0x46355c, skin: 0xc98f5e, visor: 0x2b2f26 }
          : { main: 0x8a4f4f, dark: 0x5c3333, skin: 0xd9a06a, visor: 0xffb020 };
    const mk = (w: number, h: number, d: number, color: number, x: number, y: number, z: number) => {
      const mat = new THREE.MeshLambertMaterial({ color });
      mats.push(mat);
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      m.position.set(x, y, z);
      m.castShadow = !this.touch;
      root.add(m);
      return m;
    };
    mk(0.78, 0.86, 0.44, pal.main, 0, 1.28, 0);
    mk(0.82, 0.4, 0.5, pal.dark, 0, 1.34, 0);
    mk(0.5, 0.46, 0.48, pal.skin, 0, 1.94, 0);
    mk(0.56, 0.26, 0.54, pal.dark, 0, 2.14, 0);
    mk(0.44, 0.1, 0.1, pal.visor, 0, 1.95, 0.25);

    const armL = new THREE.Group();
    armL.position.set(-0.5, 1.62, 0);
    armL.add(mk(0.2, 0.66, 0.2, pal.main, 0, -0.3, 0));
    root.add(armL);
    const armR = new THREE.Group();
    armR.position.set(0.5, 1.62, 0);
    armR.add(mk(0.2, 0.66, 0.2, pal.main, 0, -0.3, 0));
    root.add(armR);
    const legL = new THREE.Group();
    legL.position.set(-0.2, 0.88, 0);
    legL.add(mk(0.26, 0.86, 0.28, pal.dark, 0, -0.42, 0));
    root.add(legL);
    const legR = new THREE.Group();
    legR.position.set(0.2, 0.88, 0);
    legR.add(mk(0.26, 0.86, 0.28, pal.dark, 0, -0.42, 0));
    root.add(legR);
    mk(0.12, 0.14, 1.0, 0x2b2f26, 0.34, 1.36, 0.42);
    return { root, mats };
  }

  private spawnBots() {
    const rnd = mulberry(31337);
    const names = ["Viper", "Nova", "Blitz", "Kaiju", "Rogue", "Zenith", "Onyx", "Falcon", "Titan", "Ember", "Ghost", "Rex", "Volt", "Saga", "Kilo"];
    const count = 15;
    for (let i = 0; i < count; i++) {
      const poi = POIS[i % POIS.length];
      const a = rnd() * Math.PI * 2;
      const d = rnd() * (poi.r - 2);
      const p = clampInside(poi.x + Math.cos(a) * d, poi.z + Math.sin(a) * d, 10);
      const kind = i % 5 === 4 ? 2 : i % 3 === 2 ? 1 : 0;
      const { root, mats } = this.makeBot(kind);
      const g = this.groundY(p.x, p.z);
      root.position.set(p.x, g, p.z);
      this.scene.add(root);
      const scale = kind === 2 ? 1.18 : kind === 1 ? 0.95 : 1;
      root.scale.setScalar(scale);
      // groups are appended in creation order: armL, armR, legL, legR
      const groups = root.children.filter((c) => c.type === "Group") as THREE.Object3D[];
      this.bots.push({
        root,
        mats,
        armL: groups[0],
        armR: groups[1],
        legL: groups[2],
        legR: groups[3],
        torso: root.children[0],
        hp: kind === 2 ? 220 : kind === 1 ? 90 : 130,
        speed: kind === 2 ? 3.2 : kind === 1 ? 6.4 : 4.8,
        dmg: kind === 2 ? 15 : kind === 1 ? 7 : 10,
        dead: false,
        deathT: 0,
        walk: rnd() * 6,
        fireCd: 1 + rnd() * 2,
        losCd: rnd() * 0.4,
        los: false,
        strafe: rnd() < 0.5 ? 1 : -1,
        flash: 0,
        name: names[i % names.length] + "-" + (10 + Math.floor(rnd() * 89)),
        scale,
        kind,
        wx: poi.x,
        wz: poi.z,
        react: 0,
      });
    }
  }

  private removeBot(b: Bot) {
    this.scene.remove(b.root);
    b.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
    b.mats.forEach((m) => m.dispose());
  }

  /* ================= input ================= */
  private onKey = (e: KeyboardEvent) => {
    const down = e.type === "keydown";
    const k = e.key.toLowerCase();
    this.keys[k] = down;
    if (!this.running || this.paused) return;
    if (!down) return;
    if (k === "r") this.startReload();
    if (k === "e") this.interact();
    if (k === "1") this.swap(0);
    if (k === "2") this.swap(1);
    if (k === "escape" || k === "p") {
      this.pause();
      this.cb.onEvent({ t: "lock", locked: false });
    }
    if (k === " ") e.preventDefault();
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.locked || this.paused) return;
    this.addLook(e.movementX, e.movementY, 0.0022);
  };

  private onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    if (!this.running || this.paused || this.finished) return;
    if (!this.locked && !this.touch && this.phase === "ground") {
      this.lock();
      return;
    }
    this.firing = true;
    this.tryShoot(performance.now());
  };

  private onMouseUp = () => {
    this.firing = false;
  };

  private onLockChange = () => {
    this.locked = document.pointerLockElement === this.renderer.domElement;
    this.cb.onEvent({ t: "lock", locked: this.locked });
    if (!this.locked && this.running && !this.paused && !this.finished && !this.touch) {
      this.pause();
    }
  };

  private onResizeWin = () => this.resize();

  private bind() {
    window.addEventListener("keydown", this.onKey);
    window.addEventListener("keyup", this.onKey);
    window.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mouseup", this.onMouseUp);
    window.addEventListener("resize", this.onResizeWin);
    document.addEventListener("pointerlockchange", this.onLockChange);
    this.renderer.domElement.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  setSound(v: boolean) {
    this.sfx.enabled = v;
    if (v) this.sfx.init();
  }

  private lock() {
    try {
      const p = this.renderer.domElement.requestPointerLock() as unknown as Promise<void> | undefined;
      if (p && typeof p.catch === "function") p.catch(() => undefined);
    } catch {
      /* ignore */
    }
  }

  addLook(dx: number, dy: number, sens: number) {
    if (this.phase === "over") return;
    this.yaw -= dx * sens;
    this.pitch -= dy * sens;
    const lim = Math.PI / 2 - 0.06;
    this.pitch = Math.max(-lim, Math.min(lim, this.pitch));
  }

  /* ================= match control ================= */
  startMatch(marker: { x: number; z: number } | null = null) {
    this.sfx.init();
    this.resetMatch();
    this.marker = marker;
    this.phase = "plane";
    this.running = true;
    this.paused = false;
    this.finished = false;
    this.cb.onEvent({ t: "banner", text: "INBOUND", sub: "PICK YOUR DROP POINT" });
    this.pushHud(true);
  }

  private resetMatch() {
    this.hp = this.maxHp;
    this.ep = this.maxEp;
    this.kills = 0;
    this.secs = 0;
    this.shots = 0;
    this.hits = 0;
    this.slots = [null, null];
    this.active = 0;
    this.ammoMap = {};
    this.reloading = false;
    this.firing = false;
    this.planeT = 0;
    this.jumpStarted = false;
    this.prompt = null;
    this.shake = 0;
    this.vel.set(0, 0, 0);
    this.yaw = 0;
    this.pitch = -0.9;
    this.recoilP = 0;
    this.recoilY = 0;
    this.pos.set(planePath(0).x, PLANE_ALT, planePath(0).z);
    this.bots.forEach((b) => this.removeBot(b));
    this.bots = [];
    this.loot.forEach((l) => (l.taken = false));
    this.spawnBots();
    this.updateLootInstances(0);
    this.buildGun(WEAPON_BY_ID.ar);
    if (this.gunVm) this.gunVm.visible = false;
    this.fistVm.visible = true;
  }

  setMarker(x: number, z: number) {
    const c = clampInside(x, z, 16);
    this.marker = c;
    this.pushHud(true);
  }

  getMarker() {
    return this.marker;
  }

  stats() {
    return { shots: this.shots, hits: this.hits };
  }

  jump() {
    if (this.phase !== "plane") return;
    const from = this.marker ?? clampInside(planePath(this.planeT).x, planePath(this.planeT).z, 40);
    this.marker = from;
    this.phase = "dive";
    this.jumpStarted = true;
    this.pos.set(from.x, PLANE_ALT, from.z);
    this.vel.set(0, -6, 0);
    this.pitch = -1.15;
    // visible drop column so you can read the landing zone from 240 m
    if (!this.markerBeam) {
      this.markerBeam = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 1, 2.2),
        new THREE.MeshBasicMaterial({
          color: 0xff5a1f,
          transparent: true,
          opacity: 0.62,
          depthWrite: false,
          side: THREE.DoubleSide,
          toneMapped: false,
        })
      );
      this.scene.add(this.markerBeam);
    }
    this.markerBeam.visible = true;
    this.markerBeam.position.set(from.x, 70, from.z);
    this.markerBeam.scale.set(1, 140, 1);
    this.sfx.chute();
    if (!this.touch) this.lock(); // aim/steer during the dive
    this.cb.onEvent({ t: "banner", text: "GO!", sub: "STEER TO YOUR LANDING ZONE" });
    this.pushHud(true);
  }

  openChute() {
    if (this.phase !== "dive") return;
    this.phase = "chute";
    this.sfx.chute();
    this.cb.onEvent({ t: "banner", text: "PARACHUTE", sub: "SOFT LANDING" });
    this.pushHud(true);
  }

  pause() {
    if (!this.running || this.finished || this.paused) return;
    this.paused = true;
    this.firing = false;
    if (document.pointerLockElement) document.exitPointerLock();
    this.sfx.ui();
  }

  resume() {
    if (!this.running || this.finished) return;
    this.paused = false;
    this.clock.getDelta();
    if (!this.touch && this.phase !== "plane") this.lock();
    this.sfx.ui();
  }

  stop() {
    this.running = false;
    this.paused = false;
    if (document.pointerLockElement) document.exitPointerLock();
  }

  setMove(x: number, y: number) {
    this.move.x = x;
    this.move.y = y;
  }
  setFire(v: boolean) {
    this.sfx.init();
    this.firing = v;
    if (v) this.tryShoot(performance.now());
  }
  doReload() {
    this.startReload();
  }
  doJump() {
    if (this.phase !== "ground") return;
    if (this.grounded) {
      this.vel.y = 8.4;
      this.grounded = false;
    }
  }
  swap(i: number) {
    if (i < 0 || i > 1) return;
    if (!this.slots[i]) return;
    this.active = i;
    this.reloading = false;
    this.applyWeaponVm();
    this.sfx.ui();
    this.pushHud(true);
  }
  cycleSlot() {
    this.swap(this.active === 0 ? 1 : 0);
  }

  getTouch() {
    return this.touch;
  }

  minimap(): MinimapState {
    const enemies: { x: number; z: number }[] = [];
    for (const b of this.bots) if (!b.dead) enemies.push({ x: b.root.position.x, z: b.root.position.z });
    const loot: { x: number; z: number; c: number }[] = [];
    for (const l of this.loot) if (!l.taken) loot.push({ x: l.x, z: l.z, c: WEAPON_BY_ID[l.w].rarity });
    const pp = this.phase === "plane" || !this.jumpStarted ? planePath(this.planeT) : null;
    return {
      px: this.pos.x,
      pz: this.pos.z,
      heading: this.yaw,
      enemies,
      loot,
      plane: pp ? { x: pp.x, z: pp.z, a: pp.a } : null,
      marker: this.marker,
      phase: this.phase,
    };
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("keydown", this.onKey);
    window.removeEventListener("keyup", this.onKey);
    window.removeEventListener("mousemove", this.onMouseMove);
    window.removeEventListener("mousedown", this.onMouseDown);
    window.removeEventListener("mouseup", this.onMouseUp);
    window.removeEventListener("resize", this.onResizeWin);
    document.removeEventListener("pointerlockchange", this.onLockChange);
    this.ro?.disconnect();
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose();
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  private resize() {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = h > w ? 88 : 74;
    this.camera.updateProjectionMatrix();
  }

  /* ================= weapons ================= */
  private weapon(): WeaponSpec | null {
    const id = this.slots[this.active];
    return id ? WEAPON_BY_ID[id] : null;
  }

  private ammoFor(id: WeaponId) {
    if (!this.ammoMap[id]) {
      const s = WEAPON_BY_ID[id];
      this.ammoMap[id] = { ammo: s.mag, reserve: s.reserve };
    }
    return this.ammoMap[id];
  }

  private applyWeaponVm() {
    const w = this.weapon();
    if (w) {
      this.buildGun(w);
      this.gunVm!.visible = this.phase === "ground";
      this.fistVm.visible = false;
    } else {
      if (this.gunVm) this.gunVm.visible = false;
      this.fistVm.visible = this.phase === "ground";
    }
    this.vm.visible = this.phase === "ground";
  }

  private startReload() {
    const w = this.weapon();
    if (!w || this.reloading || this.phase !== "ground") return;
    const a = this.ammoFor(w.id);
    if (a.ammo >= w.mag || a.reserve <= 0) return;
    this.reloading = true;
    this.reloadEnd = performance.now() + w.reload;
    this.sfx.reload();
    this.pushHud(true);
  }

  interact() {
    const l = this.nearestLoot();
    if (!l) return;
    l.taken = true;
    const spec = WEAPON_BY_ID[l.w];
    const free = this.slots.indexOf(null);
    if (free >= 0) this.slots[free] = l.w;
    else this.slots[this.active] = l.w;
    this.active = this.slots.indexOf(l.w);
    const fresh = this.ammoFor(l.w);
    fresh.ammo = spec.mag;
    fresh.reserve = spec.reserve;
    this.reloading = false;
    this.applyWeaponVm();
    this.sfx.loot();
    this.cb.onEvent({ t: "prompt", text: null });
    this.prompt = null;
    this.cb.onEvent({
      t: "stamp",
      text: spec.name,
      sub: RARITY[spec.rarity].label + " · PICKED UP",
      kind: "loot",
      sx: 0.5,
      sy: 0.62,
    });
    this.cb.onEvent({ t: "feed", text: spec.name, mine: true });
    this.updateLootInstances(this.secs);
    this.pushHud(true);
  }

  private nearestLoot(): Loot | null {
    if (this.phase !== "ground") return null;
    let best: Loot | null = null;
    let bd = 2.8;
    for (const l of this.loot) {
      if (l.taken) continue;
      const d = Math.hypot(l.x - this.pos.x, l.z - this.pos.z);
      if (d < bd) {
        bd = d;
        best = l;
      }
    }
    return best;
  }

  private tryShoot(now: number) {
    if (!this.running || this.paused || this.finished || this.phase !== "ground") return;
    const w = this.weapon();
    if (this.reloading) return;

    if (!w) {
      // melee punch
      if (now - this.lastShot < 460) return;
      this.lastShot = now;
      this.shotsMelee(now);
      return;
    }
    if (now - this.lastShot < w.rate) return;
    const a = this.ammoFor(w.id);
    if (a.ammo <= 0) {
      this.sfx.empty();
      this.lastShot = now + 150;
      this.startReload();
      return;
    }
    this.lastShot = now;
    a.ammo--;
    this.shots += w.pellets;

    const dir = V();
    this.camera.getWorldDirection(dir);
    const spread = w.spread * (1 + this.bloom * 3.2) * (Math.hypot(this.vel.x, this.vel.z) > 5 ? 1.6 : 1);
    const muzzlePos = V();
    this.muzzle.getWorldPosition(muzzlePos);

    for (let p = 0; p < w.pellets; p++) {
      const d = dir.clone();
      const right = V().crossVectors(dir, UP).normalize();
      const up = V().crossVectors(right, dir).normalize();
      d.addScaledVector(right, (Math.random() - 0.5) * 2 * spread);
      d.addScaledVector(up, (Math.random() - 0.5) * 2 * spread);
      this.fireRay(d.normalize(), muzzlePos, w);
    }

    this.flashT = 0.05;
    this.muzzle.rotation.z = Math.random() * 6.28;
    this.muzzle.scale.setScalar(0.8 + Math.random() * 0.6);
    this.vmKick = Math.min(1.6, this.vmKick + w.recoil * 15);
    this.bloom = Math.min(1, this.bloom + 0.15);
    this.recoilP += w.recoil * (0.7 + Math.random() * 0.5);
    this.recoilY += (Math.random() - 0.5) * w.recoil * 0.7;
    this.shake = Math.min(1.3, this.shake + w.recoil * 5);
    this.sfx.shot(w.id);
    this.pushHud();
  }

  private shotsMelee(now: number) {
    const dir = V();
    this.camera.getWorldDirection(dir);
    const origin = V(this.pos.x, this.pos.y + 1.5, this.pos.z);
    this.vmKick = Math.min(1.4, this.vmKick + 0.5);
    this.sfx.punch();
    this.shots++;
    let hitBot: Bot | null = null;
    let bestT = 3.4;
    for (const b of this.bots) {
      if (b.dead) continue;
      const p = b.root.position;
      const s = b.scale;
      const box: Box = {
        minX: p.x - 0.6 * s,
        maxX: p.x + 0.6 * s,
        minZ: p.z - 0.6 * s,
        maxZ: p.z + 0.6 * s,
        minY: p.y,
        maxY: p.y + 2.4 * s,
      };
      const t = rayBox(origin, dir, box, bestT);
      if (t > 0 && t < bestT) {
        bestT = t;
        hitBot = b;
      }
    }
    if (hitBot) {
      this.hits++;
      this.damageBot(hitBot, 42, false, origin.clone().addScaledVector(dir, bestT));
    }
    void now;
  }

  private fireRay(dir: THREE.Vector3, origin: THREE.Vector3, w: WeaponSpec) {
    let bestT = w.range;
    let hitBot: Bot | null = null;
    let head = false;

    for (const b of this.solids) {
      const t = rayBox(origin, dir, b, bestT);
      if (t > 0 && t < bestT) bestT = t;
    }
    if (dir.y < -0.0001) {
      const t = -origin.y / dir.y;
      if (t > 0 && t < bestT) bestT = t;
    }

    for (const b of this.bots) {
      if (b.dead) continue;
      const p = b.root.position;
      const s = b.scale;
      const body: Box = {
        minX: p.x - 0.46 * s,
        maxX: p.x + 0.46 * s,
        minZ: p.z - 0.4 * s,
        maxZ: p.z + 0.4 * s,
        minY: p.y + 0.02,
        maxY: p.y + 1.72 * s,
      };
      const hd: Box = {
        minX: p.x - 0.34 * s,
        maxX: p.x + 0.34 * s,
        minZ: p.z - 0.34 * s,
        maxZ: p.z + 0.34 * s,
        minY: p.y + 1.72 * s,
        maxY: p.y + 2.4 * s,
      };
      const th = rayBox(origin, dir, hd, bestT);
      const tb = rayBox(origin, dir, body, bestT);
      if (th > 0 && th < bestT) {
        bestT = th;
        hitBot = b;
        head = true;
      } else if (tb > 0 && tb < bestT) {
        bestT = tb;
        hitBot = b;
        head = false;
      }
    }

    const end = origin.clone().addScaledVector(dir, bestT);
    this.addTracer(origin, end, 0xffe6a8, 0.055);
    if (hitBot) {
      this.hits++;
      this.damageBot(hitBot, w.dmg * (head ? w.headMult : 1), head, end);
    } else {
      this.burstParticles(end.x, end.y, end.z, 3, ["#e8cd8c", "#cfd6c4"], 2.2, 0.14);
      this.sfx.hit();
    }
  }

  private damageBot(b: Bot, dmg: number, head: boolean, at: THREE.Vector3) {
    b.hp -= dmg;
    b.flash = 0.12;
    b.react = 0.6;
    this.burstParticles(at.x, at.y, at.z, head ? 7 : 4, ["#ff5a1f", "#e7b44c", "#c4472a"], 3.4, head ? 0.2 : 0.15);
    this.cb.onEvent({ t: "hit", head });
    if (b.hp <= 0) this.killBot(b, head);
    else if (head) this.sfx.head();
    else this.sfx.hit();
  }

  private killBot(b: Bot, head: boolean) {
    b.dead = true;
    b.deathT = 0;
    this.kills++;
    const p = b.root.position;
    this.burstParticles(p.x, p.y + 1.2 * b.scale, p.z, head ? 22 : 15, ["#4f6b8a", "#33465c", "#d9a06a"], 5.6, 0.3 * b.scale);
    if (head) this.burstParticles(p.x, p.y + 2.05 * b.scale, p.z, 10, ["#d9a06a", "#ff5a1f"], 7, 0.26 * b.scale);

    const sp = V(p.x, p.y + 1.5 * b.scale, p.z).project(this.camera);
    const sx = (sp.x * 0.5 + 0.5) * 100;
    const sy = (-sp.y * 0.5 + 0.5) * 100;
    const onScreen = sp.z < 1 && sx > -20 && sx < 120 && sy > -20 && sy < 120;
    this.cb.onEvent({
      t: "stamp",
      text: head ? "HEADSHOT" : "ELIMINATED",
      sub: "+" + (head ? 250 : 150) + " · " + b.name,
      kind: head ? "head" : "kill",
      sx: onScreen ? sx / 100 : 0.5,
      sy: onScreen ? sy / 100 : 0.44,
    });
    this.cb.onEvent({ t: "feed", text: b.name, mine: true });
    if (head) this.sfx.head();
    this.sfx.kill();
    this.shake = Math.min(1.4, this.shake + (head ? 0.5 : 0.28));
    this.pushHud(true);
  }

  private hurtPlayer(dmg: number) {
    if (this.finished || this.phase !== "ground") return;
    let rest = dmg;
    if (this.ep > 0) {
      const use = Math.min(this.ep, rest);
      this.ep -= use;
      rest -= use;
    }
    if (rest > 0) this.hp -= rest;
    this.lastHurt = this.secs;
    this.shake = Math.min(1.6, this.shake + 0.45);
    this.sfx.hurt();
    this.cb.onEvent({ t: "hurt" });
    if (this.hp <= 0) {
      this.hp = 0;
      this.finish(false);
    }
    this.pushHud(true);
  }

  private finish(win: boolean) {
    if (this.finished) return;
    this.finished = true;
    this.running = false;
    this.firing = false;
    this.phase = "over";
    if (document.pointerLockElement) document.exitPointerLock();
    if (win) this.sfx.win();
    else this.sfx.over();
    this.cb.onOver({
      win,
      score: this.score(),
      kills: this.kills,
      secs: Math.round(this.secs),
      alive: this.bots.filter((b) => !b.dead).length,
    });
  }

  private score(): number {
    const aliveLeft = this.bots.filter((b) => !b.dead).length;
    return Math.round(this.kills * 150 + (aliveLeft === 0 ? 1200 : 0) + this.secs * 3 + (this.hp + this.ep) * 2);
  }

  /* ================= fx ================= */
  private addTracer(a: THREE.Vector3, b: THREE.Vector3, color: number, dur: number) {
    const t = this.tracers[this.tracerHead];
    this.tracerHead = (this.tracerHead + 1) % this.tracers.length;
    const len = a.distanceTo(b);
    t.mesh.position.copy(a).lerp(b, 0.5);
    t.mesh.lookAt(b);
    t.mesh.scale.set(0.05, 0.05, Math.max(0.2, len));
    t.mesh.visible = true;
    t.mat.color.setHex(color);
    t.mat.opacity = 0.95;
    t.t = dur;
    t.dur = dur;
  }

  private burstParticles(x: number, y: number, z: number, n: number, colors: string[], speed: number, size: number) {
    let spawned = 0;
    for (let i = 0; i < this.parts.length && spawned < n; i++) {
      const p = this.parts[i];
      if (p.life > 0) continue;
      const a = Math.random() * Math.PI * 2;
      const sp = speed * (0.4 + Math.random() * 0.8);
      p.x = x;
      p.y = y;
      p.z = z;
      p.vx = Math.cos(a) * sp;
      p.vz = Math.sin(a) * sp;
      p.vy = (0.2 + Math.random()) * sp;
      p.max = 0.65 + Math.random() * 0.7;
      p.life = p.max;
      p.size = size * (0.6 + Math.random() * 0.9);
      p.rot = Math.random() * 6.28;
      p.rotV = (Math.random() - 0.5) * 12;
      p.col.set(colors[(Math.random() * colors.length) | 0]);
      spawned++;
    }
  }

  /* ================= collision ================= */
  private groundAt(x: number, z: number, feet: number, r: number, step: number): number {
    let g = 0;
    for (const b of this.solids) {
      if (x + r < b.minX || x - r > b.maxX || z + r < b.minZ || z - r > b.maxZ) continue;
      if (b.maxY <= feet + step && b.maxY > g) g = b.maxY;
    }
    return g;
  }

  private slide(p: THREE.Vector3, r: number, feet: number, step: number) {
    const prevX = p.x;
    const prevZ = p.z;
    for (const b of this.solids) {
      if (b.maxY <= feet + step) continue;
      if (b.minY > feet + 1.9) continue;
      const cx = Math.max(b.minX, Math.min(p.x, b.maxX));
      const cz = Math.max(b.minZ, Math.min(p.z, b.maxZ));
      const dx = p.x - cx;
      const dz = p.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-6) {
        const d = Math.sqrt(d2);
        p.x = cx + (dx / d) * r;
        p.z = cz + (dz / d) * r;
      } else {
        const left = p.x - b.minX;
        const right = b.maxX - p.x;
        const top = p.z - b.minZ;
        const bot = b.maxZ - p.z;
        const m = Math.min(left, right, top, bot);
        if (m === left) p.x = b.minX - r;
        else if (m === right) p.x = b.maxX + r;
        else if (m === top) p.z = b.minZ - r;
        else p.z = b.maxZ + r;
      }
    }
    if (!insideIsland(p.x, p.z, 2)) {
      p.x = prevX;
      p.z = prevZ;
      if (!insideIsland(p.x, p.z, 2)) {
        const c = clampInside(prevX, prevZ, 4);
        p.x = c.x;
        p.z = c.z;
      }
    }
  }

  /* ================= loop ================= */
  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, this.clock.getDelta());
    if (this.running && !this.paused) this.update(dt);
    this.renderer.render(this.scene, this.camera);
  };

  private update(dt: number) {
    this.secs += dt;
    switch (this.phase) {
      case "plane":
        this.updatePlane(dt);
        break;
      case "dive":
      case "chute":
        this.updateAir(dt);
        break;
      case "ground":
        this.updateGround(dt);
        break;
      default:
        break;
    }
    this.updateFx(dt);
  }

  private updatePlane(dt: number) {
    this.planeT += dt / 24;
    const p = planePath(this.planeT);
    this.pos.set(p.x, PLANE_ALT, p.z);
    this.yaw = -p.a - Math.PI / 2;
    this.pitch = -1.02;
    this.camera.position.set(p.x, PLANE_ALT + 14, p.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0);
    this.vm.visible = false;
    if (this.planeT >= 1 && !this.jumpStarted) {
      if (!this.marker) this.setMarker(p.x, p.z);
      this.jump();
      this.cb.onEvent({ t: "autojump" });
    }
    this.pushHud();
  }

  private updateAir(dt: number) {
    const chute = this.phase === "chute";
    const ground = this.groundAt(this.pos.x, this.pos.z, this.pos.y, 0.4, 0.4);
    const alt = Math.max(0, this.pos.y - ground);

    let ix = this.move.x;
    let iy = this.move.y;
    if (this.keys["w"] || this.keys["arrowup"]) iy += 1;
    if (this.keys["s"] || this.keys["arrowdown"]) iy -= 1;
    if (this.keys["d"] || this.keys["arrowright"]) ix += 1;
    if (this.keys["a"] || this.keys["arrowleft"]) ix -= 1;
    const mag = Math.hypot(ix, iy);
    if (mag > 1) {
      ix /= mag;
      iy /= mag;
    }
    const fwd = V(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = V(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const speed = chute ? 11 : 22;
    const want = V().addScaledVector(fwd, iy * speed).addScaledVector(right, ix * speed);
    const accel = 2.6;
    this.vel.x += (want.x - this.vel.x) * Math.min(1, accel * dt);
    this.vel.z += (want.z - this.vel.z) * Math.min(1, accel * dt);

    const targetVy = chute ? -10 : -62;
    this.vel.y += (targetVy - this.vel.y) * Math.min(1, (chute ? 3 : 2.2) * dt);

    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    this.pos.y += this.vel.y * dt;

    if (!insideIsland(this.pos.x, this.pos.z, 2)) {
      const c = clampInside(this.pos.x - this.vel.x * dt, this.pos.z - this.vel.z * dt, 3);
      this.pos.x = c.x;
      this.pos.z = c.z;
      this.vel.x *= 0.2;
      this.vel.z *= 0.2;
    }

    this.recoilP *= Math.exp(-dt * 9);
    this.camera.position.set(this.pos.x, this.pos.y + 2, this.pos.z);
    this.camera.rotation.set(this.pitch + this.recoilP, this.yaw + this.recoilY, chute ? Math.sin(this.secs * 1.6) * 0.03 : 0);
    this.vm.visible = false;

    // parachute auto-open
    if (this.phase === "dive" && alt <= 44) this.openChute();

    // landing
    if (this.pos.y <= ground + 0.2) {
      this.pos.y = ground;
      this.vel.set(0, 0, 0);
      this.phase = "ground";
      this.grounded = true;
      if (this.markerBeam) this.markerBeam.visible = false;
      this.pitch = Math.max(-0.35, this.pitch);
      this.applyWeaponVm();
      this.vm.visible = true;
      this.shake = 0.9;
      this.burstParticles(this.pos.x, ground + 0.3, this.pos.z, 26, ["#e8cd8c", "#d7c9a6", "#69a84a"], 5, 0.3);
      this.sfx.chute();
      this.cb.onEvent({ t: "banner", text: "LANDING", sub: "FIND A WEAPON — 15 HOSTILES ALIVE" });
      this.pushHud(true);
    }
    this.pushHud();
  }

  private updateGround(dt: number) {
    const fwd = V(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = V(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    let ix = this.move.x;
    let iy = this.move.y;
    if (this.keys["w"] || this.keys["arrowup"]) iy += 1;
    if (this.keys["s"] || this.keys["arrowdown"]) iy -= 1;
    if (this.keys["d"] || this.keys["arrowright"]) ix += 1;
    if (this.keys["a"] || this.keys["arrowleft"]) ix -= 1;
    const mag = Math.hypot(ix, iy);
    if (mag > 1) {
      ix /= mag;
      iy /= mag;
    }
    const sprint = this.keys["shift"] || (this.touch && Math.min(1, mag) > 0.92) ? 1.34 : 1;
    const speed = 7.2 * sprint;
    const want = V().addScaledVector(fwd, iy * speed).addScaledVector(right, ix * speed);
    const accel = this.grounded ? 15 : 6;
    this.vel.x += (want.x - this.vel.x) * Math.min(1, accel * dt);
    this.vel.z += (want.z - this.vel.z) * Math.min(1, accel * dt);

    if ((this.keys[" "] || this.keys["jump"]) && this.grounded) {
      this.vel.y = 8.4;
      this.grounded = false;
    }
    this.vel.y -= 24 * dt;

    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    this.slide(this.pos, 0.45, this.pos.y, 1.7);
    this.pos.y += this.vel.y * dt;
    const g = this.groundAt(this.pos.x, this.pos.z, this.pos.y, 0.3, 1.7);
    if (this.pos.y <= g) {
      this.pos.y = g;
      this.vel.y = 0;
      this.grounded = true;
    } else this.grounded = false;

    // regen
    if (this.secs - this.lastHurt > 6) {
      if (this.hp < this.maxHp) this.hp = Math.min(this.maxHp, this.hp + 9 * dt);
      if (this.ep < this.maxEp) this.ep = Math.min(this.maxEp, this.ep + 6 * dt);
    }

    const planar = Math.hypot(this.vel.x, this.vel.z);
    this.bobT += dt * planar * 1.5;
    this.recoilP *= Math.exp(-dt * 9);
    this.recoilY *= Math.exp(-dt * 9);
    const bobY = this.grounded ? Math.sin(this.bobT * 2) * 0.035 * Math.min(1, planar / 6) : 0;
    const bobX = this.grounded ? Math.cos(this.bobT) * 0.03 * Math.min(1, planar / 6) : 0;
    this.camera.position.set(this.pos.x + bobX * 0.3, this.pos.y + 1.62 + bobY, this.pos.z);
    this.camera.rotation.set(this.pitch + this.recoilP, this.yaw + this.recoilY, 0);
    if (!this.reduceMotion && this.shake > 0.002) {
      const s = this.shake * 0.085;
      this.camera.position.x += (Math.random() - 0.5) * s;
      this.camera.position.y += (Math.random() - 0.5) * s;
      this.camera.rotation.x += (Math.random() - 0.5) * this.shake * 0.03;
      this.camera.rotation.y += (Math.random() - 0.5) * this.shake * 0.03;
      this.camera.rotation.z += (Math.random() - 0.5) * this.shake * 0.028;
    }
    this.vm.visible = true;

    // viewmodel animation
    this.vmKick *= Math.exp(-dt * 11);
    this.bloom = Math.max(0, this.bloom - dt * 1.1);
    if (this.flashT > 0) {
      this.flashT -= dt;
      if (this.muzzle) this.muzzle.visible = this.flashT > 0;
    } else if (this.muzzle) this.muzzle.visible = false;

    if (this.reloading) {
      const left = this.reloadEnd - performance.now();
      if (left <= 0) {
        const w = this.weapon();
        if (w) {
          const a = this.ammoFor(w.id);
          const take = Math.min(w.mag - a.ammo, a.reserve);
          a.ammo += take;
          a.reserve -= take;
        }
        this.reloading = false;
        this.pushHud(true);
      }
    }
    const w2 = this.weapon();
    const rl = this.reloading && w2 ? 1 - Math.max(0, this.reloadEnd - performance.now()) / w2.reload : 0;
    const reloadRot = this.reloading ? Math.sin(Math.max(0, Math.min(1, rl)) * Math.PI) * 1.1 : 0;
    const bx = Math.sin(this.bobT) * 0.02 * Math.min(1, planar / 6);
    const by = Math.abs(Math.cos(this.bobT)) * 0.018 * Math.min(1, planar / 6);
    this.vm.position.set(this.vmBase.x + bx, this.vmBase.y + by - this.vmKick * 0.02, this.vmBase.z + this.vmKick * 0.09);
    this.vm.rotation.set(-this.vmKick * 0.16 + reloadRot, -this.vmKick * 0.05, reloadRot * 0.4);

    if (this.firing && w2?.auto) this.tryShoot(performance.now());

    // prompt
    const near = this.nearestLoot();
    const txt = near ? "PICK UP " + WEAPON_BY_ID[near.w].name : null;
    if (txt !== this.prompt) {
      this.prompt = txt;
      this.cb.onEvent({ t: "prompt", text: txt });
    }

    this.updateBots(dt);
    this.updateLootInstances(this.secs);

    if (this.bots.filter((b) => !b.dead).length === 0) this.finish(true);
    this.pushHud();
  }

  private updateBots(dt: number) {
    const eye = V(this.pos.x, this.pos.y + 1.5, this.pos.z);
    for (let i = this.bots.length - 1; i >= 0; i--) {
      const b = this.bots[i];
      if (b.dead) {
        b.deathT += dt;
        b.root.rotation.z = Math.min(Math.PI / 2, b.deathT * 4.4);
        if (b.deathT > 0.45) {
          this.burstParticles(b.root.position.x, b.root.position.y + 0.6, b.root.position.z, 8, ["#4f6b8a", "#6b4f8a", "#33465c"], 4, 0.26);
          this.removeBot(b);
          this.bots.splice(i, 1);
        }
        continue;
      }
      const p = b.root.position;
      const toP = V(this.pos.x - p.x, 0, this.pos.z - p.z);
      const dist = toP.length();
      toP.normalize();

      // line of sight
      b.losCd -= dt;
      if (b.losCd <= 0) {
        b.losCd = 0.3;
        const origin = V(p.x, p.y + 1.5 * b.scale, p.z);
        const dir = V(eye.x - origin.x, eye.y - origin.y, eye.z - origin.z);
        const dlen = dir.length();
        dir.normalize();
        let blocked = false;
        for (const bx of this.solids) {
          if (rayBox(origin, dir, bx, dlen) > 0) {
            blocked = true;
            break;
          }
        }
        b.los = !blocked && dist < 62;
      }

      const engaged = b.los && dist < 58;
      if (engaged && b.react > 0) b.react -= dt;

      let moveDir: THREE.Vector3 | null = null;
      if (engaged) {
        if (dist > 22) moveDir = toP.clone();
        else if (dist < 9) moveDir = toP.clone().negate();
        else {
          moveDir = V(-toP.z, 0, toP.x).multiplyScalar(b.strafe);
          if (Math.random() < dt * 0.6) b.strafe *= -1;
        }
      } else {
        // wander to a waypoint
        const wd = Math.hypot(b.wx - p.x, b.wz - p.z);
        if (wd < 5) {
          const poi = POIS[Math.floor(Math.random() * POIS.length)];
          b.wx = poi.x + (Math.random() - 0.5) * 24;
          b.wz = poi.z + (Math.random() - 0.5) * 24;
        }
        moveDir = V(b.wx - p.x, 0, b.wz - p.z).normalize();
      }

      if (moveDir) {
        const sp = b.speed * (engaged ? 0.8 : 1);
        p.x += moveDir.x * sp * dt;
        p.z += moveDir.z * sp * dt;
        this.slide(p, 0.5 * b.scale, p.y, 2.1);
        for (const o of this.bots) {
          if (o === b || o.dead) continue;
          const dx = p.x - o.root.position.x;
          const dz = p.z - o.root.position.z;
          const d2 = dx * dx + dz * dz;
          const min = (b.scale + o.scale) * 0.55;
          if (d2 < min * min && d2 > 1e-5) {
            const d = Math.sqrt(d2);
            p.x += (dx / d) * (min - d) * 0.5;
            p.z += (dz / d) * (min - d) * 0.5;
          }
        }
        b.walk += dt * sp * 2.4;
      }
      const ground = this.groundAt(p.x, p.z, p.y + 1.6, 0.4, 2.1);
      p.y += (ground - p.y) * Math.min(1, dt * 9);

      const swing = Math.sin(b.walk * 2.2) * 0.7;
      b.legL.rotation.x = swing;
      b.legR.rotation.x = -swing;
      b.armL.rotation.x = -swing * 0.5;
      b.armR.rotation.x = swing * 0.3 - 0.9;
      b.torso.position.y = 1.28 + Math.abs(Math.sin(b.walk * 2.2)) * 0.05;

      const targetYaw = engaged ? Math.atan2(toP.x, toP.z) : Math.atan2(moveDir?.x ?? 0, moveDir?.z ?? 1);
      let dy = targetYaw - b.root.rotation.y;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      b.root.rotation.y += dy * Math.min(1, dt * 7);

      if (b.flash > 0) {
        b.flash -= dt;
        const on = b.flash > 0;
        b.mats.forEach((m) => m.emissive.setRGB(on ? 0.6 : 0, on ? 0.25 : 0, on ? 0.08 : 0));
      }

      b.fireCd -= dt;
      if (engaged && b.react <= 0 && b.fireCd <= 0) {
        b.fireCd = (b.kind === 2 ? 1.5 : b.kind === 1 ? 1.05 : 1.3) + Math.random() * 0.6;
        const from = V(p.x, p.y + 1.45 * b.scale, p.z);
        const aim = eye.clone();
        const acc = Math.max(0.1, 0.6 - dist * 0.011 - (planarSpeed(this.vel) > 6 ? 0.18 : 0));
        const hit = Math.random() < acc;
        if (!hit) {
          aim.x += (Math.random() - 0.5) * 4.5;
          aim.y += (Math.random() - 0.5) * 3;
          aim.z += (Math.random() - 0.5) * 4.5;
        }
        this.addTracer(from, aim, 0xffb05a, 0.075);
        if (hit) this.hurtPlayer(b.dmg);
        else this.pushHud();
      }
    }
  }

  private updateFx(dt: number) {
    let dirty = false;
    for (let i = 0; i < this.parts.length; i++) {
      const p = this.parts[i];
      if (p.life <= 0) continue;
      dirty = true;
      p.life -= dt;
      p.vy -= 22 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.rot += p.rotV * dt;
      if (p.y < 0.4) {
        p.y = 0.4;
        p.vy *= -0.3;
        p.vx *= 0.72;
        p.vz *= 0.72;
      }
      const k = Math.max(0, p.life / p.max);
      this.dummy.position.set(p.x, p.y, p.z);
      this.dummy.rotation.set(p.rot, p.rot * 0.7, p.rot * 0.4);
      this.dummy.scale.setScalar(p.size * (0.45 + k * 0.75));
      this.dummy.updateMatrix();
      this.partMesh.setMatrixAt(i, this.dummy.matrix);
      this.partMesh.setColorAt(i, p.col);
      if (p.life <= 0) {
        this.dummy.scale.setScalar(0.0001);
        this.dummy.updateMatrix();
        this.partMesh.setMatrixAt(i, this.dummy.matrix);
      }
    }
    if (dirty) {
      this.partMesh.instanceMatrix.needsUpdate = true;
      if (this.partMesh.instanceColor) this.partMesh.instanceColor.needsUpdate = true;
    }
    for (const t of this.tracers) {
      if (t.t > 0) {
        t.t -= dt;
        t.mat.opacity = Math.max(0, t.t / t.dur) * 0.95;
        if (t.t <= 0) t.mesh.visible = false;
      }
    }
    if (this.shake > 0) this.shake *= Math.exp(-dt * 7);

    // keep the shadow frustum on the player
    this.sun.position.set(this.pos.x + 60, 90, this.pos.z + 40);
    this.sun.target.position.set(this.pos.x, 0, this.pos.z);
    this.sun.target.updateMatrixWorld();
  }

  private pushHud(force = false) {
    const w = this.weapon();
    const a = w ? this.ammoFor(w.id) : null;
    const aliveBots = this.bots.filter((b) => !b.dead).length;
    const ground = this.phase === "plane" ? 0 : this.groundAt(this.pos.x, this.pos.z, this.pos.y, 0.3, 1.7);
    const s: HudState = {
      hp: Math.round(this.hp),
      maxHp: this.maxHp,
      ep: Math.round(this.ep),
      maxEp: this.maxEp,
      alive: aliveBots + (this.finished && this.hp <= 0 ? 0 : 1),
      kills: this.kills,
      phase: this.phase,
      alt: Math.max(0, Math.round(this.pos.y - ground)),
      weapon: w ? w.id : null,
      ammo: a ? a.ammo : 0,
      reserve: a ? a.reserve : 0,
      slots: [...this.slots],
      active: this.active,
      reloading: this.reloading,
      prompt: this.prompt,
      secs: Math.round(this.secs),
      px: Math.round(this.pos.x),
      pz: Math.round(this.pos.z),
      heading: this.yaw,
      chuteReady: this.phase === "dive" && this.pos.y - ground < 70,
    };
    const key = `${s.hp}|${s.ep}|${s.alive}|${s.kills}|${s.phase}|${s.alt}|${s.weapon}|${s.ammo}|${s.reserve}|${s.slots.join()}|${s.active}|${s.reloading}|${s.prompt}|${s.secs}|${s.chuteReady}`;
    if (!force && key === this.lastHud) return;
    this.lastHud = key;
    this.cb.onHud(s);
  }
}

function planarSpeed(v: THREE.Vector3) {
  return Math.hypot(v.x, v.z);
}
