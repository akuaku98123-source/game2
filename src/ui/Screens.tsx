import { useEffect, useRef, useState } from "react";
import { Logo } from "./Logo";
import beach from "../assets/loading-beach.jpg";
import type { ScoreRow } from "../lib/storage";

export function Btn({
  children,
  onClick,
  tone = "gold",
  className = "",
  disabled = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: "gold" | "ghost" | "dark" | "signal";
  className?: string;
  disabled?: boolean;
}) {
  const tones = {
    gold: "bg-gradient-to-b from-[#FFD75E] to-[#F2A20C] text-[#12140F] hover:brightness-110",
    signal: "bg-gradient-to-b from-[#FF8A3D] to-[#FF5A1F] text-[#12140F] hover:brightness-110",
    ghost: "bg-[#1B2129]/90 text-[#E9E4D4] border border-[#3a4450] hover:border-[#F2A20C]",
    dark: "bg-[#12161C] text-[#E9E4D4] border border-[#39424e] hover:text-[#FFD75E]",
  } as const;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-6 py-3 font-display text-xl sm:text-2xl leading-none tracking-wide transition-all active:translate-y-px disabled:opacity-60 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#FF5A1F]/70 ${tones[tone]} ${className}`}
    >
      {children}
    </button>
  );
}

function Corner({ pos, children }: { pos: string; children: React.ReactNode }) {
  return <div className={`absolute ${pos} z-10 flex items-center gap-2`}>{children}</div>;
}

