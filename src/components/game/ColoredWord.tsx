import type { ScoreResult } from "../../engine/types";
import { ROLE_CLASS, type LetterRole } from "./letterRoles";

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
