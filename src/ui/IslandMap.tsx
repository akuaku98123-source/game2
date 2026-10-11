import { useRef } from "react";
import { POIS, RUNWAY, islandRadius, planePath } from "../game/map";

interface Props {
  marker?: { x: number; z: number } | null;
  plane?: { x: number; z: number; a: number } | null;
  pathT?: number;
  interactive?: boolean;
  onPick?: (x: number, z: number) => void;
  labels?: boolean;
  className?: string;
  grid?: boolean;
}

const EXT = 145;

function ring(scale: number): string {
  const pts: string[] = [];
  for (let i = 0; i <= 84; i++) {
    const th = (i / 84) * Math.PI * 2;
    const r = islandRadius(th) * scale;
    pts.push(`${(Math.cos(th) * r).toFixed(1)},${(Math.sin(th) * r).toFixed(1)}`);
  }
  return "M" + pts.join("L") + "Z";
}

export default function IslandMap({
  marker,
  plane,
  pathT = 0,
  interactive = false,
  onPick,
  labels = true,
  className = "",
  grid = true,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);

  const pick = (e: React.PointerEvent) => {
    if (!interactive || !onPick) return;
    const el = svgRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // viewBox is square with preserveAspectRatio="meet": account for letterboxing
    const vb = EXT * 2;
    const scale = Math.min(r.width, r.height) / vb;
    const ox = (r.width - vb * scale) / 2;
    const oy = (r.height - vb * scale) / 2;
    const x = (e.clientX - r.left - ox) / scale - EXT;
    const z = (e.clientY - r.top - oy) / scale - EXT;
    onPick(x, z);
  };

  const p0 = planePath(0);
  const p1 = planePath(1);

  return (
    <svg
      ref={svgRef}
      viewBox={`${-EXT} ${-EXT} ${EXT * 2} ${EXT * 2}`}
      className={className}
      onPointerDown={(e) => {
        dragging.current = true;
        (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
        pick(e);
      }}
      onPointerMove={(e) => {
        if (interactive && dragging.current) pick(e);
      }}
      onPointerUp={(e) => {
        dragging.current = false;
        try {
          if ((e.currentTarget as SVGSVGElement).hasPointerCapture?.(e.pointerId)) {
            (e.currentTarget as SVGSVGElement).releasePointerCapture(e.pointerId);
          }
        } catch {
          /* pointer already released */
        }
      }}
      style={{ touchAction: interactive ? "none" : "auto", cursor: interactive ? "crosshair" : "default" }}
      role="img"
      aria-label="Bermuda island map"
    >
      <defs>
        <linearGradient id="seaG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2f8fd0" />
          <stop offset="100%" stopColor="#1d6ba6" />
        </linearGradient>
        <linearGradient id="landG" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#78b855" />
          <stop offset="100%" stopColor="#4f9440" />
        </linearGradient>
      </defs>

      <rect x={-EXT} y={-EXT} width={EXT * 2} height={EXT * 2} fill="url(#seaG)" />

      {/* water depth rings */}
      <path d={ring(1.16)} fill="#4aa3dd" opacity="0.55" />
      <path d={ring(1.07)} fill="#63b6e6" opacity="0.55" />
      {/* beach then land */}
      <path d={ring(1.03)} fill="#e8cd8c" />
      <path d={ring(1)} fill="url(#landG)" />

      {/* runway */}
      <g transform={`translate(${RUNWAY.x} ${RUNWAY.z}) rotate(${(RUNWAY.rot * 180) / Math.PI})`}>
        <rect x={-RUNWAY.w / 2} y={-RUNWAY.d / 2} width={RUNWAY.w} height={RUNWAY.d} fill="#9aa09a" />
        <rect x={-RUNWAY.w / 2 + 4} y={-1.4} width={RUNWAY.w - 8} height={2.8} fill="#f3efe2" opacity="0.85" />
      </g>

      {grid && (
        <g stroke="#ffffff" strokeWidth="0.6" opacity="0.16">
          {[-100, -60, -20, 20, 60, 100].map((v) => (
            <line key={`v${v}`} x1={v} y1={-EXT} x2={v} y2={EXT} />
          ))}
          {[-100, -60, -20, 20, 60, 100].map((h) => (
            <line key={`h${h}`} x1={-EXT} y1={h} x2={EXT} y2={h} />
          ))}
        </g>
      )}

      {/* flight path */}
      <line
        x1={p0.x}
        y1={p0.z}
        x2={p1.x}
        y2={p1.z}
        stroke="#F2A20C"
        strokeWidth="1.6"
        strokeDasharray="7 6"
        opacity="0.9"
      />

      {labels &&
        POIS.map((p) => (
          <g key={p.name}>
            <rect
              x={p.x - 0.6}
              y={p.z - 0.6}
              width="1.2"
              height="1.2"
              fill="#12140F"
            />
            <text
              x={p.x}
              y={p.z - 4}
              textAnchor="middle"
              fill="#ffffff"
              stroke="#12140F"
              strokeWidth="2.4"
              paintOrder="stroke"
              style={{
                fontFamily: "Anton, Arial Black, sans-serif",
                fontSize: 8.5,
                letterSpacing: 0.4,
              }}
            >
              {p.label.toUpperCase()}
            </text>
          </g>
        ))}

      {plane && (
        <g transform={`translate(${plane.x} ${plane.z}) rotate(${(-plane.a * 180) / Math.PI + 90})`}>
          <path d="M0 -7 L3.4 5 L0 2.6 L-3.4 5 Z" fill="#12140F" />
          <path d="M0 -5.6 L2.4 4 L0 2 L-2.4 4 Z" fill="#F7F3E6" />
        </g>
      )}

      {marker && (
        <g>
          <circle cx={marker.x} cy={marker.z} r="9" fill="#FF5A1F" opacity="0.25" />
          <circle cx={marker.x} cy={marker.z} r="4.6" fill="none" stroke="#FF5A1F" strokeWidth="2.2" />
          <circle cx={marker.x} cy={marker.z} r="1.6" fill="#FF5A1F" />
        </g>
      )}

      <rect
        x={-EXT}
        y={-EXT}
        width={EXT * 2}
        height={EXT * 2}
        fill="none"
        stroke="#12140F"
        strokeWidth="3"
        vectorEffect="non-scaling-stroke"
      />
      <text
        x={-EXT + 6}
        y={EXT - 7}
        fill="#F7F3E6"
        stroke="#12140F"
        strokeWidth="2.6"
        paintOrder="stroke"
        style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: 9, letterSpacing: 1.6, fontWeight: 700 }}
      >
        BERMUDA · BLOCK EDITION
      </text>
      <text
        x={EXT - 6}
        y={EXT - 7}
        textAnchor="end"
        fill="#F7F3E6"
        stroke="#12140F"
        strokeWidth="2.6"
        paintOrder="stroke"
        style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: 9, letterSpacing: 1.6, fontWeight: 700 }}
      >
        {Math.round(pathT * 100)}% FLIGHT
      </text>
    </svg>
  );
}
