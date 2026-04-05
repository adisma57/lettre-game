type TileSize = "sm" | "md";

const SIZE_CLASS: Record<TileSize, string> = {
  sm: "h-9 w-9 text-sm",
  md: "h-14 w-14 text-2xl",
};

interface DrawDisplayProps {
  letters: string[];
  size?: TileSize;
  className?: string;
  animate?: boolean;
}

export function DrawDisplay({ letters, size = "md", className = "", animate = true }: DrawDisplayProps) {
  return (
    <div className={`flex justify-center gap-3 ${className}`}>
      {letters.map((letter, i) => (
        <div
          key={i}
          className={[
            "flex items-center justify-center rounded-lg border border-primary/30 bg-surface font-mono font-bold text-primary tile-glow",
            SIZE_CLASS[size],
            animate ? "animate-tile-drop" : "",
          ].join(" ")}
          style={animate ? { animationDelay: `${i * 60}ms` } : undefined}
        >
          {letter}
        </div>
      ))}
    </div>
  );
}
