import { useState, useEffect, useCallback } from "react";
import type { Draw } from "../engine/types";
import type { RoundResult } from "../engine/RoundService";
import type { SolverResult } from "../engine/solver";
import { evaluateRound } from "../engine/RoundService";
import { normalizeWord } from "../engine/score";
import { mainValidator } from "../engine/mainDictionary";
import { getDailyDraw } from "../engine/draw";
import { getTodayKey } from "../engine/dayKey";
import {
  loadDailyState, saveDailyState, createFreshState,
  type AttemptRecord, type DailyState,
} from "../services/dailyState";
import { submitAttempt, fetchFinish } from "../services/api";
import { getDeviceId } from "../services/deviceId";
import { loadStats, saveStats, applyResult } from "../services/stats";
import { enqueuePending, loadPending, clearPending } from "../services/pending";

type Phase =
  | { kind: "playing" }
  | { kind: "attempt_shown" }
  | { kind: "completed" }
  | { kind: "revealed" };

const MAX_ATTEMPTS = 3;

export type GameState = {
  draw: Draw;
  phase: Phase;
  attempts: AttemptRecord[];
  bestPossibleScore: number;
  bestWord: string | null;
  topWords: SolverResult[];
  percentile: number | null;
  playersToday: number;
  inputWord: string;
  setInputWord: (w: string) => void;
  isInputValid: boolean | null;
  submitWord: () => void;
  retryRound: () => void;
  revealAnswers: () => void;
  currentAttemptResult: RoundResult | null;
};

export function useDailyGame(): GameState {
  const today = getTodayKey();
  const [state, setState] = useState<DailyState>(() =>
    createFreshState(today, getDailyDraw(today)),
  );
  const [phase, setPhase] = useState<Phase>({ kind: "playing" });
  const [inputWord, setInputWord] = useState("");
  const [isInputValid, setIsInputValid] = useState<boolean | null>(null);
  const [currentAttemptResult, setCurrentAttemptResult] = useState<RoundResult | null>(null);

  // Restore saved state and replay any queued attempts
  useEffect(() => {
    const saved = loadDailyState();
    if (saved) {
      setState(saved);
      setPhase(
        saved.revealed  ? { kind: "revealed"      } :
        saved.completed ? { kind: "completed"     } :
        saved.attempts.length > 0 ? { kind: "attempt_shown" } :
                                    { kind: "playing" },
      );
    }

    const queue = loadPending();
    if (queue.length === 0) return;
    const deviceId = getDeviceId();
    void (async () => {
      for (const item of queue) {
        await submitAttempt({ ...item, deviceId });
      }
      clearPending();
    })();
  }, []);

  // Debounced input validation (300 ms)
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

  /** Ends the game: fetches answer, top 10 and percentile, then updates stats. */
  const finish = useCallback(
    async (finalState: DailyState, bestScore: number, attemptCount: number) => {
      const answers = await fetchFinish(finalState.date, bestScore);

      const next: DailyState = {
        ...finalState,
        bestWord: answers?.bestWord ?? finalState.bestWord,
        topWords: answers?.topWords ?? finalState.topWords,
        percentile: answers?.percentile ?? null,
        playersToday: answers?.playersToday ?? 0,
      };

      if (!finalState.statsApplied) {
        const stats = applyResult(loadStats(), {
          date: finalState.date,
          score: bestScore,
          bestPossible: finalState.bestPossibleScore >= 0 ? finalState.bestPossibleScore : null,
          attempts: attemptCount,
        });
        saveStats(stats);
        next.statsApplied = true;
      }

      setState(next);
      saveDailyState(next);
    },
    [],
  );

  const submitWord = useCallback(() => {
    const result = evaluateRound(state.draw, inputWord, mainValidator);

    if (!result.isValid) {
      setCurrentAttemptResult(result);
      return;   // an invalid word does not consume an attempt
    }

    const attempt: AttemptRecord = {
      rawWord: result.rawWord,
      normalizedWord: result.normalizedWord,
      total: result.total,
      score: result.score,
    };
    const attempts = [...state.attempts, attempt];
    const attemptNum = attempts.length;
    const deviceId = getDeviceId();

    setCurrentAttemptResult(result);

    void (async () => {
      const res = await submitAttempt({
        date: state.date, deviceId, attemptNum, score: result.total,
      });
      if (res === null) {
        enqueuePending({ date: state.date, attemptNum, score: result.total });
      }

      const bestPossible = res?.bestPossible ?? state.bestPossibleScore;
      const bestScore = Math.max(...attempts.map((a) => a.total));
      const won = bestPossible >= 0 && bestScore >= bestPossible;
      const over = won || attemptNum >= MAX_ATTEMPTS;

      const next: DailyState = {
        ...state,
        attempts,
        bestPossibleScore: bestPossible,
        completed: over,
      };
      setState(next);
      saveDailyState(next);
      setPhase(over ? { kind: "completed" } : { kind: "attempt_shown" });
      if (over) await finish(next, bestScore, attemptNum);
    })();
  }, [state, inputWord, finish]);

  const retryRound = useCallback(() => {
    setInputWord("");
    setIsInputValid(null);
    setCurrentAttemptResult(null);
    setPhase({ kind: "playing" });
  }, []);

  const revealAnswers = useCallback(() => {
    const next: DailyState = { ...state, revealed: true, completed: true };
    setState(next);
    saveDailyState(next);
    setPhase({ kind: "revealed" });
    const bestScore = state.attempts.length
      ? Math.max(...state.attempts.map((a) => a.total))
      : 0;
    void finish(next, bestScore, state.attempts.length);
  }, [state, finish]);

  return {
    draw: state.draw,
    phase,
    attempts: state.attempts,
    bestPossibleScore: state.bestPossibleScore,
    bestWord: state.bestWord,
    topWords: state.topWords,
    percentile: state.percentile,
    playersToday: state.playersToday,
    inputWord, setInputWord, isInputValid,
    submitWord, retryRound, revealAnswers, currentAttemptResult,
  };
}
