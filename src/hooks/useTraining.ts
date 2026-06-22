import { useState, useEffect, useCallback } from "react";
import type { Draw } from "../engine/types";
import type { RoundResult } from "../engine/RoundService";
import { evaluateRound, createDraw } from "../engine/RoundService";
import { normalizeWord } from "../engine/score";
import { mainValidator, mainDictionary } from "../engine/mainDictionary";
import { solveTopN, type SolverResult } from "../engine/solver";
import { recordTrainingGame } from "../services/statsService";

type Phase = { kind: "playing" } | { kind: "results" };

export type TrainingState = {
  draw: Draw;
  phase: Phase;
  inputWord: string;
  setInputWord: (w: string) => void;
  isInputValid: boolean | null;   // null = empty, true = in dict, false = not in dict
  submitWord: () => void;
  retryRound: () => void;         // results → playing, same draw
  nextRound: () => void;          // results → playing, new draw
  currentResult: RoundResult | null;
  bestPossibleScore: number;      // -1 before first valid submit
  top3: SolverResult[];
};

export function useTraining(): TrainingState {
  const [draw, setDraw]           = useState<Draw>(() => createDraw());
  const [phase, setPhase]         = useState<Phase>({ kind: "playing" });
  const [inputWord, setInputWord] = useState<string>("");
  const [isInputValid, setIsInputValid] = useState<boolean | null>(null);
  const [currentResult, setCurrentResult] = useState<RoundResult | null>(null);
  const [bestPossibleScore, setBestPossibleScore] = useState<number>(-1);
  const [top3, setTop3]           = useState<SolverResult[]>([]);

  // Debounced input validity check (300 ms)
  useEffect(() => {
    if (inputWord === "") {
      setIsInputValid(null);
      return;
    }
    const timer = setTimeout(() => {
      const normalized = normalizeWord(inputWord).trim();
      setIsInputValid(normalized ? mainValidator(normalized) : null);
    }, 300);
    return () => clearTimeout(timer);
  }, [inputWord]);

  const submitWord = useCallback(() => {
    const result = evaluateRound(draw, inputWord, mainValidator);

    if (!result.isValid) {
      setCurrentResult(result);
      return;
    }

    const best3 = solveTopN(draw, mainDictionary, 3);
    setBestPossibleScore(best3[0]?.score.total ?? 0);
    setTop3(best3);
    setCurrentResult(result);
    setPhase({ kind: "results" });
    recordTrainingGame(result.total);
  }, [draw, inputWord]);

  const retryRound = useCallback(() => {
    setInputWord("");
    setIsInputValid(null);
    setCurrentResult(null);
    setPhase({ kind: "playing" });
  }, []);

  const nextRound = useCallback(() => {
    setDraw(createDraw());
    setInputWord("");
    setIsInputValid(null);
    setCurrentResult(null);
    setBestPossibleScore(-1);
    setTop3([]);
    setPhase({ kind: "playing" });
  }, []);

  return {
    draw, phase,
    inputWord, setInputWord, isInputValid,
    submitWord, retryRound, nextRound,
    currentResult, bestPossibleScore, top3,
  };
}
