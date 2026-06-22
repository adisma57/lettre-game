const STATS_KEY = "quadra:stats:v1";

export interface DailyGameRecord {
  date: string;
  score: number;
  bestPossible: number;
  attempts: number;
  perfect: boolean;
}

export interface StatsData {
  _v: 1;
  dailyGames: DailyGameRecord[];
  trainingGamesPlayed: number;
  trainingTotalScore: number;
  // Derived — recomputed on every write
  averagePerformance: number; // avg(score/bestPossible) * 100 rounded
  bestScore: number;
  perfectGames: number;
  currentStreak: number;
  longestStreak: number;
  attemptDist: { 1: number; 2: number; 3: number };
}

function defaultStats(): StatsData {
  return {
    _v: 1,
    dailyGames: [],
    trainingGamesPlayed: 0,
    trainingTotalScore: 0,
    averagePerformance: 0,
    bestScore: 0,
    perfectGames: 0,
    currentStreak: 0,
    longestStreak: 0,
    attemptDist: { 1: 0, 2: 0, 3: 0 },
  };
}

function computeStreak(sortedDatesDesc: string[]): {
  current: number;
  longest: number;
} {
  if (sortedDatesDesc.length === 0) return { current: 0, longest: 0 };

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  // Current streak: only active if last played today or yesterday
  let current = 0;
  if (
    sortedDatesDesc[0] === todayStr ||
    sortedDatesDesc[0] === yesterdayStr
  ) {
    current = 1;
    for (let i = 1; i < sortedDatesDesc.length; i++) {
      const msGap =
        new Date(sortedDatesDesc[i - 1]).getTime() -
        new Date(sortedDatesDesc[i]).getTime();
      if (Math.round(msGap / 86400000) === 1) {
        current++;
      } else {
        break;
      }
    }
  }

  // Longest streak across all history
  let longest = sortedDatesDesc.length > 0 ? 1 : 0;
  let run = 1;
  for (let i = 1; i < sortedDatesDesc.length; i++) {
    const msGap =
      new Date(sortedDatesDesc[i - 1]).getTime() -
      new Date(sortedDatesDesc[i]).getTime();
    if (Math.round(msGap / 86400000) === 1) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }

  return { current, longest };
}

function recompute(stats: StatsData): StatsData {
  const games = stats.dailyGames;
  let totalRatio = 0;
  let bestScore = 0;
  let perfectGames = 0;
  const attemptDist: StatsData["attemptDist"] = { 1: 0, 2: 0, 3: 0 };

  for (const g of games) {
    if (g.bestPossible > 0) totalRatio += g.score / g.bestPossible;
    if (g.score > bestScore) bestScore = g.score;
    if (g.perfect) perfectGames++;
    const k = g.attempts as 1 | 2 | 3;
    if (k >= 1 && k <= 3) attemptDist[k]++;
  }

  const averagePerformance =
    games.length > 0 ? Math.round((totalRatio / games.length) * 100) : 0;

  const sortedDates = games
    .map((g) => g.date)
    .sort()
    .reverse();
  const { current, longest } = computeStreak(sortedDates);

  return {
    ...stats,
    averagePerformance,
    bestScore,
    perfectGames,
    currentStreak: current,
    longestStreak: longest,
    attemptDist,
  };
}

export function getStats(): StatsData {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return defaultStats();
    const parsed = JSON.parse(raw) as StatsData;
    if (parsed._v !== 1) return defaultStats();
    return parsed;
  } catch {
    return defaultStats();
  }
}

function save(stats: StatsData): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    console.error("[statsService] Failed to save stats");
  }
}

export function recordDailyGame(record: DailyGameRecord): void {
  const stats = getStats();
  const idx = stats.dailyGames.findIndex((g) => g.date === record.date);
  if (idx >= 0) {
    stats.dailyGames[idx] = record;
  } else {
    stats.dailyGames.push(record);
  }
  save(recompute(stats));
}

export function recordTrainingGame(score: number): void {
  const stats = getStats();
  stats.trainingGamesPlayed++;
  stats.trainingTotalScore += score;
  save(stats);
}
