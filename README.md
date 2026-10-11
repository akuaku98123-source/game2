# BLOCK FIRE — Bermuda (voxel battle royale)

Free-Fire-style battle royale flow, rendered as a blocky voxel island:
**Loading → Login → Lobby → plane → pick drop point → skydive → parachute → loot weapons → fight → BOOYAH.**

## Run locally

```bash
npm install
npm run dev
```

## Deploy to Vercel

The repo ships with `vercel.json` (`buildCommand: npm run build`, `outputDirectory: dist`).

```bash
npm i -g vercel
vercel          # preview
vercel --prod   # production
```

Or import the repo in the Vercel dashboard — framework preset **Vite**, build `npm run build`,
output `dist`. Everything (JS, CSS, images) is inlined into a single `dist/index.html`, so the
site is fully static and needs no server.

## Controls

| Input | Action |
| --- | --- |
| WASD / left stick | Move |
| Mouse / right-side drag | Aim |
| Click / FIRE button | Shoot (hold for auto) |
| R / RLD | Reload |
| E / PICK UP | Grab a weapon |
| 1, 2 / SWAP | Switch weapon slot |
| Space / JUMP | Jump |
| F / OPEN CHUTE | Open parachute (auto below 44 m) |
| Shift | Sprint |
| Esc, P / pause icon | Pause |

Control layout is editable in **Lobby → PRESET** (drag to move, slider for size, persisted in
`localStorage`). Audio and records are stored locally too.
