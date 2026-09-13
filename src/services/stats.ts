import { storageKey } from "../language";
import { daysBetween, isDayKey } from "../engine/dayKey";

export const STATS_STORAGE_KEY = storageKey("quadra:stats");

/** How many days a spent joker stays unavailable. */
const JOKER_COOLDOWN_DAYS = 7;

export type Stats = {
  _v: 1;
  gamesPlayed: number;
  currentStreak: number;
  maxStreak: number;
  lastPlayedDate: string | null;
  jokerUsedOn: string | null;
  scoreSum: number;
  accuracySum: number;
  accuracyCount: number;
  attemptDistribution: [number, number, number];
  perfectCount: number;
};

export type GameResult = {
  date: string;
  score: number;
  /** null when the server could not supply the denominator (offline). */
  bestPossible: number | null;
  /** 0 for a reveal with no attempt at all. */
  attempts: number;
};

export function createEmptyStats(): Stats {
  return {
    _v: 1,
    gamesPlayed: 0,
    currentStreak: 0,
    maxStreak: 0,
    lastPlayedDate: null,
    jokerUsedOn: null,
    scoreSum: 0,
    accuracySum: 0,
    accuracyCount: 0,
    attemptDistribution: [0, 0, 0],
    perfectCount: 0,
  };
}

function jokerAvailable(stats: Stats, today: string): boolean {
  if (stats.jokerUsedOn === null) return true;
  return daysBetween(stats.jokerUsedOn, today) > JOKER_COOLDOWN_DAYS;
}

/**
 * Applies a finished game's result. Pure: reads and writes no storage,
 * which is what makes the streak rules testable without a DOM.
 */
export function applyResult(stats: Stats, result: GameResult): Stats {
  const next: Stats = {
    ...stats,
    attemptDistribution: [...stats.attemptDistribution] as [number, number, number],
  };

  // ─── Streak ───
  const gap =
    stats.lastPlayedDate === null
      ? null
      : daysBetween(stats.lastPlayedDate, result.date);

  if (gap === null) {
    next.currentStreak = 1;
  } else if (gap <= 0) {
    // Same day replayed, or a device clock that moved backwards. The habit is
    // unbroken either way, so leave the streak alone. Resetting here would let
    // a duplicate call — or a traveller crossing a time zone — silently wipe a
    // streak the player never actually broke.
    next.currentStreak = stats.currentStreak;
  } else if (gap === 1) {
    next.currentStreak = stats.currentStreak + 1;
  } else if (gap === 2 && jokerAvailable(stats, result.date)) {
    next.currentStreak = stats.currentStreak + 1;
    next.jokerUsedOn = result.date;
  } else {
    next.currentStreak = 1;
  }

  next.maxStreak = Math.max(stats.maxStreak, next.currentStreak);
  // Never let the last played day move backwards.
  next.lastPlayedDate = gap !== null && gap < 0 ? stats.lastPlayedDate : result.date;

  // ─── Aggregates ───
  next.gamesPlayed = stats.gamesPlayed + 1;
  next.scoreSum = stats.scoreSum + result.score;

  if (result.attempts >= 1 && result.attempts <= 3) {
    next.attemptDistribution[result.attempts - 1] += 1;
  }

  // A reveal without an attempt, or an offline game, has no usable accuracy:
  // folding it into the average would understate the player's real precision.
  if (result.bestPossible !== null && result.bestPossible > 0 && result.attempts >= 1) {
    next.accuracySum = stats.accuracySum + result.score / result.bestPossible;
    next.accuracyCount = stats.accuracyCount + 1;
    if (result.score >= result.bestPossible) {
      next.perfectCount = stats.perfectCount + 1;
    }
  }

  return next;
}

export function loadStats(): Stats {
  try {
    const raw = localStorage.getItem(STATS_STORAGE_KEY);
    if (!raw) return createEmptyStats();
    const parsed = JSON.parse(raw) as Partial<Stats>;
    if (parsed._v !== 1) return createEmptyStats();
    const merged = { ...createEmptyStats(), ...parsed } as Stats;

    // localStorage is player-editable and can be corrupted. daysBetween throws
    // on a malformed key, so sanitise at the boundary rather than letting an
    // exception surface on the game screen.
    if (!isDayKey(merged.lastPlayedDate)) merged.lastPlayedDate = null;
    if (!isDayKey(merged.jokerUsedOn)) merged.jokerUsedOn = null;

    return merged;
  } catch {
    return createEmptyStats();
  }
}

/** Returns false when the write failed (storage unavailable). */
export function saveStats(stats: Stats): boolean {
  try {
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
    return true;
  } catch {
    return false;
  }
}

/**
 * Whether localStorage is actually usable. Distinguishes a brand-new player
 * from one whose storage is blocked — both otherwise show empty stats, and
 * telling a blocked player "0 games" would be a lie.
 */
export function isStatsStorageAvailable(): boolean {
  try {
    const probe = "quadra:probe";
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}
