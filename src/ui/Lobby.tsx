import { useEffect, useRef, useState } from "react";
import { Logo, PixelChip } from "./Logo";
import IslandMap from "./IslandMap";
import { Btn } from "./Screens";
import { WEAPONS, RARITY, type MinimapState } from "../game/engine";
import {
  CTRL_LABELS,
  DEFAULT_LAYOUT,
  rankOf,
  type Layout,
  type Profile,
  type ScoreRow,
} from "../lib/storage";
import squad from "../assets/squad.jpg";

/* ================= shared bits ================= */
function Panel({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-3 bg-[#0b0f14]/88 backdrop-blur-[3px]">
      <div className={`w-full ${wide ? "max-w-3xl" : "max-w-xl"} bg-[#151A21] border-4 border-[#2b333d] max-h-full overflow-y-auto scroll-thin`}>
        <div className="h-2 hazard" />
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2b333d]">
          <h3 className="font-display text-2xl text-[#FFD75E]">{title}</h3>
          <button
            onClick={onClose}
            className="w-9 h-9 grid place-items-center bg-[#1B2129] border border-[#3a4450] text-[#E9E4D4] hover:text-[#FF5A1F] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2.6" />
            </svg>
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string | number }) {
  return (
    <div className="bg-[#10141A] border border-[#2b333d] px-3 py-2">
      <p className="stencil text-[9px] text-[#8C907A]">{k}</p>
      <p className="tabular text-lg font-bold text-[#FFD75E] leading-tight">{v}</p>
    </div>
  );
}

