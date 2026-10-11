/* ============================================================
   BERMUDA · BLOCK EDITION — shared island data
   One source of truth for terrain, POIs and the minimap.
   ============================================================ */

export type PoiKind = "town" | "port" | "hill" | "runway" | "field";

export interface Poi {
  name: string;
  x: number;
  z: number;
  r: number;
  kind: PoiKind;
  label: string;
}

/** Named locations, laid out like the classic Bermuda island. */
export const POIS: Poi[] = [
  { name: "SHIPYARD", x: -20, z: -70, r: 22, kind: "port", label: "Shipyard" },
  { name: "BULLSEYE", x: -50, z: -48, r: 17, kind: "town", label: "Bullseye" },
  { name: "GRAVEYARD", x: -70, z: -16, r: 17, kind: "field", label: "Graveyard" },
  { name: "OBSERVATORY", x: -60, z: 26, r: 17, kind: "hill", label: "Observatory" },
  { name: "RIM NAM", x: -40, z: 60, r: 17, kind: "town", label: "Rim Nam" },
  { name: "MARS ELECTRIC", x: 2, z: 70, r: 20, kind: "field", label: "Mars Electric" },
  { name: "POCHINOK", x: 40, z: 58, r: 18, kind: "town", label: "Pochinok" },
  { name: "CAPE TOWN", x: 66, z: 34, r: 18, kind: "town", label: "Cape Town" },
  { name: "KERATON", x: 76, z: -6, r: 18, kind: "town", label: "Keraton" },
  { name: "MILL", x: 60, z: -42, r: 17, kind: "field", label: "Mill" },
  { name: "RIVERSIDE", x: 28, z: -64, r: 17, kind: "town", label: "Riverside" },
  { name: "PLANTATION", x: -30, z: 38, r: 18, kind: "field", label: "Plantation" },
  { name: "KATULISTIWA", x: -42, z: -6, r: 17, kind: "town", label: "Katulistiwa" },
  { name: "BIMASAKTI", x: 4, z: -22, r: 24, kind: "runway", label: "Bimasakti" },
  { name: "PEAK", x: 20, z: 16, r: 22, kind: "hill", label: "Peak" },
];

/** Runway strip (Bimasakti) — flat, marked ground. */
export const RUNWAY = { x: 4, z: -22, w: 96, d: 16, rot: 0.34 };

export function islandRadius(th: number): number {
  return 112 + 16 * Math.sin(3 * th + 0.7) + 11 * Math.cos(5 * th - 1.2) + 7 * Math.sin(2 * th + 2.1);
}

export function insideIsland(x: number, z: number, margin = 0): boolean {
  const d = Math.hypot(x, z);
  return d < islandRadius(Math.atan2(z, x)) - margin;
}

export function clampInside(x: number, z: number, margin = 10): { x: number; z: number } {
  const d = Math.hypot(x, z);
  const th = Math.atan2(z, x);
  const lim = islandRadius(th) - margin;
  if (d <= lim) return { x, z };
  if (d < 0.001) return { x: 0, z: 0 };
  return { x: (x / d) * lim, z: (z / d) * lim };
}

function nearPoi(x: number, z: number, pad: number, skipHill = false): boolean {
  for (const p of POIS) {
    if (skipHill && p.kind === "hill") continue;
    const dx = x - p.x;
    const dz = z - p.z;
    if (dx * dx + dz * dz < (p.r + pad) * (p.r + pad)) return true;
  }
  return false;
}

export function inRunway(x: number, z: number): boolean {
  const dx = x - RUNWAY.x;
  const dz = z - RUNWAY.z;
  const c = Math.cos(RUNWAY.rot);
  const s = Math.sin(RUNWAY.rot);
  const lx = dx * c + dz * s;
  const lz = -dx * s + dz * c;
  return Math.abs(lx) < RUNWAY.w / 2 && Math.abs(lz) < RUNWAY.d / 2;
}

/**
 * Terrain top height for a 10×10 tile centred at (cx, cz).
 * Steps are multiples of 1.5 so everything is climbable.
 */
export function tileHeight(cx: number, cz: number): number {
  const d = Math.hypot(cx, cz);
  const th = Math.atan2(cz, cx);
  const R = islandRadius(th);
  if (d > R - 7) return 3; // beach
  if (nearPoi(cx, cz, 4, false) && !nearPoi(cx, cz, -6, true)) return 4.5;
  if (inRunway(cx, cz)) return 4.5;

  let h = 4.5;
  const hill = (hx: number, hz: number, hr: number, max: number) => {
    const dd = Math.hypot(cx - hx, cz - hz);
    if (dd < hr) {
      const steps = Math.max(1, Math.round(((1 - dd / hr) * max) / 1.5));
      h = Math.max(h, 4.5 + steps * 1.5);
    }
  };
  hill(20, 16, 34, 12); // Peak
  hill(-60, 26, 24, 6); // Observatory ridge
  hill(56, -44, 22, 4.5); // Mill rise
  // gentle rolling noise
  const n = Math.sin(cx * 0.09) * Math.cos(cz * 0.075) + Math.sin((cx + cz) * 0.045);
  h += Math.max(0, Math.round(n * 0.5)) * 1.5;
  return Math.min(h, 18);
}

/** Deterministic per-tile colour key: 0 sand, 1-3 grass shades, 4 dirt/path, 5 rock, 6 runway. */
export function tileKind(cx: number, cz: number): number {
  const d = Math.hypot(cx, cz);
  const th = Math.atan2(cz, cx);
  const R = islandRadius(th);
  if (inRunway(cx, cz)) return 6;
  if (d > R - 7) return 0;
  if (nearPoi(cx, cz, -4, false)) return 4;
  const h = tileHeight(cx, cz);
  if (h >= 12) return 5;
  const n = Math.sin(cx * 0.31 + cz * 0.17) * Math.cos(cz * 0.23 - cx * 0.11);
  return n > 0.42 ? 2 : n < -0.42 ? 3 : 1;
}

export const TILE_COLORS: Record<number, string> = {
  0: "#e8cd8c",
  1: "#69a84a",
  2: "#5c9a41",
  3: "#7ab556",
  4: "#9a8252",
  5: "#8a8f83",
  6: "#8f9188",
};

export const TILE = 10;

/** Flight path across the island (used by the drop map). */
export function planePath(t: number): { x: number; z: number; a: number } {
  const a = -0.62;
  const dx = Math.cos(a);
  const dz = Math.sin(a);
  const span = 320;
  const k = (t - 0.5) * span;
  return { x: dx * k, z: dz * k, a };
}

export const SEA_LEVEL = 0.6;
export const PLANE_ALT = 240;
