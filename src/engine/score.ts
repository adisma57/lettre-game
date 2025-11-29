// src/engine/score.ts
import type { Draw, ScoreResult, ScorePart } from "./types";

/**
 * Normalisation : majuscules + suppression des accents.
 */
export function normalizeWord(raw: string): string {
  return raw
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // supprime les diacritiques
}

/**
 * Lettres du tirage utilisées pour le score de base.
 * Avec doublons :
 * - on parcourt le tirage dans son ordre
 * - pour chaque lettre, on cherche une occurrence disponible dans le mot
 * - si trouvée, on la consomme
 */
function computeUsedLetters(draw: Draw, word: string): string[] {
  const normalizedDraw = draw.map((l) => normalizeWord(l)[0]);
  const chars = word.split("");
  const used: string[] = [];

  for (const letter of normalizedDraw) {
    if (!letter) continue;
    const idx = chars.indexOf(letter);
    if (idx !== -1) {
      used.push(letter);
      chars.splice(idx, 1); // consomme cette occurrence
    }
  }

  return used;
}

/**
 * Squelette pour les insertions ET pour le bonus d'ordre :
 * - on parcourt le mot de gauche à droite
 * - on garde un compteur des lettres du tirage disponibles (avec doublons)
 * - à chaque lettre du mot, si elle est encore dispo, on la prend dans le squelette
 *
 * Exemple:
 *   draw = [V, R, A, R]
 *   word = A P E R C E V R A
 *   => squelette = A(0), R(3), V(6), R(7) → [0,3,6,7]
 */
function buildSkeleton(word: string, draw: Draw): number[] {
  

  const counts: Record<string, number> = {};
  for (const l of draw) {
    const c = normalizeWord(l)[0];
    if (!c) continue;
    counts[c] = (counts[c] || 0) + 1;
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
 * Bonus d'ordre basé sur le SQUELETTE :
 * - on prend le squelette tel quel (lettres consommées dans le mot)
 * - on le compare au tirage normalisé (avec doublons)
 * - si la séquence de lettres du squelette == tirage, bonus +3
 * - sinon, 0
 */
function hasOrderBonusFromSkeleton(
  word: string,
  draw: Draw,
  skeletonIndices: number[]
): boolean {
  const normalizedDraw = draw.map((l) => normalizeWord(l)[0]);

  if (skeletonIndices.length !== normalizedDraw.length) {
    return false;
  }

  for (let i = 0; i < skeletonIndices.length; i++) {
    const ch = word[skeletonIndices[i]];
    if (ch !== normalizedDraw[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Compte les insertions internes :
 * - si squelette vide → 0
 * - sinon zone utile = [firstIndex..lastIndex]
 * - toute position de la zone qui n’est pas dans le squelette = insertion
 */
function countInsertions(skeletonIndices: number[]): number {
  if (skeletonIndices.length === 0) return 0;

  const firstIndex = skeletonIndices[0];
  const lastIndex = skeletonIndices[skeletonIndices.length - 1];
  const skeletonSet = new Set(skeletonIndices);
  let insertions = 0;

  for (let i = firstIndex; i <= lastIndex; i++) {
    if (!skeletonSet.has(i)) {
      insertions++;
    }
  }

  return insertions;
}

/**
 * Calcul complet du score.
 */
export function scoreWord(draw: Draw, rawWord: string): ScoreResult {
  const word = normalizeWord(rawWord).trim();

  // Lettres utilisées (AVEC DOUBLONS)
  const usedLetters = computeUsedLetters(draw, word);

  // Cas aucune lettre du tirage utilisée -> score 0
  if (usedLetters.length === 0) {
    const parts: ScorePart[] = [
      { label: "base", value: 0 },
      { label: "order_bonus", value: 0 },
      { label: "insertions", value: 0 },
    ];

    return {
      draw,
      word,
      usedLetters: [],
      skeletonIndices: [],
      insertions: 0,
      orderBonus: false,
      total: 0,
      parts,
    };
  }

  // Base
  const baseScore = usedLetters.length * 3;

  // Squelette et insertions
  const skeletonIndices = buildSkeleton(word, draw);
  const insertions = countInsertions(skeletonIndices);

  // Bonus d’ordre basé sur le squelette
  const orderBonus = hasOrderBonusFromSkeleton(word, draw, skeletonIndices);
  const orderBonusPoints = orderBonus ? 3 : 0;

  const total = baseScore + orderBonusPoints - insertions;

  const parts: ScorePart[] = [
    { label: "base", value: baseScore },
    { label: "order_bonus", value: orderBonusPoints },
    { label: "insertions", value: -insertions },
  ];

  return {
    draw,
    word,
    usedLetters,
    skeletonIndices,
    insertions,
    orderBonus,
    total,
    parts,
  };
}
