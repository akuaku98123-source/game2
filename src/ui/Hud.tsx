import { useEffect, useRef, useState } from "react";
import { WEAPON_BY_ID, type HudState, type MinimapState } from "../game/engine";
import { islandRadius, POIS } from "../game/map";
import { DEFAULT_LAYOUT, type Layout } from "../lib/storage";

export interface Ctl {
  move: (x: number, y: number) => void;
  look: (dx: number, dy: number) => void;
  fire: (b: boolean) => void;
  reload: () => void;
  jump: () => void;
  swap: (i?: number) => void;
  pickup: () => void;
  chute: () => void;
}
export interface Stamp {
  id: number;
  text: string;
  sub: string;
  kind: string;
  sx: number;
  sy: number;
}
export interface FeedItem {
  id: number;
  text: string;
  mine: boolean;
}

const MAP_SIZE = 132;
const EXT = 145;
const RARITY_COLORS = ["#B9C0C7", "#5FD36A", "#4FA8FF", "#B45BFF", "#FFB020"];

/* ---------------- minimap ---------------- */
export function Minimap({ read }: { read: () => MinimapState | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const c = ref.current;
      if (!c) return;
      const ctx = c.getContext("2d");
      if (!ctx) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const W = MAP_SIZE;
      if (c.width !== W * dpr) {
        c.width = W * dpr;
        c.height = W * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const s = (v: number) => ((v + EXT) / (EXT * 2)) * W;

      ctx.fillStyle = "#1d6ba6";
      ctx.fillRect(0, 0, W, W);

      // island
      ctx.beginPath();
      for (let i = 0; i <= 72; i++) {
        const th = (i / 72) * Math.PI * 2;
        const r = islandRadius(th);
        const x = s(Math.cos(th) * r);
        const y = s(Math.sin(th) * r);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = "#e8cd8c";
      ctx.fill();

      ctx.beginPath();
      for (let i = 0; i <= 72; i++) {
        const th = (i / 72) * Math.PI * 2;
        const r = islandRadius(th) - 7;
        const x = s(Math.cos(th) * r);
        const y = s(Math.sin(th) * r);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = "#5c9a41";
      ctx.fill();

      const m = read();
      if (!m) return;

      // poi labels
      ctx.font = "700 6px 'Barlow Condensed', sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(18,20,15,0.75)";
      for (const p of POIS) {
        ctx.fillText(p.label.slice(0, 6).toUpperCase(), s(p.x), s(p.z));
      }

      if (m.marker) {
        ctx.fillStyle = "#FF5A1F";
        ctx.beginPath();
        ctx.arc(s(m.marker.x), s(m.marker.z), 4, 0, 6.29);
        ctx.fill();
      }

      // weapon pickups
      const rarity = ["#B9C0C7", "#5FD36A", "#4FA8FF", "#B45BFF", "#FFB020"];
      ctx.strokeStyle = "rgba(11,15,20,0.85)";
      ctx.lineWidth = 1;
      for (const l of m.loot) {
        const x = s(l.x);
        const y = s(l.z);
        ctx.fillStyle = rarity[l.c] ?? "#FFB020";
        ctx.beginPath();
        ctx.moveTo(x, y - 3);
        ctx.lineTo(x + 3, y);
        ctx.lineTo(x, y + 3);
        ctx.lineTo(x - 3, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      ctx.fillStyle = "#E23B2E";
      for (const e of m.enemies) {
        ctx.beginPath();
        ctx.arc(s(e.x), s(e.z), 2.6, 0, 6.29);
        ctx.fill();
      }

      if (m.plane) {
        ctx.strokeStyle = "#F2A20C";
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(s(-220 * Math.cos(-0.62)), s(-220 * Math.sin(-0.62)));
        ctx.lineTo(s(220 * Math.cos(-0.62)), s(220 * Math.sin(-0.62)));
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(s(m.plane.x), s(m.plane.z), 3.4, 0, 6.29);
        ctx.fill();
      }

      // player arrow
      const px = s(m.px);
      const py = s(m.pz);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(-m.heading);
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(4.4, 5);
      ctx.lineTo(0, 2.6);
      ctx.lineTo(-4.4, 5);
      ctx.closePath();
      ctx.fillStyle = "#FFD75E";
      ctx.strokeStyle = "#12140F";
      ctx.lineWidth = 1.4;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [read]);

  return (
    <div className="absolute top-3 left-3 w-[132px] h-[132px] border-2 border-[#0b0f14] shadow-[0_3px_0_rgba(0,0,0,0.5)] overflow-hidden">
      <canvas ref={ref} width={MAP_SIZE} height={MAP_SIZE} style={{ width: MAP_SIZE, height: MAP_SIZE, display: "block" }} />
      <div className="absolute inset-0 border border-[#ffffff]/25 pointer-events-none" />
    </div>
  );
}

/* ---------------- positioned control wrapper ---------------- */
function At({
  id,
  layout,
  children,
  extra = "",
}: {
  id: string;
  layout: Layout;
  children: React.ReactNode;
  extra?: string;
}) {
  const p = layout[id] ?? DEFAULT_LAYOUT[id];
  return (
    <div
      className={`absolute ${extra}`}
      style={{ left: `${p.x}%`, top: `${p.y}%`, transform: `translate(-50%,-50%) scale(${p.s})` }}
    >
      {children}
    </div>
  );
}

function RoundBtn({
  label,
  onDown,
  onUp,
  size,
  tone = "dark",
  glyph,
}: {
  label: string;
  onDown: () => void;
  onUp?: () => void;
  size: number;
  tone?: "dark" | "fire";
  glyph?: React.ReactNode;
}) {
  return (
    <button
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDown();
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        onUp?.();
      }}
      onPointerCancel={() => onUp?.()}
      onPointerLeave={() => onUp?.()}
      className={`pointer-events-auto rounded-full grid place-items-center border-2 select-none touch-none transition-colors active:brightness-125 focus:outline-none ${
        tone === "fire"
          ? "border-[#FF5A1F] bg-[#FF5A1F]/30 text-[#FFD75E]"
          : "border-[#E9E4D4]/70 bg-[#0b0f14]/65 text-[#E9E4D4]"
      }`}
      style={{ width: size, height: size }}
      aria-label={label}
    >
      {glyph ?? <span className="stencil text-[10px]">{label}</span>}
    </button>
  );
}

function Stick({ onMove }: { onMove: (x: number, y: number) => void }) {
  const base = 148;
  const R = base / 2 - 16;
  const wrap = useRef<HTMLDivElement>(null);
  const pid = useRef<number | null>(null);
  const origin = useRef({ x: 0, y: 0 });
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const down = (e: React.PointerEvent) => {
    pid.current = e.pointerId;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    origin.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    setKnob({ x: 0, y: 0 });
  };
  const move = (e: React.PointerEvent) => {
    if (pid.current !== e.pointerId) return;
    let dx = e.clientX - origin.current.x;
    let dy = e.clientY - origin.current.y;
    const d = Math.hypot(dx, dy);
    if (d > R) {
      dx = (dx / d) * R;
      dy = (dy / d) * R;
    }
    setKnob({ x: dx, y: dy });
    onMove(dx / R, -dy / R);
  };
  const up = (e: React.PointerEvent) => {
    if (pid.current !== e.pointerId) return;
    pid.current = null;
    setKnob({ x: 0, y: 0 });
    onMove(0, 0);
  };

  return (
    <div
      ref={wrap}
      className="pointer-events-auto touch-none"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      style={{ width: base, height: base, position: "relative" }}
      role="application"
      aria-label="Move stick"
    >
      <div className="absolute inset-0 rounded-full border-2 border-[#E9E4D4]/45 bg-[#0b0f14]/35" />
      {[-1, 1].map((k) => (
        <span
          key={k}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[#E9E4D4]/70 font-display text-sm"
          style={{ transform: `translate(-50%,-50%) translateY(${k * (base / 2 - 14)}px)` }}
        >
          {k < 0 ? "▲" : "▼"}
        </span>
      ))}
      <div
        className="absolute left-1/2 top-1/2 w-14 h-14 rounded-full border-2 border-[#E9E4D4]/80 bg-[#E9E4D4]/25"
        style={{ transform: `translate(-50%,-50%) translate(${knob.x}px, ${knob.y}px)` }}
      />
    </div>
  );
}



/* ---------------- HUD ---------------- */
export function Hud({
  hud,
  layout,
  touch,
  read,
  ctl,
  stamps,
  feed,
  banner,
  hit,
  hurt,
  prompt,
  onPause,
}: {
  hud: HudState;
  layout: Layout;
  touch: boolean;
  read: () => MinimapState | null;
  ctl: Ctl;
  stamps: Stamp[];
  feed: FeedItem[];
  banner: { id: number; text: string; sub: string } | null;
  hit: { n: number; head: boolean } | null;
  hurt: boolean;
  prompt: string | null;
  onPause: () => void;
}) {
  const hpPct = (hud.hp / hud.maxHp) * 100;
  const epPct = (hud.ep / hud.maxEp) * 100;
  const low = hpPct < 35;
  const airborne = hud.phase === "dive" || hud.phase === "chute";
  const spec = hud.weapon;

  return (
    <div className="absolute inset-0 z-40 pointer-events-none select-none">
      {/* damage vignette */}
      <div
        className="absolute inset-0 transition-opacity duration-300"
        style={{
          opacity: Math.max(hurt ? 1 : 0, low && hud.phase === "ground" ? 0.5 : 0),
          background: "radial-gradient(ellipse at center, rgba(255,40,10,0) 40%, rgba(210,35,10,0.7) 100%)",
        }}
      />

      {/* crosshair */}
      {hud.phase === "ground" && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16">
          {["top-0 left-1/2 -translate-x-1/2 w-[2px] h-3.5", "bottom-0 left-1/2 -translate-x-1/2 w-[2px] h-3.5", "left-0 top-1/2 -translate-y-1/2 h-[2px] w-3.5", "right-0 top-1/2 -translate-y-1/2 h-[2px] w-3.5"].map(
            (cls, i) => (
              <span key={i} className={`absolute ${cls} bg-white`} style={{ boxShadow: "0 0 0 1px rgba(11,15,20,.9)" }} />
            )
          )}
          <span
            className="absolute left-1/2 top-1/2 w-[3px] h-[3px] bg-[#FF5A1F]"
            style={{ transform: "translate(-50%,-50%)", boxShadow: "0 0 0 1px rgba(11,15,20,.9)" }}
          />
          {hit && (
            <div key={hit.n} className="absolute inset-0 a-hit">
              {[45, 135, 225, 315].map((a) => (
                <span
                  key={a}
                  className={`absolute left-1/2 top-1/2 w-[3px] h-3.5 ${hit.head ? "bg-[#FF5A1F]" : "bg-white"}`}
                  style={{ transform: `translate(-50%,-50%) rotate(${a}deg) translateY(-13px)` }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <Minimap read={read} />

      {/* alive / kills */}
      <div className="absolute top-3 right-3 flex items-stretch gap-1.5">
        <div className="bg-[#0b0f14]/85 border border-[#7CE04A]/60 px-2.5 py-1 text-center">
          <p className="stencil text-[8px] text-[#7CE04A]">ALIVE</p>
          <p className="tabular font-bold text-xl text-[#E9E4D4] leading-none">{hud.alive}</p>
        </div>
        <div className="bg-[#0b0f14]/85 border border-[#FF5A1F]/70 px-2.5 py-1 text-center">
          <p className="stencil text-[8px] text-[#FF5A1F]">KILL</p>
          <p className="tabular font-bold text-xl text-[#E9E4D4] leading-none">{hud.kills}</p>
        </div>
        <button
          onClick={onPause}
          className="pointer-events-auto w-10 h-10 grid place-items-center bg-[#0b0f14]/85 border border-[#3a4450] text-[#E9E4D4] hover:text-[#FFD75E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
          aria-label="Pause"
        >
          <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
            <rect x="3" y="2" width="4" height="12" fill="currentColor" />
            <rect x="9" y="2" width="4" height="12" fill="currentColor" />
          </svg>
        </button>
      </div>

      {/* weapon slots + ammo */}
      <At id="slots" layout={layout}>
        <div className="pointer-events-auto flex flex-col gap-1.5 items-end">
          {[0, 1].map((i) => {
            const id = hud.slots[i];
            const active = hud.active === i;
            const rarityCol = id ? RARITY_COLORS[WEAPON_BY_ID[id].rarity] : "#2b333d";
            return (
              <button
                key={i}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  ctl.swap(i);
                }}
                className={`pointer-events-auto flex items-center gap-2 px-2.5 py-1.5 border-2 min-w-[158px] justify-between ${
                  active ? "bg-[#0b0f14]/90 border-[#FFD75E]" : "bg-[#0b0f14]/60 border-[#3a4450] opacity-70"
                }`}
              >
                <span className="stencil text-[9px] text-[#8C907A]">0{i + 1}</span>
                <span className="stencil text-[12px] text-[#E9E4D4] truncate">
                  {id ? WEAPON_BY_ID[id].name : "EMPTY"}
                </span>
                {id && (
                  <span className="stencil text-[8px] text-[#8C907A] shrink-0">
                    {WEAPON_BY_ID[id].auto ? "AUTO" : "SEMI"}
                  </span>
                )}
                <span className="w-2.5 h-2.5 border border-[#12140F] shrink-0" style={{ background: rarityCol }} />
              </button>
            );
          })}
          <div className="flex items-end gap-2 bg-[#0b0f14]/85 px-3 py-1.5 border border-[#3a4450]">
            <span className={`tabular font-bold text-3xl leading-none ${hud.ammo <= 4 ? "text-[#FF5A1F]" : "text-[#FFD75E]"}`}>
              {spec ? hud.ammo : "—"}
            </span>
            <span className="tabular text-sm text-[#8C907A] leading-none pb-0.5">/ {spec ? hud.reserve : 0}</span>
          </div>
          {hud.reloading && <p className="stencil text-[10px] text-[#FF5A1F] a-blink self-end">RELOADING…</p>}
        </div>
      </At>

      {/* HP / EP bars */}
      <At id="bars" layout={layout}>
        <div className="w-[min(46vw,300px)]">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="stencil text-[8px] text-[#7CE04A] w-5">HP</span>
            <div className="flex-1 h-3.5 bg-[#0b0f14]/85 border border-[#3a4450] overflow-hidden">
              <div
                className={`h-full transition-[width] duration-200 ${low ? "bg-[#FF5A1F]" : "bg-[#7CE04A]"}`}
                style={{ width: `${Math.max(0, hpPct)}%` }}
              />
            </div>
            <span className="tabular text-[12px] text-[#E9E4D4] w-8 text-right">{Math.max(0, hud.hp)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="stencil text-[8px] text-[#4FA8FF] w-5">EP</span>
            <div className="flex-1 h-2.5 bg-[#0b0f14]/85 border border-[#3a4450] overflow-hidden">
              <div className="h-full bg-[#4FA8FF] transition-[width] duration-200" style={{ width: `${Math.max(0, epPct)}%` }} />
            </div>
            <span className="tabular text-[12px] text-[#8C907A] w-8 text-right">{Math.max(0, hud.ep)}</span>
          </div>
        </div>
      </At>

      {/* altitude meter */}
      {airborne && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
          <div className="relative w-3 h-40 bg-[#0b0f14]/80 border border-[#3a4450]">
            <div
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#FF5A1F] to-[#FFD75E]"
              style={{ height: `${Math.max(0, Math.min(100, (hud.alt / 240) * 100))}%` }}
            />
          </div>
          <span className="stencil text-[10px] text-[#FFD75E] tabular">{hud.alt}M</span>
          <span className="stencil text-[8px] text-[#8C907A]">ALT</span>
        </div>
      )}

      {/* loot prompt */}
      {prompt && hud.phase === "ground" && (
        <div className="absolute left-1/2 top-[64%] -translate-x-1/2 flex items-center gap-2 bg-[#0b0f14]/90 border border-[#FFD75E] px-3 py-1.5">
          <span className="w-3 h-3 bg-[#FFD75E] border border-[#12140F]" />
          <span className="stencil text-[12px] text-[#FFD75E]">{prompt}</span>
          {!touch && <span className="stencil text-[10px] text-[#8C907A]">TEKAN E</span>}
        </div>
      )}

      {/* kill feed */}
      <div className="absolute top-[154px] right-3 flex flex-col items-end gap-1">
        {feed.map((f) => (
          <div
            key={f.id}
            className={`a-feed stencil text-[10px] px-2 py-1 border ${
              f.mine ? "bg-[#0b0f14]/85 border-[#FFD75E]/60 text-[#FFD75E]" : "bg-[#0b0f14]/85 border-[#FF5A1F]/60 text-[#FF5A1F]"
            }`}
          >
            {f.mine ? "» " : "» "}
            {f.text}
          </div>
        ))}
      </div>

      {/* stamps */}
      {stamps.map((s) => (
        <div
          key={s.id}
          className="absolute a-pop"
          style={{ left: `${Math.max(8, Math.min(92, s.sx * 100))}%`, top: `${Math.max(14, Math.min(84, s.sy * 100))}%` }}
        >
          <div
            className={`px-2.5 py-1 border-2 text-center bg-[#0b0f14]/90 ${
              s.kind === "head" ? "border-[#FF5A1F]" : s.kind === "loot" ? "border-[#B45BFF]" : "border-[#FFD75E]"
            }`}
          >
            <p
              className={`font-display text-xl sm:text-2xl leading-none ${
                s.kind === "head" ? "text-[#FF5A1F]" : s.kind === "loot" ? "text-[#C89BFF]" : "text-[#FFD75E]"
              }`}
            >
              {s.text}
            </p>
            <p className="tabular text-[11px] text-[#E9E4D4] mt-0.5">{s.sub}</p>
          </div>
        </div>
      ))}

      {/* banner */}
      {banner && (
        <div key={banner.id} className="absolute inset-x-0 top-[26%] flex flex-col items-center a-slam">
          <div className="h-1.5 w-[min(76vw,520px)] hazard" />
          <div className="bg-[#0b0f14]/88 border-x-2 border-[#FFD75E] px-6 py-2 text-center">
            <p
              className="font-display text-4xl sm:text-6xl text-[#FFD75E] leading-none"
              style={{ WebkitTextStroke: "3px #12140F", paintOrder: "stroke fill" }}
            >
              {banner.text}
            </p>
            <p className="stencil text-[10px] text-[#E9E4D4] mt-1">{banner.sub}</p>
          </div>
          <div className="h-1.5 w-[min(76vw,520px)] hazard" />
        </div>
      )}

      {/* ---------- touch controls ---------- */}
      {touch && hud.phase === "ground" && (
        <>
          <At id="stick" layout={layout} extra="pointer-events-none">
            <Stick onMove={ctl.move} />
          </At>

          <At id="fire" layout={layout}>
            <RoundBtn
              label="FIRE"
              size={96}
              tone="fire"
              onDown={() => ctl.fire(true)}
              onUp={() => ctl.fire(false)}
              glyph={
                <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
                  <circle cx="17" cy="17" r="9" fill="none" stroke="currentColor" strokeWidth="2.5" />
                  <circle cx="17" cy="17" r="3" fill="currentColor" />
                  <path d="M17 1v6M17 27v6M1 17h6M27 17h6" stroke="currentColor" strokeWidth="2.5" />
                </svg>
              }
            />
          </At>

          <At id="jump" layout={layout}>
            <RoundBtn label="JUMP" size={64} onDown={ctl.jump} glyph={<span className="text-lg">▲</span>} />
          </At>

          <At id="reload" layout={layout}>
            <RoundBtn label="RLD" size={64} onDown={ctl.reload} />
          </At>

          <At id="swap" layout={layout}>
            <RoundBtn label="SWAP" size={56} onDown={ctl.swap} glyph={<span className="text-base">⇄</span>} />
          </At>

          {prompt && (
            <At id="pickup" layout={layout}>
              <RoundBtn label="PICK" size={72} tone="fire" onDown={ctl.pickup} glyph={<span className="stencil text-[10px]">PICK UP</span>} />
            </At>
          )}
        </>
      )}

      {touch && hud.chuteReady && (
        <At id="chute" layout={layout}>
          <RoundBtn label="CHUTE" size={82} tone="fire" onDown={ctl.chute} glyph={<span className="stencil text-[10px]">OPEN<br />CHUTE</span>} />
        </At>
      )}

      {!touch && hud.chuteReady && (
        <div className="absolute left-1/2 top-[62%] -translate-x-1/2 bg-[#0b0f14]/85 border border-[#FFD75E] px-3 py-1.5">
          <span className="stencil text-[11px] text-[#FFD75E] a-blink">TEKAN F — BUKA PARACHUTE</span>
        </div>
      )}
    </div>
  );
}

/* ---------------- look layer (touch) ---------------- */
export function LookLayer({ ctl }: { ctl: Ctl }) {
  const pid = useRef<number | null>(null);
  const last = useRef({ x: 0, y: 0 });
  return (
    <div
      className="absolute inset-0 z-30 touch-none"
      onPointerDown={(e) => {
        if (pid.current !== null) return;
        pid.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        last.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerMove={(e) => {
        if (pid.current !== e.pointerId) return;
        const dx = e.clientX - last.current.x;
        const dy = e.clientY - last.current.y;
        last.current = { x: e.clientX, y: e.clientY };
        ctl.look(dx, dy);
      }}
      onPointerUp={(e) => {
        if (pid.current === e.pointerId) pid.current = null;
      }}
      onPointerCancel={() => (pid.current = null)}
    />
  );
}