/* ================= LOBBY ================= */
export function Lobby({
  profile,
  setProfile,
  scores,
  sound,
  setSound,
  layout,
  setLayout,
  onStart,
}: {
  profile: Profile;
  setProfile: (p: Profile) => void;
  scores: ScoreRow[];
  sound: boolean;
  setSound: (b: boolean) => void;
  layout: Layout;
  setLayout: (l: Layout) => void;
  onStart: () => void;
}) {
  const [panel, setPanel] = useState<null | "weapon" | "vault" | "preset" | "lab" | "invite">(null);
  const rank = rankOf(profile.bestScore + profile.kills * 10);
  const acc = profile.shots > 0 ? Math.round((profile.hits / profile.shots) * 100) : 0;

  return (
    <div className="absolute inset-0 overflow-y-auto scroll-thin bg-[#0E1218]">
      {/* top bar */}
      <header className="sticky top-0 z-30 h-14 flex items-center gap-3 px-3 sm:px-4 bg-[#12161C] border-b-2 border-[#2b333d]">
        <Logo stacked={false} width={104} className="shrink-0 hidden sm:block" />
        <div className="w-px h-8 bg-[#2b333d] hidden sm:block" />
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 bg-[#2b4a6b] border-2 border-[#4f7ea8] grid place-items-center shrink-0">
            <span className="font-display text-sm text-[#FFD75E]">B</span>
          </div>
          <div className="min-w-0">
            <p className="font-display text-base leading-none text-[#E9E4D4] truncate">{profile.callsign}</p>
            <p className="stencil text-[8px] text-[#8C907A]">
              LV {rank.level} · {rank.tier}
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-[#1B2129] border border-[#3a4450]">
            <span className="w-3 h-3 bg-[#FFD75E] border border-[#12140F]" />
            <span className="tabular text-xs text-[#FFD75E] font-bold">{profile.kills * 45 + profile.bestScore}</span>
          </div>
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-[#1B2129] border border-[#3a4450]">
            <span className="w-3 h-3 bg-[#4FA8FF] border border-[#12140F] rotate-45" />
            <span className="tabular text-xs text-[#7FC0FF] font-bold">{profile.wins * 120 + 1649}</span>
          </div>
          <button
            onClick={() => setSound(!sound)}
            className="px-2.5 py-1.5 bg-[#1B2129] border border-[#3a4450] stencil text-[9px] text-[#E9E4D4] hover:border-[#FFD75E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
            aria-pressed={sound}
          >
            AUDIO {sound ? "ON" : "OFF"}
          </button>
          <button
            onClick={() => setPanel("lab")}
            className="w-9 h-9 grid place-items-center bg-[#1B2129] border border-[#3a4450] text-[#E9E4D4] hover:text-[#FFD75E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
            aria-label="Settings"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm9 3.5-2.1 1.2.4 2.4-2.3 1.1-1.7-1.7-2.3.6L11.6 21H9.4l-1.5-3.5-2.3-.6-1.7 1.7-2.3-1.1.4-2.4L0 12l2.1-1.2-.4-2.4 2.3-1.1 1.7 1.7 2.3-.6L10.4 3h2.2l1.5 3.5 2.3.6 1.7-1.7 2.3 1.1-.4 2.4z"
                fill="currentColor"
                transform="translate(1.4 0) scale(0.92)"
              />
            </svg>
          </button>
        </div>
      </header>

      <main className="p-3 sm:p-4 grid lg:grid-cols-[minmax(0,44%)_minmax(0,1fr)] gap-4 items-start">
        {/* left: character + squad */}
        <section className="space-y-3">
          <div className="relative border-2 border-[#2b333d] overflow-hidden bg-[#151A21]">
            <img src={squad} alt="Your squad in the hangar" className="w-full h-[190px] sm:h-[240px] object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0E1218] via-transparent to-transparent" />
            <div className="absolute left-3 top-3 bg-[#0E1218]/85 border border-[#3a4450] px-3 py-2">
              <p className="font-display text-2xl leading-none text-[#E9E4D4]">{profile.callsign}</p>
              <p className="stencil text-[9px] text-[#8C907A] mt-1">LEVEL {rank.level}</p>
              <p className="stencil text-[10px] text-[#4FA8FF] mt-0.5">◆ {rank.tier}</p>
            </div>
            <div className="absolute right-3 bottom-3 flex items-center gap-2 bg-[#0E1218]/85 border border-[#7CE04A]/60 px-3 py-1.5">
              <span className="stencil text-[10px] text-[#7CE04A]">SQUAD 4/4 READY</span>
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path d="M2 7.5l3.4 3.4L12 3.6" stroke="#7CE04A" strokeWidth="2.6" fill="none" />
              </svg>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {["PLAYER 1", "PLAYER 2", "PLAYER 3", "PLAYER 4"].map((n, i) => (
              <div
                key={n}
                className={`border px-2 py-2 text-center ${
                  i === 0 ? "border-[#FFD75E] bg-[#FFD75E]/10" : "border-[#2b333d] bg-[#151A21]"
                }`}
              >
                <div
                  className="w-8 h-8 mx-auto border-2 mb-1"
                  style={{ background: ["#2b4a6b", "#6b2b2b", "#4f6b2b", "#5b2b6b"][i], borderColor: ["#4f7ea8", "#a84f4f", "#7ba84f", "#a84f8a"][i] }}
                />
                <p className="stencil text-[8px] text-[#E9E4D4] truncate">{i === 0 ? profile.callsign.slice(0, 9) : n}</p>
                <p className="stencil text-[8px] text-[#7CE04A] mt-0.5">READY</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-4 gap-2">
            <Stat k="MATCHES" v={profile.matches} />
            <Stat k="ELIMS" v={profile.kills} />
            <Stat k="BOOYAH" v={profile.wins} />
            <Stat k="ACCURACY" v={acc + "%"} />
          </div>

          <div className="border-2 border-[#2b333d] bg-[#151A21]">
            <div className="px-3 py-2 border-b border-[#2b333d] flex items-center justify-between">
              <span className="stencil text-[10px] text-[#7CE04A]">FIELD RECORDS · LOCAL</span>
              <span className="stencil text-[9px] text-[#8C907A]">TOP 8</span>
            </div>
            {scores.length === 0 ? (
              <p className="px-3 py-5 text-center stencil text-[10px] text-[#8C907A]">
                BELUM ADA CATATAN — MENANGKAN SATU PERTANDINGAN
              </p>
            ) : (
              <table className="w-full">
                <tbody>
                  {scores.slice(0, 5).map((r, i) => (
                    <tr key={r.date + "" + i} className="border-t border-[#232a33]">
                      <td className="pl-3 py-1.5 tabular text-[12px] text-[#8C907A] w-8">{String(i + 1).padStart(2, "0")}</td>
                      <td className="py-1.5 stencil text-[11px] text-[#C9C6BA] truncate">{r.name}</td>
                      <td className="py-1.5 tabular text-[12px] text-[#8C907A] text-right pr-2">{r.kills}K</td>
                      <td className="py-1.5 pr-3 tabular text-[12px] text-right font-bold text-[#FFD75E]">
                        {r.score.toLocaleString("en-US")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* right: map + start */}
        <section className="space-y-3 min-w-0">
          <div className="bg-[#3a2a18] p-2 border-4 border-[#7a5a34] shadow-[0_6px_0_rgba(0,0,0,0.45)]">
            <div className="flex items-center justify-between px-2 py-1.5 bg-[#12161C] border border-[#7a5a34]">
              <span className="font-display text-lg sm:text-xl text-[#FFD75E] leading-none">BERMUDA MAP</span>
              <span className="stencil text-[10px] text-[#E9E4D4]">⌖ BR-RANKED</span>
            </div>
            <div className="mt-2 bg-[#1d6ba6] border-2 border-[#12140F] overflow-hidden">
              <IslandMap className="w-full block h-[240px] sm:h-[320px] lg:h-[360px]" />
            </div>
            <div className="flex items-center justify-between px-2 py-1.5 bg-[#12161C] border border-[#7a5a34] mt-2">
              <span className="stencil text-[10px] text-[#8C907A]">SIZE: LARGE</span>
              <span className="stencil text-[10px] text-[#8C907A]">MODE: BR-RANKED</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div>
              <p className="stencil text-[9px] text-[#8C907A]">ESTIMATED WAIT</p>
              <p className="font-display text-xl text-[#E9E4D4] leading-none">
                &lt;10s <span className="text-[#8C907A]">· 48/48 LOBBY</span>
              </p>
            </div>
            <Btn onClick={onStart} className="px-8 py-4">
              ▶ START MATCH
            </Btn>
          </div>
        </section>
      </main>

      {/* bottom nav */}
      <footer className="sticky bottom-0 z-30 flex items-center gap-2 px-3 py-2 bg-[#12161C] border-t-2 border-[#2b333d] overflow-x-auto scroll-thin">
        <button
          onClick={() => setPanel("invite")}
          className="px-4 py-2 bg-[#1B2129] border border-[#3a4450] stencil text-[11px] text-[#E9E4D4] hover:border-[#FFD75E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
        >
          INVITE
        </button>
        <div className="flex-1" />
        {(
          [
            ["vault", "VAULT"],
            ["weapon", "WEAPON"],
            ["preset", "PRESET"],
            ["lab", "LAB"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setPanel(id)}
            className="px-4 py-2 bg-[#1B2129] border border-[#3a4450] stencil text-[11px] text-[#E9E4D4] hover:border-[#FFD75E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
          >
            {label}
          </button>
        ))}
      </footer>

      {panel === "weapon" && (
        <Panel title="WEAPON VAULT" onClose={() => setPanel(null)} wide>
          <p className="stencil text-[10px] text-[#8C907A] mb-3">SENJATA DIDAPAT DI DUNIA, BUKAN DARI LOADOUT</p>
          <div className="space-y-2">
            {WEAPONS.map((w) => (
              <div key={w.id} className="flex items-center gap-3 bg-[#10141A] border border-[#2b333d] px-3 py-2.5">
                <span className="w-3 h-3 shrink-0 border border-[#12140F]" style={{ background: RARITY[w.rarity].color }} />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-xl leading-none text-[#E9E4D4]">{w.name}</p>
                  <p className="stencil text-[9px]" style={{ color: RARITY[w.rarity].color }}>
                    {RARITY[w.rarity].label} · {w.code}
                  </p>
                </div>
                <div className="hidden sm:flex gap-3">
                  {Object.entries(w.bars).map(([k, v]) => (
                    <div key={k} className="w-16">
                      <p className="stencil text-[8px] text-[#8C907A]">{k}</p>
                      <div className="h-2 bg-[#1B2129] border border-[#2b333d]">
                        <div className="h-full" style={{ width: `${v}%`, background: RARITY[w.rarity].color }} />
                      </div>
                    </div>
                  ))}
                </div>
                <span className="tabular text-[12px] text-[#8C907A]">
                  {w.dmg}×{w.mag}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {panel === "vault" && (
        <Panel title="VAULT" onClose={() => setPanel(null)}>
          <div className="grid grid-cols-2 gap-2">
            <Stat k="BEST SCORE" v={profile.bestScore.toLocaleString("en-US")} />
            <Stat k="BOOYAH" v={profile.wins} />
            <Stat k="TOTAL ELIMS" v={profile.kills} />
            <Stat k="BEST TIME" v={profile.bestWave + "m"} />
          </div>
          <div className="mt-4 border border-[#2b333d] max-h-56 overflow-y-auto scroll-thin">
            <table className="w-full">
              <thead className="sticky top-0 bg-[#10141A]">
                <tr className="stencil text-[9px] text-[#8C907A]">
                  <th className="text-left pl-3 py-1.5 font-normal">#</th>
                  <th className="text-left font-normal">OPERATOR</th>
                  <th className="text-right font-normal">SEC</th>
                  <th className="text-right pr-3 font-normal">SCORE</th>
                </tr>
              </thead>
              <tbody className="bg-[#10141A]">
                {scores.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center stencil text-[10px] text-[#8C907A]">
                      KOSONG
                    </td>
                  </tr>
                ) : (
                  scores.map((r, i) => (
                    <tr key={r.date + "" + i} className="border-t border-[#232a33]">
                      <td className="pl-3 py-1.5 tabular text-[13px] text-[#8C907A]">{String(i + 1).padStart(2, "0")}</td>
                      <td className="py-1.5 stencil text-[11px] text-[#C9C6BA] truncate max-w-[140px]">{r.name}</td>
                      <td className="py-1.5 tabular text-[13px] text-right">{r.wave}</td>
                      <td className="pr-3 py-1.5 tabular text-[13px] text-right font-bold text-[#FFD75E]">
                        {r.score.toLocaleString("en-US")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {panel === "preset" && (
        <ControlEditor
          layout={layout}
          onChange={setLayout}
          onClose={() => setPanel(null)}
        />
      )}

      {panel === "lab" && (
        <Panel title="LAB · SETTINGS" onClose={() => setPanel(null)}>
          <div className="flex items-center justify-between bg-[#10141A] border border-[#2b333d] px-3 py-3">
            <div>
              <p className="stencil text-[11px] text-[#E9E4D4]">AUDIO</p>
              <p className="stencil text-[9px] text-[#8C907A]">SFX SYNTHESIZED · NO FILES</p>
            </div>
            <button
              onClick={() => setSound(!sound)}
              className={`w-16 h-8 border-2 relative transition-colors ${
                sound ? "bg-[#7CE04A]/25 border-[#7CE04A]" : "bg-[#1B2129] border-[#3a4450]"
              }`}
              aria-pressed={sound}
            >
              <span
                className={`absolute top-0.5 w-6 h-6 bg-[#E9E4D4] transition-all ${sound ? "left-8" : "left-0.5"}`}
              />
            </button>
          </div>

          <button
            onClick={() => setPanel("preset")}
            className="mt-3 w-full flex items-center justify-between bg-[#10141A] border border-[#2b333d] px-3 py-3 hover:border-[#FFD75E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
          >
            <div className="text-left">
              <p className="stencil text-[11px] text-[#E9E4D4]">EDIT CONTROL LAYOUT</p>
              <p className="stencil text-[9px] text-[#8C907A]">PINDAHKAN & UKUR ULANG TOMBOL</p>
            </div>
            <span className="font-display text-xl text-[#FFD75E]">›</span>
          </button>

          <div className="mt-3">
            <p className="stencil text-[10px] text-[#8C907A] mb-2">KONTROL DESKTOP</p>
            <div className="flex flex-wrap gap-2">
              {["WASD MOVE", "MOUSE AIM", "CLICK FIRE", "R RELOAD", "E PICK UP", "1/2 SWAP", "SPACE JUMP", "F PARACHUTE", "ESC PAUSE"].map(
                (k) => (
                  <span key={k} className="stencil text-[9px] px-2 py-1 border border-[#3a4450] text-[#C9C6BA]">
                    {k}
                  </span>
                )
              )}
            </div>
          </div>

          <button
            onClick={() => {
              setProfile({ ...profile, callsign: profile.callsign });
              setPanel(null);
            }}
            className="mt-4 w-full py-2 stencil text-[10px] text-[#8C907A] border border-[#2b333d] hover:text-[#FF5A1F] hover:border-[#FF5A1F]"
          >
            TUTUP
          </button>
        </Panel>
      )}

      {panel === "invite" && (
        <Panel title="INVITE SQUAD" onClose={() => setPanel(null)}>
          <p className="text-[15px] text-[#C9C6BA] leading-snug">
            Bagikan kode ini ke temanmu — squad akan langsung terisi 4/4 saat mereka join.
          </p>
          <div className="mt-3 flex items-center gap-3 bg-[#10141A] border-2 border-dashed border-[#3a4450] px-4 py-4">
            <PixelChip size={16} />
            <span className="font-display text-3xl tracking-[0.2em] text-[#FFD75E]">
              BLK-{String(profile.bestScore % 10000).padStart(4, "0")}
            </span>
          </div>
        </Panel>
      )}
    </div>
  );
}

/* ================= DROP (pesawat → pilih titik turun) ================= */
export function DropScreen({
  read,
  onMarker,
  onJump,
  onBack,
}: {
  read: () => MinimapState | null;
  onMarker: (x: number, z: number) => void;
  onJump: () => void;
  onBack: () => void;
}) {
  const [mm, setMm] = useState<MinimapState | null>(read);
  const [local, setLocal] = useState<{ x: number; z: number } | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setMm(read()), 100);
    return () => window.clearInterval(id);
  }, [read]);

  const pick = (x: number, z: number) => {
    setLocal({ x, z });
    onMarker(x, z);
  };

  const marker = local;

  return (
    <div className="absolute inset-0 z-40 bg-[#0b0f14]/72 flex flex-col">
      <div className="flex items-center justify-between px-3 sm:px-5 py-2 bg-[#12161C] border-b-2 border-[#2b333d]">
        <div className="flex items-center gap-3">
          <span className="font-display text-xl sm:text-2xl text-[#FFD75E] leading-none">PILIH TITIK TURUN</span>
          <span className="stencil text-[9px] text-[#8C907A] hidden sm:block">TAP MAP · DRAG UNTUK REPOSISI</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="stencil text-[9px] text-[#7CE04A]">PARACHUTE AUTO-OPEN</span>
          <button
            onClick={onBack}
            className="px-3 py-1.5 bg-[#1B2129] border border-[#3a4450] stencil text-[10px] text-[#E9E4D4] hover:border-[#FF5A1F] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]"
          >
            BATAL
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 grid md:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden md:flex flex-col gap-3 p-4 bg-[#10141A] border-r border-[#2b333d] overflow-y-auto scroll-thin">
          <div>
            <p className="stencil text-[9px] text-[#8C907A]">MISSION</p>
            <p className="font-display text-2xl text-[#E9E4D4] leading-none">BR · BERMUDA</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat k="SQUAD" v="4/4" />
            <Stat k="PLAYERS" v="16" />
          </div>
          <p className="text-[14px] leading-snug text-[#8C907A]">
            Pesawat sedang terbang melintasi pulau. Tap peta untuk menentukan zona pendaratanmu — senjata tersebar di
            setiap lokasi, bukan di tanganmu.
          </p>
          <div className="mt-auto">
            <p className="stencil text-[9px] text-[#8C907A]">TIPS</p>
            <ul className="stencil text-[9px] text-[#C9C6BA] space-y-1 mt-1">
              <li>· PEAK & Bimasakti: senjata langka</li>
              <li>· Shipyard: kontainer & cover rapat</li>
              <li>· Lari dari zona bila ditembak</li>
            </ul>
          </div>
        </aside>

        <div className="relative min-h-0 p-2 sm:p-4 flex items-center justify-center">
          <div className="w-full h-full border-4 border-[#7a5a34] bg-[#1d6ba6] overflow-hidden shadow-[0_6px_0_rgba(0,0,0,0.45)]">
            <IslandMap
              className="w-full h-full block"
              interactive
              onPick={pick}
              marker={marker}
              plane={mm?.plane ?? null}
              grid
            />
          </div>
          <div className="absolute left-4 bottom-4 hidden sm:block">
            <p className="stencil text-[9px] text-[#8C907A]">MARKER</p>
            <p className="tabular text-sm text-[#FF5A1F] font-bold">
              {marker ? `${Math.round(marker.x)}, ${Math.round(marker.z)}` : "BELUM DIPILIH"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 px-3 sm:px-5 py-3 bg-[#12161C] border-t-2 border-[#2b333d]">
        <p className="stencil text-[9px] text-[#8C907A] hidden sm:block">
          TANPA MARKER, KAMU AKAN LOMPAT OTOMATIS DI AKHIR RUTE
        </p>
        <Btn onClick={onJump} className="px-8 py-3 ml-auto" tone={marker ? "gold" : "ghost"}>
          JUMP!
        </Btn>
      </div>
    </div>
  );
}

/* ================= CONTROL EDITOR ================= */
export function ControlEditor({
  layout,
  onChange,
  onClose,
}: {
  layout: Layout;
  onChange: (l: Layout) => void;
  onClose: () => void;
}) {
  const [sel, setSel] = useState("fire");
  const boxRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const move = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const el = boxRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = Math.max(5, Math.min(95, ((e.clientX - r.left) / r.width) * 100));
    const y = Math.max(5, Math.min(95, ((e.clientY - r.top) / r.height) * 100));
    onChange({ ...layout, [sel]: { ...layout[sel], x, y } });
  };

  const chip = (id: string) => {
    const p = layout[id] ?? DEFAULT_LAYOUT[id];
    const active = sel === id;
    return (
      <button
        key={id}
        onPointerDown={(e) => {
          e.preventDefault();
          setSel(id);
          dragging.current = true;
          (e.currentTarget.parentElement as HTMLElement)?.setPointerCapture?.(e.pointerId);
        }}
        className={`absolute -translate-x-1/2 -translate-y-1/2 px-3 py-2 border-2 select-none touch-none ${
          active ? "border-[#FF5A1F] bg-[#FF5A1F]/25 text-[#FFD75E]" : "border-[#3a4450] bg-[#10141A]/90 text-[#C9C6BA]"
        }`}
        style={{ left: `${p.x}%`, top: `${p.y}%`, transform: `translate(-50%,-50%) scale(${p.s})` }}
      >
        <span className="stencil text-[10px] whitespace-nowrap">{CTRL_LABELS[id] ?? id}</span>
      </button>
    );
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-[#0b0f14]/96">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2b333d] bg-[#12161C]">
        <div>
          <h3 className="font-display text-2xl text-[#FFD75E] leading-none">EDIT CONTROL LAYOUT</h3>
          <p className="stencil text-[9px] text-[#8C907A] mt-1">DRAG UNTUK PINDAH · GESER SLIDER UNTUK UKURAN</p>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-[#7CE04A] text-[#12140F] font-display text-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-[#FF5A1F]/70"
        >
          SAVE
        </button>
      </div>

      <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-3 p-3">
        <div
          ref={boxRef}
          onPointerMove={move}
          onPointerUp={() => (dragging.current = false)}
          onPointerCancel={() => (dragging.current = false)}
          className="relative flex-1 min-h-[220px] bg-[#151A21] border-2 border-[#2b333d] overflow-hidden touch-none"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, rgba(255,255,255,.05) 0 1px, transparent 1px 40px), repeating-linear-gradient(90deg, rgba(255,255,255,.05) 0 1px, transparent 1px 40px)",
          }}
        >
          <div className="absolute inset-4 border border-dashed border-[#3a4450] pointer-events-none" />
          <p className="absolute top-2 left-3 stencil text-[9px] text-[#8C907A] pointer-events-none">LAYAR GAME</p>
          {Object.keys(DEFAULT_LAYOUT).map(chip)}
        </div>

        <div className="w-full md:w-64 shrink-0 bg-[#10141A] border border-[#2b333d] p-3 overflow-y-auto scroll-thin">
          <p className="stencil text-[10px] text-[#8C907A]">KONTROL</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {Object.keys(DEFAULT_LAYOUT).map((id) => (
              <button
                key={id}
                onClick={() => setSel(id)}
                className={`px-2 py-1 border stencil text-[9px] ${
                  sel === id ? "border-[#FF5A1F] text-[#FFD75E]" : "border-[#3a4450] text-[#C9C6BA]"
                }`}
              >
                {CTRL_LABELS[id] ?? id}
              </button>
            ))}
          </div>

          <p className="stencil text-[10px] text-[#8C907A] mt-4">UKURAN · {CTRL_LABELS[sel]}</p>
          <input
            type="range"
            min={60}
            max={170}
            value={Math.round((layout[sel]?.s ?? 1) * 100)}
            onChange={(e) => onChange({ ...layout, [sel]: { ...layout[sel], s: Number(e.target.value) / 100 } })}
            className="w-full accent-[#FFD75E]"
            aria-label="Control size"
          />
          <div className="flex justify-between tabular text-[11px] text-[#8C907A]">
            <span>60%</span>
            <span>{Math.round((layout[sel]?.s ?? 1) * 100)}%</span>
            <span>170%</span>
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={() => onChange({ ...layout, [sel]: { ...DEFAULT_LAYOUT[sel] } })}
              className="flex-1 py-2 border border-[#3a4450] stencil text-[10px] text-[#C9C6BA] hover:border-[#FFD75E]"
            >
              RESET
            </button>
            <button
              onClick={() => onChange({ ...DEFAULT_LAYOUT })}
              className="flex-1 py-2 border border-[#3a4450] stencil text-[10px] text-[#C9C6BA] hover:border-[#FF5A1F]"
            >
              RESET ALL
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
