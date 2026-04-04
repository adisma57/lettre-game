type TileSize = "sm" | "md";

const SIZE_CLASS: Record<TileSize, string> = {
  sm: "h-8 w-8 text-sm",
  md: "h-14 w-14 text-2xl",
};

interface DrawDisplayProps {
  letters: string[];
  size?: TileSize;
  className?: string;
}

export function DrawDisplay({ letters, size = "md", className = "" }: DrawDisplayProps) {
  return (
    <div className={`flex justify-center gap-3 ${className}`}>
      {letters.map((letter, i) => (
        <div
          key={i}
          className={`flex items-center justify-center rounded-lg border border-line bg-surface font-bold text-primary ${SIZE_CLASS[size]}`}
        >
          {letter}
        </div>
      ))}
    </div>
  );
}
