import { useState, useEffect, useCallback } from "react";
import type { Draw } from "../engine/types";
import type { RoundResult } from "../engine/RoundService";
import { evaluateRound } from "../engine/RoundService";
import { normalizeWord } from "../engine/score";
import { solveTopN, type SolverResult } from "../engine/solver";
import {
  loadArchiveState,
  saveArchiveState,
} from "../services/dailyState";
import type { AttemptRecord } from "../services/dailyState";
import { recordDailyGame } from "../services/statsService";
import { useLanguage } from "../contexts/LanguageContext";
import { useGameResources } from "./useGameResources";

type Phase =
  | { kind: "playing" }
  | { kind: "attempt_shown" }
  | { kind: "completed" };

export type ArchiveGameState = {
  draw: Draw;
  phase: Phase;
  attempts: AttemptRecord[];
  bestPossibleScore: number;
  bestWord: string | null;
  topWords: SolverResult[];
  inputWord: string;
  setInputWord: (w: string) => void;
  isInputValid: boolean | null;
  submitWord: () => void;
  retryRound: () => void;
  currentAttemptResult: RoundResult | null;
};

function parseUTCDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function useArchiveGame(dateStr: string): ArchiveGameState {
  const { lang } = useLanguage();
  const resources = useGameResources();

  const [draw, setDraw]           = useState<Draw>(() => resources.getDailyDraw(parseUTCDate(dateStr)));
  const [phase, setPhase]         = useState<Phase>({ kind: "playing" });
  const [attempts, setAttempts]   = useState<AttemptRecord[]>([]);
  const [bestPossibleScore, setBestPossibleScore] = useState<number>(-1);
  const [bestWord, setBestWord]   = useState<string | null>(null);
  const [topWords, setTopWords]   = useState<SolverResult[]>([]);
  const [inputWord, setInputWord] = useState<string>("");
  const [isInputValid, setIsInputValid] = useState<boolean | null>(null);
  const [currentAttemptResult, setCurrentAttemptResult] = useState<RoundResult | null>(null);

  useEffect(() => {
    const archiveDraw = resources.getDailyDraw(parseUTCDate(dateStr));
    const saved = loadArchiveState(lang, dateStr);

    setInputWord("");
    setCurrentAttemptResult(null);

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
      if (saved.bestPossibleScore >= 0) {
        setTopWords(solveTopN(saved.draw, resources.dictionary, 10));
      } else {
        setTopWords([]);
      }
    } else {
      setDraw(archiveDraw);
      setAttempts([]);
      setBestPossibleScore(-1);
      setBestWord(null);
      setTopWords([]);
      setPhase({ kind: "playing" });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, dateStr]);

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
      setCurrentAttemptResult(result);
      return;
    }

    let newBestScore = bestPossibleScore;
    let newBestWord  = bestWord;
    let newTopWords  = topWords;
    if (bestPossibleScore === -1) {
      const top = solveTopN(draw, resources.dictionary, 10);
      newTopWords  = top;
      newBestScore = top[0]?.score.total ?? 0;
      newBestWord  = top[0]?.word ?? null;
      setTopWords(newTopWords);
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

    if (nextPhase.kind === "completed") {
      const bestPlayerScore = Math.max(...newAttempts.map((a) => a.total));
      recordDailyGame({
        date:         dateStr,
        score:        bestPlayerScore,
        bestPossible: newBestScore,
        attempts:     newAttempts.length,
        perfect:      bestPlayerScore >= newBestScore,
      }, lang);
    }

    saveArchiveState({
      _v: 1,
      date:              dateStr,
      draw,
      attempts:          newAttempts,
      bestPossibleScore: newBestScore,
      bestWord:          newBestWord,
      completed:         nextPhase.kind === "completed",
    }, lang);
  }, [draw, inputWord, attempts, bestPossibleScore, bestWord, topWords, resources, lang, dateStr]);

  const retryRound = useCallback(() => {
    setInputWord("");
    setIsInputValid(null);
    setCurrentAttemptResult(null);
    setPhase({ kind: "playing" });
  }, []);

  return {
    draw, phase, attempts, bestPossibleScore, bestWord, topWords,
    inputWord, setInputWord, isInputValid,
    submitWord, retryRound, currentAttemptResult,
  };
}
