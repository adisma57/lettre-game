import { useState, useEffect, useCallback } from "react";
import type { Draw } from "../engine/types";
import type { RoundResult } from "../engine/RoundService";
import { evaluateRound } from "../engine/RoundService";
import { normalizeWord } from "../engine/score";
import { solveTopN, type SolverResult } from "../engine/solver";
import { recordTrainingGame } from "../services/statsService";
import { useLanguage } from "../contexts/LanguageContext";
import { useGameResources } from "./useGameResources";

type Phase = { kind: "playing" } | { kind: "results" };

export type TrainingState = {
  draw: Draw;
  phase: Phase;
  inputWord: string;
  setInputWord: (w: string) => void;
  isInputValid: boolean | null;
  submitWord: () => void;
  retryRound: () => void;
  nextRound: () => void;
  currentResult: RoundResult | null;
  bestPossibleScore: number;
  top3: SolverResult[];
};

export function useTraining(): TrainingState {
  const { lang } = useLanguage();
  const resources = useGameResources();

  const [draw, setDraw]           = useState<Draw>(() => resources.generateDraw());
  const [phase, setPhase]         = useState<Phase>({ kind: "playing" });
  const [inputWord, setInputWord] = useState<string>("");
  const [isInputValid, setIsInputValid] = useState<boolean | null>(null);
  const [currentResult, setCurrentResult] = useState<RoundResult | null>(null);
  const [bestPossibleScore, setBestPossibleScore] = useState<number>(-1);
  const [top3, setTop3]           = useState<SolverResult[]>([]);

  // New draw when language changes
  useEffect(() => {
    setDraw(resources.generateDraw());
    setInputWord("");
    setIsInputValid(null);
    setCurrentResult(null);
    setBestPossibleScore(-1);
    setTop3([]);
    setPhase({ kind: "playing" });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  // Debounced input validity check (300 ms)
  useEffect(() => {
    if (inputWord === "") {
      setIsInputValid(null);
      return;
    }
    const timer = setTimeout(() => {
      const normalized = normalizeWord(inputWord).trim();
      setIsInputValid(normalized ? resources.validator(normalized) : null);
    }, 300);
    return () => clearTimeout(timer);
  }, [inputWord, resources]);

  const submitWord = useCallback(() => {
    const result = evaluateRound(draw, inputWord, resources.validator);

    if (!result.isValid) {
      setCurrentResult(result);
      return;
    }

    const best3 = solveTopN(draw, resources.dictionary, 3);
    setBestPossibleScore(best3[0]?.score.total ?? 0);
    setTop3(best3);
    setCurrentResult(result);
    setPhase({ kind: "results" });
    recordTrainingGame(result.total);
  }, [draw, inputWord, resources]);

  const retryRound = useCallback(() => {
    setInputWord("");
    setIsInputValid(null);
    setCurrentResult(null);
    setPhase({ kind: "playing" });
  }, []);

  const nextRound = useCallback(() => {
    setDraw(resources.generateDraw());
    setInputWord("");
    setIsInputValid(null);
    setCurrentResult(null);
    setBestPossibleScore(-1);
    setTop3([]);
    setPhase({ kind: "playing" });
  }, [resources]);

  return {
    draw, phase,
    inputWord, setInputWord, isInputValid,
    submitWord, retryRound, nextRound,
    currentResult, bestPossibleScore, top3,
  };
}
