import { useState, useEffect, useCallback } from "react";
import type { Draw } from "../engine/types";
import type { RoundResult } from "../engine/RoundService";
import { evaluateRound } from "../engine/RoundService";
import { normalizeWord } from "../engine/score";
import { mainValidator, mainDictionary } from "../engine/mainDictionary";
import { solveTopN, type SolverResult } from "../engine/solver";
import { getDailyDraw } from "../engine/draw";
import {
  loadDailyState,
  saveDailyState,
  getTodayKey,
} from "../services/dailyState";
import type { AttemptRecord } from "../services/dailyState";
import { submitScore } from "../services/api";

type Phase =
  | { kind: "playing" }
  | { kind: "attempt_shown" }
  | { kind: "completed" }
  | { kind: "revealed" };

export type GameState = {
  draw: Draw;
  phase: Phase;
  attempts: AttemptRecord[];
  bestPossibleScore: number;        // -1 before first attempt
  bestWord: string | null;          // null before first attempt
  topWords: SolverResult[];         // top 10 best words, empty before first attempt
  inputWord: string;
  setInputWord: (w: string) => void;
  isInputValid: boolean | null;     // null = empty, true = in dict, false = not in dict
  submitWord: () => void;
  retryRound: () => void;           // attempt_shown → playing
  revealAnswers: () => void;        // playing | attempt_shown → revealed
  currentAttemptResult: RoundResult | null;
};

export function useDailyGame(username: string | null): GameState {
  const [draw, setDraw]           = useState<Draw>(() => getDailyDraw());
  const [phase, setPhase]         = useState<Phase>({ kind: "playing" });
  const [attempts, setAttempts]   = useState<AttemptRecord[]>([]);
  const [bestPossibleScore, setBestPossibleScore] = useState<number>(-1);
  const [bestWord, setBestWord]   = useState<string | null>(null);
  const [topWords, setTopWords]   = useState<SolverResult[]>([]);
  const [inputWord, setInputWord] = useState<string>("");
  const [isInputValid, setIsInputValid] = useState<boolean | null>(null);
  const [currentAttemptResult, setCurrentAttemptResult] = useState<RoundResult | null>(null);

  // Restore persisted state on mount + retry pending score submission
  useEffect(() => {
    const saved = loadDailyState();
    if (saved) {
      setDraw(saved.draw);
      setAttempts(saved.attempts);
      setBestPossibleScore(saved.bestPossibleScore);
      setBestWord(saved.bestWord);
      setPhase(
        saved.revealed            ? { kind: "revealed"      } :
        saved.completed           ? { kind: "completed"     } :
        saved.attempts.length > 0 ? { kind: "attempt_shown" } :
                                    { kind: "playing"        }
      );
      if (saved.bestPossibleScore >= 0) {
        setTopWords(solveTopN(saved.draw, mainDictionary, 10));
      }

      // Retry any attempts not yet confirmed by the backend
      if (username && saved.attempts.length > 0) {
        const confirmed = new Set(saved.submittedAttempts ?? []);
        const pending = saved.attempts
          .map((a, i) => ({ attemptNum: i + 1, attempt: a }))
          .filter(({ attemptNum }) => !confirmed.has(attemptNum));

        if (pending.length > 0) {
          const newConfirmed = [...confirmed];
          Promise.all(
            pending.map(({ attemptNum, attempt }) =>
              submitScore({
                username,
                date:          saved.date,
                attempt_num:   attemptNum,
                score:         attempt.total,
                best_possible: saved.bestPossibleScore,
              }).then(ok => { if (ok) newConfirmed.push(attemptNum); }),
            ),
          ).then(() => {
            if (newConfirmed.length > confirmed.size) {
              saveDailyState({ ...saved, submittedAttempts: newConfirmed });
            }
          });
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    let newTopWords  = topWords;
    if (bestPossibleScore === -1) {
      const top = solveTopN(draw, mainDictionary, 10);
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

    const todayKey = getTodayKey();
    const attemptNum = newAttempts.length;
    const stateToSave = {
      _v: 1 as const,
      date:              todayKey,
      draw,
      attempts:          newAttempts,
      bestPossibleScore: newBestScore,
      bestWord:          newBestWord,
      completed:         nextPhase.kind === "completed",
      submittedAttempts: (loadDailyState()?.submittedAttempts ?? []),
    };
    saveDailyState(stateToSave);

    if (username) {
      submitScore({
        username,
        date:          todayKey,
        attempt_num:   attemptNum,
        score:         result.total,
        best_possible: newBestScore,
      }).then(ok => {
        if (ok) {
          const latest = loadDailyState();
          const already = latest?.submittedAttempts ?? [];
          if (!already.includes(attemptNum)) {
            saveDailyState({ ...(latest ?? stateToSave), submittedAttempts: [...already, attemptNum] });
          }
        }
      });
    }
  }, [draw, inputWord, attempts, bestPossibleScore, bestWord, topWords, username]);

  const retryRound = useCallback(() => {
    setInputWord("");
    setIsInputValid(null);
    setCurrentAttemptResult(null);
    setPhase({ kind: "playing" });
  }, []);

  const revealAnswers = useCallback(() => {
    let newBestScore = bestPossibleScore;
    let newBestWord  = bestWord;
    let newTopWords  = topWords;
    if (bestPossibleScore === -1) {
      const top = solveTopN(draw, mainDictionary, 10);
      newTopWords  = top;
      newBestScore = top[0]?.score.total ?? 0;
      newBestWord  = top[0]?.word ?? null;
      setTopWords(newTopWords);
      setBestPossibleScore(newBestScore);
      setBestWord(newBestWord);
    }
    setPhase({ kind: "revealed" });
    const existing = loadDailyState();
    const base = existing ?? {
      _v: 1 as const,
      date: getTodayKey(),
      draw,
      attempts,
      bestPossibleScore: newBestScore,
      bestWord: newBestWord,
      completed: true,
    };
    saveDailyState({
      ...base,
      bestPossibleScore: newBestScore,
      bestWord: newBestWord,
      completed: true,
      revealed: true,
    });
  }, [draw, attempts, bestPossibleScore, bestWord, topWords]);

  return {
    draw, phase, attempts, bestPossibleScore, bestWord, topWords,
    inputWord, setInputWord, isInputValid,
    submitWord, retryRound, revealAnswers, currentAttemptResult,
  };
}
