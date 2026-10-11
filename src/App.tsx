import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Game, type GEvent, type HudState, type OverResult } from "./game/engine";
import { Lobby, DropScreen } from "./ui/Lobby";
import { Loading, Login, Results, RotateNotice, Btn, type MatchResult } from "./ui/Screens";
import { Hud, LookLayer, type Ctl, type FeedItem, type Stamp } from "./ui/Hud";
import { loadLayout, loadProfile, loadScores, saveLayout, saveProfile, saveScore, type Layout, type Profile, type ScoreRow } from "./lib/storage";

type Phase = "loading" | "login" | "lobby" | "drop" | "playing" | "paused" | "over";

const INIT_HUD: HudState = {
  hp: 100,
  maxHp: 100,
  ep: 50,
  maxEp: 50,
  alive: 16,
  kills: 0,
  phase: "plane",
  alt: 240,
  weapon: null,
  ammo: 0,
  reserve: 0,
  slots: [null, null],
  active: 0,
  reloading: false,
  prompt: null,
  secs: 0,
  px: 0,
  pz: 0,
  heading: 0,
  chuteReady: false,
};

export default function App() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [mounted, setMounted] = useState(false);
  const [hud, setHud] = useState<HudState>(INIT_HUD);
  const [profile, setProfile] = useState<Profile>(loadProfile);
  const [scores, setScores] = useState<ScoreRow[]>(loadScores);
  const [sound, setSound] = useState(true);
  const [layout, setLayoutState] = useState<Layout>(loadLayout);
  const [portrait, setPortrait] = useState(false);
  const [stamps, setStamps] = useState<Stamp[]>([]);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [banner, setBanner] = useState<{ id: number; text: string; sub: string } | null>(null);
  const [hit, setHit] = useState<{ n: number; head: boolean } | null>(null);
  const [hurt, setHurt] = useState(false);
  const [result, setResult] = useState<MatchResult>({ win: false, score: 0, kills: 0, secs: 0, alive: 0 });
  const [rank, setRank] = useState(-1);
  const [fatal, setFatal] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const idc = useRef(0);
  const hudRef = useRef(hud);
  hudRef.current = hud;
  const stateRef = useRef({ phase, sound, profile });
  stateRef.current = { phase, sound, profile };

  const touch = useMemo(() => (typeof window !== "undefined" ? window.matchMedia("(pointer: coarse)").matches : false), []);

  const setLayout = (l: Layout) => {
    setLayoutState(l);
    saveLayout(l);
  };

  const read = useCallback(() => gameRef.current?.minimap() ?? null, []);

  /* ---- orientation ---- */
  useEffect(() => {
    const mq = window.matchMedia("(orientation: portrait)");
    const on = () => setPortrait(touch && mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [touch]);

  /* ---- engine lifecycle ---- */
  useEffect(() => {
    if (!mounted || !containerRef.current || gameRef.current) return;
    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));

    const onEvent = (e: GEvent) => {
      if (e.t === "stamp") {
        const id = ++idc.current;
        setStamps((p) => [...p, { id, text: e.text, sub: e.sub, kind: e.kind, sx: e.sx, sy: e.sy }]);
        later(() => setStamps((p) => p.filter((x) => x.id !== id)), 980);
      } else if (e.t === "feed") {
        const id = ++idc.current;
        setFeed((p) => [{ id, text: e.text, mine: e.mine }, ...p].slice(0, 4));
        later(() => setFeed((p) => p.filter((x) => x.id !== id)), 3200);
      } else if (e.t === "banner") {
        const id = ++idc.current;
        setBanner({ id, text: e.text, sub: e.sub });
        later(() => setBanner((b) => (b && b.id === id ? null : b)), 1700);
      } else if (e.t === "hit") {
        const id = ++idc.current;
        setHit({ n: id, head: e.head });
        later(() => setHit((h) => (h && h.n === id ? null : h)), 300);
      } else if (e.t === "hurt") {
        setHurt(true);
        later(() => setHurt(false), 430);
      } else if (e.t === "lock") {
        if (!e.locked && stateRef.current.phase === "playing" && !gameRef.current?.getTouch()) setPhase("paused");
      } else if (e.t === "autojump") {
        setPhase((p) => (p === "drop" ? "playing" : p));
      } else if (e.t === "prompt") {
        /* prompt is mirrored through HudState */
      }
    };

    let created: Game;
    try {
      created = new Game(containerRef.current, {
      onHud: (s) => {
        hudRef.current = s;
        setHud(s);
      },
      onEvent,
      onOver: (r: OverResult) => {
        const p = stateRef.current.profile;
        const st = gameRef.current?.stats();
        const row = { name: p.callsign, score: r.score, wave: r.secs, kills: r.kills, date: Date.now() };
        const saved = saveScore(row);
        setScores(saved.rows);
        setRank(saved.rank);
        const next: Profile = {
          ...p,
          matches: p.matches + 1,
          kills: p.kills + r.kills,
          bestScore: Math.max(p.bestScore, r.score),
          bestWave: Math.max(p.bestWave, Math.floor(r.secs / 60)),
          wins: p.wins + (r.win ? 1 : 0),
          shots: p.shots + (st?.shots ?? 0),
          hits: p.hits + (st?.hits ?? 0),
        };
        setProfile(next);
        saveProfile(next);
        setResult(r);
        setPhase("over");
      },
      });
    } catch (err) {
      console.error(err);
      setFatal("WEBGL TIDAK TERSEDIA — COBA BROWSER / PERANGKAT LAIN");
      return;
    }
    const g = created;
    gameRef.current = g;
    g.setSound(stateRef.current.sound);
    g.startMatch(null);

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      g.dispose();
      gameRef.current = null;
    };
  }, [mounted]);

  useEffect(() => {
    gameRef.current?.setSound(sound);
  }, [sound]);

  /* ---- global keys ---- */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const p = stateRef.current.phase;
      if (k === "escape" || k === "p") {
        if (p === "paused") {
          e.preventDefault();
          gameRef.current?.resume();
          setPhase("playing");
        } else if (p === "playing") {
          e.preventDefault();
          gameRef.current?.pause();
          setPhase("paused");
        }
      }
      if (k === "f" && p === "playing") gameRef.current?.openChute();
      if (k === "r" && p === "over") {
        e.preventDefault();
        gameRef.current?.startMatch(null);
        setHud(INIT_HUD);
        setStamps([]);
        setFeed([]);
        setPhase("drop");
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const ctl: Ctl = useMemo(
    () => ({
      move: (x, y) => gameRef.current?.setMove(x, y),
      look: (dx, dy) => gameRef.current?.addLook(dx, dy, 0.0038),
      fire: (b) => gameRef.current?.setFire(b),
      reload: () => gameRef.current?.doReload(),
      jump: () => gameRef.current?.doJump(),
      swap: (i?: number) => (i === undefined ? gameRef.current?.cycleSlot() : gameRef.current?.swap(i)),
      pickup: () => gameRef.current?.interact(),
      chute: () => gameRef.current?.openChute(),
    }),
    []
  );

  const toLobby = () => {
    gameRef.current?.stop();
    setMounted(false);
    setHud(INIT_HUD);
    setPhase("lobby");
  };

  const showHud = mounted && (phase === "playing" || phase === "paused");

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0b0f14]">
      <div ref={containerRef} className={`absolute inset-0 ${mounted ? "" : "hidden"}`} />

      {mounted && phase === "playing" && touch && <LookLayer ctl={ctl} />}

      {showHud && (
        <Hud
          hud={hud}
          layout={layout}
          touch={touch}
          read={read}
          ctl={ctl}
          stamps={stamps}
          feed={feed}
          banner={banner}
          hit={hit}
          hurt={hurt}
          prompt={hud.prompt}
          onPause={() => {
            gameRef.current?.pause();
            setPhase("paused");
          }}
        />
      )}

      {mounted && phase === "drop" && (
        <DropScreen
          read={read}
          onMarker={(x, z) => gameRef.current?.setMarker(x, z)}
          onJump={() => {
            gameRef.current?.jump();
            setPhase("playing");
          }}
          onBack={toLobby}
        />
      )}

      {phase === "paused" && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-3 bg-[#0b0f14]/90 backdrop-blur-[3px] overflow-y-auto scroll-thin">
          <div className="w-full max-w-md my-auto bg-[#151A21] border-4 border-[#2b333d]">
            <div className="h-2 hazard" />
            <div className="p-5">
              <p className="stencil text-[10px] text-[#FF5A1F]">MATCH SUSPENDED</p>
              <h2 className="font-display text-5xl text-[#E9E4D4] leading-none">PAUSED</h2>
              <div className="grid grid-cols-3 gap-2 mt-4">
                {[
                  ["KILLS", hud.kills],
                  ["ALIVE", hud.alive],
                  ["TIME", `${Math.floor(hud.secs / 60)}:${String(hud.secs % 60).padStart(2, "0")}`],
                ].map(([k, v]) => (
                  <div key={k as string} className="bg-[#10141A] border border-[#2b333d] px-3 py-2">
                    <p className="stencil text-[9px] text-[#8C907A]">{k}</p>
                    <p className="tabular text-lg font-bold text-[#FFD75E] leading-tight">{v}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3 mt-5">
                <Btn
                  onClick={() => {
                    gameRef.current?.resume();
                    setPhase("playing");
                  }}
                >
                  RESUME
                </Btn>
                <Btn
                  tone="ghost"
                  onClick={() => {
                    gameRef.current?.startMatch(null);
                    setHud(INIT_HUD);
                    setPhase("drop");
                  }}
                >
                  NEW MATCH
                </Btn>
                <Btn tone="dark" onClick={toLobby}>
                  QUIT
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {phase === "over" && (
        <Results
          result={result}
          rows={scores}
          rank={rank}
          onAgain={() => {
            gameRef.current?.startMatch(null);
            setHud(INIT_HUD);
            setStamps([]);
            setFeed([]);
            setPhase("drop");
          }}
          onLobby={toLobby}
        />
      )}

      {phase === "drop" && mounted && hud.phase !== "plane" && (
        <div className="absolute inset-0 z-40 pointer-events-none grid place-items-center">
          <div className="bg-[#0b0f14]/85 border-2 border-[#FFD75E] px-6 py-3 a-stamp">
            <p className="font-display text-3xl text-[#FFD75E]">GO!</p>
          </div>
        </div>
      )}

      {phase === "loading" && <Loading onDone={() => setPhase("login")} />}

      {phase === "login" && (
        <Login
          onLogin={(name) => {
            const next = { ...profile, callsign: name, loggedIn: true };
            setProfile(next);
            saveProfile(next);
            setPhase("lobby");
          }}
        />
      )}

      {phase === "lobby" && (
        <Lobby
          profile={profile}
          setProfile={(p) => {
            setProfile(p);
            saveProfile(p);
          }}
          scores={scores}
          sound={sound}
          setSound={setSound}
          layout={layout}
          setLayout={setLayout}
          onStart={() => {
            setHud(INIT_HUD);
            setStamps([]);
            setFeed([]);
            setRank(-1);
            setMounted(true);
            setPhase("drop");
          }}
        />
      )}

      {fatal && (
        <div className="absolute inset-0 z-[95] grid place-items-center p-6 bg-[#0b0f14]">
          <div className="max-w-md text-center border-4 border-[#2b333d] bg-[#151A21] p-6">
            <p className="font-display text-3xl text-[#FF5A1F]">CONNECTION FAILED</p>
            <p className="stencil text-[11px] text-[#C9C6BA] mt-3 leading-relaxed">{fatal}</p>
          </div>
        </div>
      )}

      {portrait && <RotateNotice />}
    </div>
  );
}
