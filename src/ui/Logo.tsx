/* Vector logo — letters are drawn as SVG pixel cells, never an image. */

const GLYPHS: Record<string, string[]> = {
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
};

interface WordProps {
  text: string;
  width: number | string;
  fill?: string;
  hi?: string;
  shadow?: string;
  className?: string;
  title?: string;
}

export function PixelWord({
  text,
  width,
  fill = "#F2A20C",
  hi = "#FFD75E",
  shadow = "#12140F",
  className = "",
  title,
}: WordProps) {
  const chars = text.split("");
  const w = chars.length * 6 - 1;
  const h = 7;
  const pads = 0.75;
  const outline: React.ReactNode[] = [];
  const body: React.ReactNode[] = [];
  const top: React.ReactNode[] = [];

  chars.forEach((ch, i) => {
    const g = GLYPHS[ch];
    if (!g) return;
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (g[row][col] !== "1") continue;
        const x = i * 6 + col;
        outline.push(<rect key={`o${i}-${row}-${col}`} x={x - 0.32} y={row - 0.32} width={1.64} height={1.64} fill={shadow} />);
        body.push(<rect key={`b${i}-${row}-${col}`} x={x} y={row} width={1} height={1} fill={fill} />);
        if (row < 2) top.push(<rect key={`t${i}-${row}-${col}`} x={x} y={row} width={1} height={1} fill={hi} />);
      }
    }
  });

  return (
    <svg
      viewBox={`${-pads} ${-pads} ${w + pads * 2} ${h + pads * 2}`}
      width={width}
      className={className}
      role="img"
      aria-label={title ?? text}
      style={{ display: "block", overflow: "visible" }}
      shapeRendering="crispEdges"
    >
      <title>{title ?? text}</title>
      <g>{outline}</g>
      <g>{body}</g>
      <g>{top}</g>
    </svg>
  );
}

export function Logo({
  width = 260,
  className = "",
  stacked = true,
}: {
  width?: number;
  className?: string;
  stacked?: boolean;
}) {
  if (!stacked) {
    return (
      <div className={className}>
        <PixelWord text="BLOCK" width={width} title="Block Fire" />
      </div>
    );
  }
  return (
    <div className={`flex flex-col items-center ${className}`} aria-label="Block Fire">
      <PixelWord text="BLOCK" width={width} title="Block Fire" />
      <div style={{ height: width * 0.035 }} />
      <PixelWord text="FIRE" width={width * 0.78} fill="#FF7A18" hi="#FFC24D" />
    </div>
  );
}

/** Small monochrome pixel chip used as a section marker. */
export function PixelChip({ size = 10, color = "#F2A20C" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 3 3" shapeRendering="crispEdges" aria-hidden="true">
      <rect x="0" y="0" width="3" height="3" fill="#12140F" />
      <rect x="0.4" y="0.4" width="2.2" height="2.2" fill={color} />
      <rect x="0.8" y="0.8" width="1" height="1" fill="#12140F" opacity="0.45" />
    </svg>
  );
}
