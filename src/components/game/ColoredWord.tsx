import type { ScoreResult } from "../../engine/types";

type LetterRole = "unused" | "insert" | "unordered" | "ordered";

const ROLE_CLASS: Record<LetterRole, string> = {
  ordered:   "text-success",
  unordered: "text-info",
  insert:    "text-error",
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
    <span className="font-mono text-2xl font-bold">
      {score.word.split("").map((ch, i) => (
        <span key={i} className={ROLE_CLASS[roles[i]]}>
          {ch}
        </span>
      ))}
    </span>
  );
}

// Re-export role mapping for Rules page (color legend)
export const ROLE_CLASS_BY_STRING: Record<string, string> = ROLE_CLASS;
