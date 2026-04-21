import type { ScoreResult } from "../../engine/types";

type LetterRole = "unused" | "insert" | "unordered" | "ordered";

// Role → Tailwind text color (used by Rules page via ROLE_CLASS_BY_STRING)
const ROLE_CLASS: Record<LetterRole, string> = {
  ordered:   "text-primary",
  unordered: "text-primary/60",
  insert:    "text-fg-sub",
  unused:    "text-muted",
};

function computeLetterRoles(
  word: string,
  skeletonIndices: number[],
  orderBonus: boolean,
): LetterRole[] {
  const roles: LetterRole[] = Array(word.length).fill("unused" as LetterRole);
  if (skeletonIndices.length === 0) return roles;
  const zoneStart = skeletonIndices[0];
  const zoneEnd   = skeletonIndices[skeletonIndices.length - 1];
  for (let i = zoneStart; i <= zoneEnd; i++) roles[i] = "insert";
  const skeletonRole: LetterRole = orderBonus ? "ordered" : "unordered";
  for (const idx of skeletonIndices) roles[idx] = skeletonRole;
  return roles;
}

interface ColoredWordProps {
  score: ScoreResult;
}

export function ColoredWord({ score }: ColoredWordProps) {
  const roles = computeLetterRoles(score.word, score.skeletonIndices, score.orderBonus);
  return (
    <span className="font-mono text-[1.625rem] font-bold leading-none">
      {score.word.split("").map((ch, i) => {
        const isSkeleton = roles[i] === "ordered" || roles[i] === "unordered";
        return (
          <span key={i} className={`relative inline-block ${ROLE_CLASS[roles[i]]}`}>
            {ch}
            {isSkeleton && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-current opacity-80" />
            )}
          </span>
        );
      })}
    </span>
  );
}

// Re-export role mapping for Rules page (color legend)
export const ROLE_CLASS_BY_STRING: Record<string, string> = ROLE_CLASS;