/* ---------------- LOADING ---------------- */
export function Loading({ onDone }: { onDone: () => void }) {
  const [p, setP] = useState(0);
  const done = useRef(false);
  const cb = useRef(onDone);
  cb.current = onDone;
  useEffect(() => {
    const t0 = performance.now();
    let raf = 0;
    const tick = () => {
      const k = Math.min(1, (performance.now() - t0) / 2600);
      setP(Math.round(k * 100));
      if (k < 1) raf = requestAnimationFrame(tick);
      else if (!done.current) {
        done.current = true;
        window.setTimeout(() => cb.current(), 420);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#7cc5ec]">
      <img src={beach} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0d1b2a]/85 via-transparent to-[#0d1b2a]/45" />
      <div className="absolute inset-0 scan" />

      <Corner pos="top-3 left-4">
        <span className="stencil text-[10px] text-white/85 drop-shadow">v1.0.4 · OFFLINE READY</span>
      </Corner>
      <Corner pos="top-3 right-4">
        <svg width="22" height="18" viewBox="0 0 24 20" aria-label="wifi">
          <path d="M12 18.5l4-5a6.3 6.3 0 0 0-8 0z" fill="#7CE04A" />
          <path d="M2.5 8.2a14.5 14.5 0 0 1 19 0" stroke="#7CE04A" strokeWidth="2.4" fill="none" />
          <path d="M5.6 11.6a10 10 0 0 1 12.8 0" stroke="#7CE04A" strokeWidth="2.4" fill="none" />
        </svg>
        <svg width="20" height="20" viewBox="0 0 24 24" aria-label="settings">
          <path
            d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm9 3.5l-2.1 1.2.4 2.4-2.3 1.1-1.7-1.7-2.3.6L11.6 21H9.4l-1.5-3.5-2.3-.6-1.7 1.7-2.3-1.1.4-2.4L0 12l2.1-1.2-.4-2.4 2.3-1.1 1.7 1.7 2.3-.6L10.4 3h2.2l1.5 3.5 2.3.6 1.7-1.7 2.3 1.1-.4 2.4z"
            fill="#E9E4D4"
            transform="translate(1.4 0) scale(0.92)"
          />
        </svg>
      </Corner>

      <div className="absolute inset-x-0 top-[16%] flex flex-col items-center">
        <div className="a-slam">
          <Logo width={Math.min(360, Math.max(200, window.innerWidth * 0.34))} />
        </div>
        <p className="stencil text-[11px] sm:text-[13px] text-white mt-4 drop-shadow-[0_2px_0_rgba(13,27,42,0.9)]">
          BATTLE ROYALE · 50 SURVIVORS · VOXEL EDITION
        </p>
      </div>

      <div className="absolute inset-x-0 bottom-[13%] flex flex-col items-center gap-3 px-6">
        <div className="relative w-[min(78vw,540px)] h-8 border-[3px] border-[#12140F] bg-[#20261F] overflow-hidden shadow-[0_4px_0_rgba(0,0,0,0.5)]">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-b from-[#FFE59B] via-[#FFD75E] to-[#E89A0B]"
            style={{ width: `${p}%`, transition: "width .12s linear" }}
          />
          <div
            className="absolute inset-0 opacity-45"
            style={{ backgroundImage: "repeating-linear-gradient(90deg, transparent 0 14px, rgba(18,20,15,.85) 14px 17px)" }}
          />
          <span
            className="absolute inset-0 grid place-items-center font-display text-xl text-white"
            style={{ WebkitTextStroke: "3px #12140F", paintOrder: "stroke fill" }}
          >
            {p}%
          </span>
        </div>
        <p className="font-display text-2xl text-white" style={{ WebkitTextStroke: "3px #12140F", paintOrder: "stroke fill" }}>
          Loading... {p}%
        </p>
      </div>

      <Corner pos="bottom-3 left-4">
        <span className="stencil text-[11px] text-white/90 border border-white/40 px-2 py-0.5 bg-black/35">
          BERMUDA · CLASSIC
        </span>
      </Corner>
      <Corner pos="bottom-3 right-4">
        <span className="stencil text-[10px] text-white/80">SERVER: SG-01 · 24ms</span>
      </Corner>
    </div>
  );
}

/* ---------------- LOGIN ---------------- */
export function Login({ onLogin }: { onLogin: (name: string) => void }) {
  const [busy, setBusy] = useState<null | "gmail" | "guest">(null);
  const go = (kind: "gmail" | "guest") => {
    if (busy) return;
    setBusy(kind);
    window.setTimeout(() => onLogin(kind === "gmail" ? "BLOCKALPA" : "ROOKIE-" + Math.floor(100 + Math.random() * 899)), 950);
  };

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#7cc5ec]">
      <img src={beach} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0d1b2a]/55 via-transparent to-[#0d1b2a]/85" />
      <div className="absolute inset-0 scan" />

      <div className="absolute inset-x-0 top-[9%] flex flex-col items-center">
        <div className="a-slam">
          <Logo width={Math.min(340, Math.max(190, window.innerWidth * 0.32))} />
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-[8%] flex flex-col items-center gap-3 px-6">
        <button
          onClick={() => go("gmail")}
          disabled={!!busy}
          className="group flex items-center gap-3 min-w-[260px] justify-center px-6 py-3 rounded-full bg-white text-[#202124] font-ui font-semibold text-lg shadow-[0_5px_0_rgba(0,0,0,0.45)] hover:bg-white/95 active:translate-y-0.5 transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-[#FF5A1F]/70 disabled:opacity-80"
        >
          {busy === "gmail" ? (
            <span className="stencil text-[13px]">SIGNING IN…</span>
          ) : (
            <>
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M23 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.2a5.3 5.3 0 0 1-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.6z" />
                <path fill="#34A853" d="M12 24c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.3 1.1-3.9 1.1-3 0-5.5-2-6.4-4.7H1.8v3A12 12 0 0 0 12 24z" />
                <path fill="#FBBC05" d="M5.6 14.7a7.2 7.2 0 0 1 0-4.6v-3H1.8a12 12 0 0 0 0 10.6l3.8-3z" />
                <path fill="#EA4335" d="M12 4.8c1.7 0 3.2.6 4.4 1.7l3.3-3.3A11.6 11.6 0 0 0 12 0 12 12 0 0 0 1.8 6.1l3.8 3C6.5 6.7 9 4.8 12 4.8z" />
              </svg>
              <span>Login with Gmail</span>
            </>
          )}
        </button>

        <button
          onClick={() => go("guest")}
          disabled={!!busy}
          className="min-w-[260px] px-6 py-2.5 rounded-full border-2 border-white/70 text-white stencil text-[13px] hover:bg-white/15 transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-[#FF5A1F]/70 disabled:opacity-60"
        >
          {busy === "guest" ? "MEMUAT…" : "MASUK SEBAGAI TAMU"}
        </button>

        <p className="stencil text-[9px] text-white/75 text-center max-w-[420px] leading-relaxed">
          PROGRES & PENGATURAN KONTROL TERSIMPAN LOKAL DI PERANGKAT INI
        </p>
      </div>

      <Corner pos="bottom-3 left-4">
        <span className="stencil text-[11px] text-white/90 border border-white/40 px-2 py-0.5 bg-black/35">
          BERMUDA · CLASSIC
        </span>
      </Corner>
    </div>
  );
}

/* ---------------- RESULTS ---------------- */
export interface MatchResult {
  win: boolean;
  score: number;
  kills: number;
  secs: number;
  alive: number;
}

export function Results({
  result,
  rows,
  rank,
  onAgain,
  onLobby,
}: {
  result: MatchResult;
  rows: ScoreRow[];
  rank: number;
  onAgain: () => void;
  onLobby: () => void;
}) {
  const place = result.win ? 1 : result.alive + 1;
  const mm = Math.floor(result.secs / 60);
  const ss = String(result.secs % 60).padStart(2, "0");

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-3 bg-[#0b0f14]/90 backdrop-blur-[3px] overflow-y-auto scroll-thin">
      <div className="w-full max-w-3xl my-auto bg-[#151A21] border-4 border-[#2b333d] shadow-[0_10px_0_rgba(0,0,0,0.5)]">
        <div className={`h-2 ${result.win ? "hazard" : "hazard-signal"}`} />
        <div className="p-4 sm:p-6 relative">
          <div className="text-center">
            {result.win ? (
              <h2
                className="font-display text-[clamp(52px,11vw,120px)] leading-[0.86] text-[#FFD75E] a-stamp"
                style={{ WebkitTextStroke: "5px #12140F", paintOrder: "stroke fill" }}
              >
                BOOYAH!
              </h2>
            ) : (
              <h2
                className="font-display text-[clamp(40px,8vw,86px)] leading-[0.9] text-[#E9E4D4] a-stamp"
                style={{ WebkitTextStroke: "5px #12140F", paintOrder: "stroke fill" }}
              >
                ELIMINATED
              </h2>
            )}
            <p className="stencil text-[10px] text-[#8C907A] mt-1">
              {result.win ? "LAST OPERATOR STANDING · BERMUDA" : "YOU PLACED #" + place + " OF 16"}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap items-end justify-center gap-x-7 gap-y-3 border-y-2 border-[#2b333d] py-4">
            <div>
              <p className="stencil text-[9px] text-[#8C907A]">SCORE</p>
              <p className="tabular font-bold text-4xl sm:text-5xl text-[#FFD75E] leading-none">
                {result.score.toLocaleString("en-US")}
              </p>
            </div>
            {[
              ["KILLS", result.kills],
              ["RANK", "#" + place],
              ["TIME", `${mm}:${ss}`],
            ].map(([k, v]) => (
              <div key={k as string}>
                <p className="stencil text-[9px] text-[#8C907A]">{k}</p>
                <p className="tabular text-2xl text-[#E9E4D4] font-bold leading-tight">{v}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 max-h-44 overflow-y-auto scroll-thin border border-[#2b333d]">
            <table className="w-full">
              <thead className="sticky top-0 bg-[#10141A]">
                <tr className="stencil text-[9px] text-[#8C907A]">
                  <th className="text-left pl-3 py-1.5 font-normal">#</th>
                  <th className="text-left font-normal">OPERATOR</th>
                  <th className="text-right font-normal">KILLS</th>
                  <th className="text-right pr-3 font-normal">SCORE</th>
                </tr>
              </thead>
              <tbody className="bg-[#10141A]">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center stencil text-[10px] text-[#8C907A]">
                      NO RECORDS YET — THIS RUN LOGS THE FIRST
                    </td>
                  </tr>
                ) : (
                  rows.map((r, i) => (
                    <tr
                      key={r.date + "" + i}
                      className={`border-t border-[#232a33] ${i === rank ? "bg-[#FFD75E]/15 text-[#FFD75E]" : "text-[#C9C6BA]"}`}
                    >
                      <td className="pl-3 py-1.5 tabular text-[13px] text-[#8C907A]">{String(i + 1).padStart(2, "0")}</td>
                      <td className="py-1.5 stencil text-[11px] truncate max-w-[150px]">{r.name}</td>
                      <td className="py-1.5 tabular text-[13px] text-right">{r.kills}</td>
                      <td className="pr-3 py-1.5 tabular text-[13px] text-right font-bold">{r.score.toLocaleString("en-US")}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-5">
            <Btn onClick={onAgain} tone="gold">
              DEPLOY LAGI · R
            </Btn>
            <Btn tone="ghost" onClick={onLobby}>
              KE LOBBY
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- ROTATE ---------------- */
export function RotateNotice() {
  return (
    <div className="fixed inset-0 z-[90] bg-[#0b0f14] flex flex-col items-center justify-center gap-6 px-8 text-center">
      <div className="a-bob">
        <svg width="96" height="96" viewBox="0 0 64 64" aria-hidden="true">
          <rect x="20" y="6" width="24" height="42" rx="4" fill="none" stroke="#FFD75E" strokeWidth="3" />
          <rect x="24" y="11" width="16" height="32" fill="#1d3b52" />
          <path d="M14 52a22 22 0 0 0 36-4" fill="none" stroke="#FF5A1F" strokeWidth="3" />
          <path d="M46 42l6 6-8 3z" fill="#FF5A1F" />
        </svg>
      </div>
      <div>
        <p className="font-display text-3xl text-[#E9E4D4]">PUTAR PERANGKAT</p>
        <p className="stencil text-[11px] text-[#8C907A] mt-2">GAME INI DIMAINKAN DALAM MODE LANDSCAPE</p>
      </div>
    </div>
  );
}
