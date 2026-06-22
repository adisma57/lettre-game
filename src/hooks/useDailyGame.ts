import { useState, useEffect, useCallback } from "react";
import type { Draw } from "../engine/types";
import type { RoundResult } from "../engine/RoundService";
import { evaluateRound } from "../engine/RoundService";
import { normalizeWord } from "../engine/score";
import { solveTopN, type SolverResult } from "../engine/solver";
import {
  loadDailyState,
  saveDailyState,
  getTodayKey,
} from "../services/dailyState";
import type { AttemptRecord } from "../services/dailyState";
import { submitScore } from "../services/api";
import { recordDailyGame } from "../services/statsService";
import { useLanguage } from "../contexts/LanguageContext";
import { useGameResources } from "./useGameResources";

type Phase =
  | { kind: "playing" }
  | { kind: "attempt_shown" }
  | { kind: "completed" };

export type GameState = {
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

export function useDailyGame(username: string | null): GameState {
  const { lang } = useLanguage();
  const resources = useGameResources();

  const [draw, setDraw]           = useState<Draw>(() => resources.getDailyDraw());
  const [phase, setPhase]         = useState<Phase>({ kind: "playing" });
  const [attempts, setAttempts]   = useState<AttemptRecord[]>([]);
  const [bestPossibleScore, setBestPossibleScore] = useState<number>(-1);
  const [bestWord, setBestWord]   = useState<string | null>(null);
  const [topWords, setTopWords]   = useState<SolverResult[]>([]);
  const [inputWord, setInputWord] = useState<string>("");
  const [isInputValid, setIsInputValid] = useState<boolean | null>(null);
  const [currentAttemptResult, setCurrentAttemptResult] = useState<RoundResult | null>(null);

  // Restore state for the current language, or start fresh — runs on mount and lang changes
  useEffect(() => {
    const saved = loadDailyState(lang);

    // Reset transient state on every lang change
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

      // Retry pending score submissions
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
              saveDailyState({ ...saved, submittedAttempts: newConfirmed }, lang);
            }
          });
        }
      }
    } else {
      // Fresh game for this language
      setDraw(resources.getDailyDraw());
      setAttempts([]);
      setBestPossibleScore(-1);
      setBestWord(null);
      setTopWords([]);
      setPhase({ kind: "playing" });
    }
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

    const todayKey = getTodayKey();

    if (nextPhase.kind === "completed") {
      const bestPlayerScore = Math.max(...newAttempts.map((a) => a.total));
      recordDailyGame({
        date:         todayKey,
        score:        bestPlayerScore,
        bestPossible: newBestScore,
        attempts:     newAttempts.length,
        perfect:      bestPlayerScore >= newBestScore,
      }, lang);
    }

    const attemptNum = newAttempts.length;
    const stateToSave = {
      _v: 1 as const,
      date:              todayKey,
      draw,
      attempts:          newAttempts,
      bestPossibleScore: newBestScore,
      bestWord:          newBestWord,
      completed:         nextPhase.kind === "completed",
      submittedAttempts: (loadDailyState(lang)?.submittedAttempts ?? []),
    };
    saveDailyState(stateToSave, lang);

    if (username) {
      submitScore({
        username,
        date:          todayKey,
        attempt_num:   attemptNum,
        score:         result.total,
        best_possible: newBestScore,
      }).then(ok => {
        if (ok) {
          const latest = loadDailyState(lang);
          const already = latest?.submittedAttempts ?? [];
          if (!already.includes(attemptNum)) {
            saveDailyState({ ...(latest ?? stateToSave), submittedAttempts: [...already, attemptNum] }, lang);
          }
        }
      });
    }
  }, [draw, inputWord, attempts, bestPossibleScore, bestWord, topWords, username, resources, lang]);

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
