# Leaderboard Improvements — Design Spec

**Date:** 2026-04-06

## Overview

Two improvements to the leaderboard:
1. Highlight the current user's row so they can see their rank at a glance.
2. Replace average score with total score (sum of all daily best scores).

---

## 1. Current User Row Highlight

**Goal:** Let the logged-in user immediately spot their own row.

**Approach:**
- In `Leaderboard.tsx`, read `localStorage.getItem("auth_username")` once at component init (same key as `AUTH_STORAGE_KEY` in `useAuth.ts`).
- For the matching row (case-insensitive comparison), apply `border-l-2 border-info bg-elevated` — a blue left border with elevated background.
- Current-user styling takes **priority** over rank-1 styling when both apply (current user IS rank 1).

**No backend changes required.** Username is already present in every `LeaderboardEntry`.

---

## 2. Total Score Instead of Average Score

Replace `avg_score` (average) with `total_score` (sum of all daily scores) across the full stack.

### `server/repo.ts`

- `LEADERBOARD_BASE`: replace `ROUND(AVG(s.score)::numeric, 1)::float8 AS avg_score` → `SUM(s.score)::int AS total_score`
- `LeaderboardRow` type: rename field `avg_score: number` → `total_score: number`
- In-memory path: already computes `sum`; expose it as `total_score` instead of `avg_score`. Remove the division-based avg computation.
- Sort comparators: replace `avg_score` references with `total_score` in all three sort branches.
- SQL sort: `ORDER BY avg_score DESC` → `ORDER BY total_score DESC`

### `src/services/api.ts`

- `LeaderboardEntry`: rename `avg_score: number` → `total_score: number`
- `LeaderboardSort`: rename literal `"avg_score"` → `"total_score"`

### `src/pages/Leaderboard.tsx`

- `SORT_OPTIONS`: rename value `"avg_score"` → `"total_score"`, label `"Score moyen"` → `"Score total"`
- Column header `<th>`: `"Moy."` → `"Total"`
- Row cell: `row.avg_score` → `row.total_score`
- Default sort state: `"avg_score"` → `"total_score"`

---

## Files Changed

| File | Change |
|------|--------|
| `server/repo.ts` | SQL + type + in-memory logic |
| `src/services/api.ts` | Type updates |
| `src/pages/Leaderboard.tsx` | UI + sort + highlight logic |

## Out of Scope

- No change to score submission or other leaderboard columns.
- No new API endpoints.
