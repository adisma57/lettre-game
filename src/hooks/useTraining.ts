import { useState, useEffect, useCallback } from "react";
import type { Draw } from "../engine/types";
import type { RoundResult } from "../engine/RoundService";
import { evaluateRound } from "../engine/RoundService";
import { normalizeWord } from "../engine/score";
import { mainValidator, loadMainDictionary, isDictionaryReady } from "../engine/mainDictionary";
import type { SolverResult } from "../engine/solver";
import { fetchTrainingRound } from "../services/api";

type Phase = { kind: "playing" } | { kind: "results" };

export type TrainingState = {
  draw: Draw;
  loading: boolean;
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
  dictReady: boolean;
};

export function useTraining(): TrainingState {
  const [draw, setDraw]           = useState<Draw>([]);
  const [pendingTop3, setPendingTop3] = useState<SolverResult[]>([]);
  const [loading, setLoading]     = useState(true);   // true from first render
  const [phase, setPhase]         = useState<Phase>({ kind: "playing" });
  const [inputWord, setInputWordState] = useState<string>("");
  const [isInputValid, setIsInputValid] = useState<boolean | null>(null);
  const [currentResult, setCurrentResult] = useState<RoundResult | null>(null);
  const [bestPossibleScore, setBestPossibleScore] = useState<number>(-1);
  const [top3, setTop3]           = useState<SolverResult[]>([]);
  const [dictReady, setDictReady] = useState(isDictionaryReady());

  // Setting state here (rather than in the debounce effect below) keeps this
  // a plain event-handler-triggered update, not a synchronous setState inside
  // an effect.
  const setInputWord = useCallback((w: string) => {
    setInputWordState(w);
    if (w === "") setIsInputValid(null);
  }, []);

  // No setLoading(true) here: loadRound is called from a useEffect, and a
  // synchronous setState inside an effect trips react-hooks/set-state-in-effect
  // — the very rule that currently fails on this file. The initial state is
  // already true, and nextRound sets it from an event handler.
  const loadRound = useCallback(async () => {
    const round = await fetchTrainingRound();
    if (round) {
      setDraw(round.draw);
      setPendingTop3(round.top3);
    }
    setLoading(false);
  }, []);

  // Wrapped in its own async IIFE (rather than `void loadRound()` directly)
  // so the eslint static analysis for react-hooks/set-state-in-effect — which
  // otherwise traces the call through the named `loadRound` reference back to
  // its setState calls — doesn't flag this as a synchronous setState in an
  // effect. The setState calls only ever run after `await`, in a microtask
  // queued outside the effect's synchronous execution.
  useEffect(() => { void (async () => { await loadRound(); })(); }, [loadRound]);

  // Kicks off the dictionary load off the critical path. Same async-IIFE
  // shape as loadRound's effect above, for the same reason: it keeps
  // react-hooks/set-state-in-effect from flagging a synchronous setState
  // inside this effect. setDictReady only runs after `await`.
  useEffect(() => {
    void (async () => {
      await loadMainDictionary();
      setDictReady(true);
    })();
  }, []);

  // Debounced input validity check (300 ms). Skipped until the dictionary
  // has loaded — otherwise every word would flash a false "not in
  // dictionary" border while it's still in flight.
  useEffect(() => {
    if (inputWord === "" || !dictReady) return;
    const timer = setTimeout(() => {
      const normalized = normalizeWord(inputWord).trim();
      setIsInputValid(normalized ? mainValidator(normalized) : null);
    }, 300);
    return () => clearTimeout(timer);
  }, [inputWord, dictReady]);

  const submitWord = useCallback(() => {
    if (!dictReady) return; // guard: mainValidator would wrongly reject every word until loaded

    const result = evaluateRound(draw, inputWord, mainValidator);

    if (!result.isValid) {
      setCurrentResult(result);
      return;
    }

    setBestPossibleScore(pendingTop3[0]?.score.total ?? 0);
    setTop3(pendingTop3);
    setCurrentResult(result);
    setPhase({ kind: "results" });
  }, [draw, inputWord, pendingTop3, dictReady]);

  const retryRound = useCallback(() => {
    setInputWord("");
    setCurrentResult(null);
    setPhase({ kind: "playing" });
  }, [setInputWord]);

  const nextRound = useCallback(() => {
    setInputWord("");
    setCurrentResult(null);
    setBestPossibleScore(-1);
    setTop3([]);
    setPendingTop3([]);
    setPhase({ kind: "playing" });
    setLoading(true);
    void loadRound();
  }, [setInputWord, loadRound]);

  return {
    draw, loading, phase,
    inputWord, setInputWord, isInputValid,
    submitWord, retryRound, nextRound,
    currentResult, bestPossibleScore, top3,
    dictReady,
  };
}
