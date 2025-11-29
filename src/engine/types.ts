export type Draw = string[]; // 4 lettres

export type ScorePart = {
  label: string;
  value: number;
};

export type ScoreResult = {
  draw: Draw;
  word: string;
  usedLetters: string[];
  skeletonIndices: number[]; // indices dans le mot
  insertions: number;
  orderBonus: boolean;
  total: number;
  parts: ScorePart[];
};
