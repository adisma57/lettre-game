import { useState, useEffect, useCallback } from "react";
import type { Draw } from "../engine/types";
import type { RoundResult } from "../engine/RoundService";
import { evaluateRound } from "../engine/RoundService";
import { normalizeWord } from "../engine/score";
import { mainValidator, mainDictionary } from "../engine/mainDictionary";
import { findBestWordForDraw } from "../engine/findBestWord";
import { getDailyDraw } from "../engine/draw";
import {
  loadDailyState,
  saveDailyState,
  getTodayKey,
} from "../services/dailyState";
import type { AttemptRecord } from "../services/dailyState";
import { submitScore } from "../services/api";
import { AUTH_STORAGE_KEY } from "./useAuth";

type Phase =
  | { kind: "playing" }
  | { kind: "attempt_shown" }
  | { kind: "completed" };

export type GameState = {
  draw: Draw;
  phase: Phase;
  attempts: AttemptRecord[];
  bestPossibleScore: number;        // -1 before first attempt
  bestWord: string | null;          // null before first attempt
  inputWord: string;
  setInputWord: (w: string) => void;
  isInputValid: boolean | null;     // null = empty, true = in dict, false = not in dict
  submitWord: () => void;
  retryRound: () => void;           // attempt_shown → playing
  currentAttemptResult: RoundResult | null;
};

export function useDailyGame(): GameState {
  const [draw, setDraw]           = useState<Draw>(() => getDailyDraw());
  const [phase, setPhase]         = useState<Phase>({ kind: "playing" });
  const [attempts, setAttempts]   = useState<AttemptRecord[]>([]);
  const [bestPossibleScore, setBestPossibleScore] = useState<number>(-1);
  const [bestWord, setBestWord]   = useState<string | null>(null);
  const [inputWord, setInputWord] = useState<string>("");
  const [isInputValid, setIsInputValid] = useState<boolean | null>(null);
  const [currentAttemptResult, setCurrentAttemptResult] = useState<RoundResult | null>(null);

  // Restore persisted state on mount
  useEffect(() => {
    const saved = loadDailyState();
    if (saved) {
      setDraw(saved.draw);
      setAttempts(saved.attempts);
      setBestPossibleScore(saved.bestPossibleScore);
      setBestWord(saved.bestWord);
      setPhase(
        saved.completed           ? { kind: "completed"     } :
        saved.attempts.length > 0 ? { kind: "attempt_shown" } :
                                    { kind: "playing"        }
      );
    }
  }, []);

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

    // Invalid word → show error message, do NOT consume an attempt
    if (!result.isValid) {
      setCurrentAttemptResult(result);
      return;
    }

    // Compute best possible score lazily on first valid submit (~50 ms)
    let newBestScore = bestPossibleScore;
    let newBestWord  = bestWord;
    if (bestPossibleScore === -1) {
      const best = findBestWordForDraw(draw, mainDictionary);
      newBestScore = best?.score ?? 0;
      newBestWord  = best?.word  ?? null;
      setBestPossibleScore(newBestScore);
      setBestWord(newBestWord);
    }

    const newAttempt: AttemptRecord = {
      rawWord:        result.rawWord,
      normalizedWord: result.normalizedWord,
      total:          result.total,
    };
    const newAttempts = [...attempts, newAttempt];
    setAttempts(newAttempts);
    setCurrentAttemptResult(result);

    const won = newBestScore >= 0 && result.total >= newBestScore;
    const nextPhase: Phase =
      won || newAttempts.length >= 3
        ? { kind: "completed"     }
        : { kind: "attempt_shown" };
    setPhase(nextPhase);

    const todayKey = getTodayKey();
    saveDailyState({
      _v: 1,
      date:              todayKey,
      draw,
      attempts:          newAttempts,
      bestPossibleScore: newBestScore,
      bestWord:          newBestWord,
      completed:         nextPhase.kind === "completed",
    });

    if (nextPhase.kind === "completed") {
      const username = localStorage.getItem(AUTH_STORAGE_KEY);
      if (username) {
        submitScore({
          username,
          date:         todayKey,
          score:        result.total,
          best_possible: newBestScore,
          attempts:     newAttempts.length,
        });
      }
    }
  }, [draw, inputWord, attempts, bestPossibleScore, bestWord]);

  const retryRound = useCallback(() => {
    setInputWord("");
    setIsInputValid(null);
    setCurrentAttemptResult(null);
    setPhase({ kind: "playing" });
  }, []);

  return {
    draw, phase, attempts, bestPossibleScore, bestWord,
    inputWord, setInputWord, isInputValid,
    submitWord, retryRound, currentAttemptResult,
  };
}
