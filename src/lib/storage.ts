export interface ScoreRow {
  name: string;
  score: number;
  wave: number;
  kills: number;
  date: number;
}

export interface Profile {
  callsign: string;
  matches: number;
  kills: number;
  bestWave: number;
  bestScore: number;
  shots: number;
  hits: number;
  wins: number;
  loggedIn: boolean;
}

/** Touch-control layout: screen % + scale, edited in Settings. */
export interface CtrlPos {
  x: number;
  y: number;
  s: number;
}
export type Layout = Record<string, CtrlPos>;

export const DEFAULT_LAYOUT: Layout = {
  stick: { x: 15, y: 74, s: 1 },
  fire: { x: 86, y: 72, s: 1 },
  jump: { x: 73, y: 58, s: 1 },
  reload: { x: 63, y: 76, s: 1 },
  swap: { x: 54, y: 74, s: 1 },
  pickup: { x: 36, y: 70, s: 1 },
  chute: { x: 50, y: 62, s: 1 },
  slots: { x: 68, y: 22, s: 1 },
  bars: { x: 50, y: 91, s: 1 },
};

export const CTRL_LABELS: Record<string, string> = {
  stick: "MOVE STICK",
  fire: "FIRE",
  jump: "JUMP",
  reload: "RELOAD",
  swap: "SWAP WEAPON",
  pickup: "PICK UP",
  chute: "PARACHUTE",
  slots: "WEAPON SLOTS",
  bars: "HP / AMMO BARS",
};

const SKEY = "bf.scores.v1";
const PKEY = "bf.profile.v1";
const LKEY = "bf.layout.v1";

export function loadLayout(): Layout {
  try {
    const raw = localStorage.getItem(LKEY);
    if (!raw) return { ...DEFAULT_LAYOUT };
    const parsed = JSON.parse(raw) as Layout;
    const out: Layout = { ...DEFAULT_LAYOUT };
    for (const k of Object.keys(DEFAULT_LAYOUT)) {
      const v = parsed[k];
      if (v && typeof v.x === "number" && typeof v.y === "number" && typeof v.s === "number") {
        out[k] = {
          x: Math.max(4, Math.min(96, v.x)),
          y: Math.max(4, Math.min(96, v.y)),
          s: Math.max(0.6, Math.min(1.7, v.s)),
        };
      }
    }
    return out;
  } catch {
    return { ...DEFAULT_LAYOUT };
  }
}

export function saveLayout(l: Layout) {
  try {
    localStorage.setItem(LKEY, JSON.stringify(l));
  } catch {
    /* ignore */
  }
}

export const EMPTY_PROFILE: Profile = {
  callsign: "BLOCKALPA",
  matches: 0,
  kills: 0,
  bestWave: 0,
  bestScore: 0,
  shots: 0,
  hits: 0,
  wins: 0,
  loggedIn: false,
};

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...(fallback as object), ...JSON.parse(raw) } as T;
  } catch {
    return fallback;
  }
}

export function loadProfile(): Profile {
  return safeRead<Profile>(PKEY, EMPTY_PROFILE);
}

export function saveProfile(p: Profile) {
  try {
    localStorage.setItem(PKEY, JSON.stringify(p));
  } catch {
    /* storage unavailable — session only */
  }
}

export function loadScores(): ScoreRow[] {
  try {
    const raw = localStorage.getItem(SKEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as ScoreRow[]).filter((r) => typeof r?.score === "number").slice(0, 8);
  } catch {
    return [];
  }
}

export function saveScore(row: ScoreRow): { rows: ScoreRow[]; rank: number } {
  const rows = [...loadScores(), row].sort((a, b) => b.score - a.score).slice(0, 8);
  try {
    localStorage.setItem(SKEY, JSON.stringify(rows));
  } catch {
    /* ignore */
  }
  const rank = rows.findIndex((r) => r.date === row.date);
  return { rows, rank };
}

export function rankOf(score: number): { tier: string; next: number; level: number } {
  const level = Math.max(1, Math.floor(Math.sqrt(score / 120)) + 1);
  const tiers = [
    "Bronze I",
    "Bronze II",
    "Silver I",
    "Silver II",
    "Gold I",
    "Gold II",
    "Diamond I",
    "Diamond II",
    "Heroic",
  ];
  const tier = tiers[Math.min(tiers.length - 1, Math.floor((level - 1) / 2))];
  const cur = Math.pow(level - 1, 2) * 120;
  const next = Math.pow(level, 2) * 120;
  return { tier, next: Math.max(1, Math.round(next - cur)), level };
}
