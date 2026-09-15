import { useState, useEffect, useCallback, useRef } from "react";
import type { Draw } from "../engine/types";
import type { RoundResult } from "../engine/RoundService";
import type { SolverResult } from "../engine/solver";
import { evaluateRound } from "../engine/RoundService";
import { normalizeWord } from "../engine/score";
import { mainValidator, loadMainDictionary, isDictionaryReady } from "../engine/mainDictionary";
import { getDailyDraw } from "../engine/draw";
import { getTodayKey } from "../engine/dayKey";
import {
  loadDailyState, saveDailyState, createFreshState,
  type AttemptRecord, type DailyState,
} from "../services/dailyState";
import { submitAttempt, fetchFinish, prepareDaily } from "../services/api";
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
  dictReady: boolean;
  isLoading: boolean;
};

export function useDailyGame(): GameState {
  const today = getTodayKey();
  const [state, setState] = useState<DailyState>(
    () => loadDailyState() ?? createFreshState(today, getDailyDraw(today)),
  );
  const [phase, setPhase] = useState<Phase>(() => {
    const s = loadDailyState();
    if (!s) return { kind: "playing" };
    return s.revealed  ? { kind: "revealed" }
         : s.completed ? { kind: "completed" }
         : s.attempts.length > 0 ? { kind: "attempt_shown" }
         : { kind: "playing" };
  });
  const [inputWord, setInputWordState] = useState("");
  const [isInputValid, setIsInputValid] = useState<boolean | null>(null);
  const [currentAttemptResult, setCurrentAttemptResult] = useState<RoundResult | null>(null);
  const [dictReady, setDictReady] = useState(isDictionaryReady());
  const [isLoading, setIsLoading] = useState(false);
  const requestInFlight = useRef(false);
  const preparedDay = useRef<string | null>(null);

  useEffect(() => {
    if (state.completed || preparedDay.current === today) return;
    preparedDay.current = today;
    void prepareDaily(today);
  }, [today, state.completed]);

  // Kicks off the dictionary load off the critical path. Wrapped in an async
  // IIFE (rather than `void loadMainDictionary().then(...)` directly) for the
  // same reason as useTraining's loadRound effect: it keeps the
  // react-hooks/set-state-in-effect static analysis from tracing a synchronous
  // setState call back into this effect. setDictReady only ever runs after
  // `await`, in a microtask queued outside the effect's synchronous execution.
  useEffect(() => {
    void (async () => {
      await loadMainDictionary();
      setDictReady(true);
    })();
  }, []);

  // Setting state here (rather than in the debounce effect below) keeps this
  // a plain event-handler-triggered update, not a synchronous setState inside
  // an effect.
  const setInputWord = useCallback((w: string) => {
    setInputWordState(w);
    if (w === "") setIsInputValid(null);
  }, []);

  // Guards against submitWord's async continuation and revealAnswers both
  // calling finish() with a stats write for the same game. The persisted
  // `statsApplied` flag on DailyState survives reloads (so a later visit
  // won't reapply stats for an already-finished game), but it cannot by
  // itself prevent two concurrent callers *within the same page load* from
  // both reading it as false before either has written `true` back — that's
  // exactly the race a network round trip opens up. This ref is checked and
  // set synchronously (no `await` in between), so whichever caller reaches
  // `finish` first claims the write and the other is locked out, regardless
  // of how the two calls interleave around their own awaits.
  const statsWritten = useRef(false);

  // Replay any queued attempts left over from a previous session.
  useEffect(() => {
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

  // Debounced input validation (300 ms). Skipped until the dictionary has
  // loaded — otherwise every word would flash a false "not in dictionary"
  // border while it's still in flight.
  useEffect(() => {
    if (inputWord === "" || !dictReady) return;
    const timer = setTimeout(() => {
      const normalized = normalizeWord(inputWord).trim();
      setIsInputValid(normalized ? mainValidator(normalized) : null);
    }, 300);
    return () => clearTimeout(timer);
  }, [inputWord, dictReady]);

  /** Ends the game: fetches answer, top 10 and percentile, then updates stats. */
  const finish = useCallback(
    async (finalState: DailyState, bestScore: number, attemptCount: number) => {
      // Check-and-set must happen synchronously, before the first `await`
      // below, so no other call to `finish` can slip in between.
      const shouldApplyStats = !finalState.statsApplied && !statsWritten.current;
      if (shouldApplyStats) statsWritten.current = true;

      const answers = await fetchFinish(finalState.date, bestScore);

      const next: DailyState = {
        ...finalState,
        bestWord: answers?.bestWord ?? finalState.bestWord,
        topWords: answers?.topWords ?? finalState.topWords,
        percentile: answers?.percentile ?? null,
        playersToday: answers?.playersToday ?? 0,
      };

      if (shouldApplyStats) {
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
    if (!dictReady || requestInFlight.current || phase.kind !== "playing") return;

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

    requestInFlight.current = true;
    setIsLoading(true);
    void (async () => {
      try {
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
      } finally {
        requestInFlight.current = false;
        setIsLoading(false);
      }
    })();
  }, [state, inputWord, finish, dictReady, phase.kind]);

  const retryRound = useCallback(() => {
    if (requestInFlight.current) return;
    setInputWord("");
    setCurrentAttemptResult(null);
    setPhase({ kind: "playing" });
  }, [setInputWord]);

  const revealAnswers = useCallback(() => {
    if (requestInFlight.current || state.completed) return;
    requestInFlight.current = true;
    setIsLoading(true);
    const next: DailyState = { ...state, revealed: true, completed: true };
    setState(next);
    saveDailyState(next);
    setPhase({ kind: "revealed" });
    const bestScore = state.attempts.length
      ? Math.max(...state.attempts.map((a) => a.total))
      : 0;
    void finish(next, bestScore, state.attempts.length).finally(() => {
      requestInFlight.current = false;
      setIsLoading(false);
    });
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
    dictReady, isLoading,
  };
}
