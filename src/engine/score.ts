import type { Draw, ScoreResult, ScorePart } from "./types";

/** Converts to uppercase and strips all diacritics (é→E, ç→C, etc.). */
export function normalizeWord(raw: string): string {
  return raw
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Returns which draw letters appear in the word, consuming each occurrence
 * at most once (handles duplicates in the draw).
 *
 * The draw is traversed in order; for each draw letter the first remaining
 * occurrence in the word is consumed.
 */
function computeUsedLetters(draw: Draw, word: string): string[] {
  const normalizedDraw = draw.map((l) => normalizeWord(l)[0]);
  const remaining = word.split("");
  const used: string[] = [];

  for (const letter of normalizedDraw) {
    if (!letter) continue;
    const idx = remaining.indexOf(letter);
    if (idx !== -1) {
      used.push(letter);
      remaining.splice(idx, 1); // consume this occurrence
    }
  }

  return used;
}

/**
 * Builds the "skeleton": the positions in the word occupied by draw letters,
 * found by a left-to-right greedy scan that respects duplicate counts.
 *
 * Example — draw [V, R, A, R], word APERCEVRA:
 *   A(0) → take A; R(3) → take R; V(6) → take V; R(7) → take R
 *   → skeleton indices [0, 3, 6, 7]
 *
 * The skeleton defines the "zone" used to count insertions.
 */
function buildSkeleton(word: string, draw: Draw): number[] {
  const counts: Record<string, number> = {};
  for (const l of draw) {
    const c = normalizeWord(l)[0];
    if (!c) continue;
    counts[c] = (counts[c] ?? 0) + 1;
  }

  const indices: number[] = [];
  for (let i = 0; i < word.length; i++) {
    const ch = word[i];
    if (!counts[ch]) continue;
    indices.push(i);
    counts[ch] -= 1;
  }
  return indices;
}

/**
 * Order bonus: the skeleton letters must appear in the word in the exact same
 * order as the draw (i.e. the skeleton sequence === the normalized draw).
 */
function hasOrderBonus(word: string, draw: Draw, skeletonIndices: number[]): boolean {
  const normalizedDraw = draw.map((l) => normalizeWord(l)[0]);

  if (skeletonIndices.length !== normalizedDraw.length) return false;

  return skeletonIndices.every((pos, i) => word[pos] === normalizedDraw[i]);
}

/**
 * Counts positions strictly inside the skeleton zone [first..last] that are
 * NOT part of the skeleton — these are the "inserted" letters penalised in scoring.
 */
function countInsertions(skeletonIndices: number[]): number {
  if (skeletonIndices.length === 0) return 0;

  const first = skeletonIndices[0];
  const last = skeletonIndices[skeletonIndices.length - 1];
  const skeletonSet = new Set(skeletonIndices);

  let insertions = 0;
  for (let i = first; i <= last; i++) {
    if (!skeletonSet.has(i)) insertions++;
  }
  return insertions;
}

/**
 * Computes the full score for a (draw, word) pair.
 *
 * Formula: base + orderBonus − insertions
 *   base        = usedLetters.length × 3
 *   orderBonus  = +3 if skeleton matches draw order exactly, else 0
 *   insertions  = −1 per non-skeleton letter inside the skeleton zone
 */
export function scoreWord(draw: Draw, rawWord: string): ScoreResult {
  const word = normalizeWord(rawWord).trim();
  const usedLetters = computeUsedLetters(draw, word);

  // No draw letter used → score is zero, no skeleton to compute.
  if (usedLetters.length === 0) {
    return {
      draw,
      word,
      usedLetters: [],
      skeletonIndices: [],
      insertions: 0,
      orderBonus: false,
      total: 0,
      parts: [
        { label: "base", value: 0 },
        { label: "order_bonus", value: 0 },
        { label: "insertions", value: 0 },
      ],
    };
  }

  const baseScore = usedLetters.length * 3;
  const skeletonIndices = buildSkeleton(word, draw);
  const insertions = countInsertions(skeletonIndices);
  const orderBonus = hasOrderBonus(word, draw, skeletonIndices);
  const orderBonusPoints = orderBonus ? 3 : 0;
  const total = baseScore + orderBonusPoints - insertions;

  const parts: ScorePart[] = [
    { label: "base", value: baseScore },
    { label: "order_bonus", value: orderBonusPoints },
    { label: "insertions", value: -insertions },
  ];

  return { draw, word, usedLetters, skeletonIndices, insertions, orderBonus, total, parts };
}
