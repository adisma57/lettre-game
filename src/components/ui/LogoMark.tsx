interface LogoMarkProps {
  size?: number;
  className?: string;
}

export function LogoMark({ size = 32, className }: LogoMarkProps) {
  const pad = size * 0.08;
  const qSize = size - pad * 2;
  const rOuter = size * 0.14;
  const rInner = size * 0.10;
  const inset = 4;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Outer tile */}
      <rect
        x={pad} y={pad}
        width={qSize} height={qSize}
        rx={rOuter}
        fill="#1d1a16"
        stroke="rgba(249,115,22,0.60)"
        strokeWidth={1}
      />
      {/* Inner border */}
      <rect
        x={pad + inset} y={pad + inset}
        width={qSize - inset * 2} height={qSize - inset * 2}
        rx={rInner}
        stroke="rgba(249,115,22,0.25)"
        strokeWidth={0.6}
        fill="none"
      />
      {/* Corner dots */}
      {([
        [pad + inset, pad + inset],
        [size - pad - inset, pad + inset],
        [pad + inset, size - pad - inset],
        [size - pad - inset, size - pad - inset],
      ] as [number, number][]).map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={2} fill="rgba(249,115,22,0.60)" />
      ))}
      {/* Q letter */}
      <text
        x={size / 2}
        y={size / 2 + size * 0.08}
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="'JetBrains Mono', monospace"
        fontWeight="700"
        fontSize={size * 0.46}
        fill="#f97316"
      >
        Q
      </text>
    </svg>
  );
}
