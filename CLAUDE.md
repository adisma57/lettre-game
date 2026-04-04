# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server (localhost:5173, HMR)
npm run server    # Start Hono API server (localhost:3001)
npm run build     # Type-check (tsc) then bundle (vite)
npm run lint      # ESLint
npm run test      # Vitest in watch mode
npm run preview   # Serve the production build locally
```

Run a single test file:
```bash
npx vitest run src/engine/score.test.ts
```

The Vite dev server proxies `/api/*` to `localhost:3001` — run both servers in dev.

## Architecture

**Quadra** is a French word game: the player proposes a word built around a random 4-letter draw and earns points based on how well the word incorporates the drawn letters.

### Scoring formula

`score = usedLetters × 3  +  (orderBonus ? 3 : 0)  −  insertions`

- **usedLetters** — draw letters found in the word (duplicates count separately)
- **orderBonus** — +3 if the skeleton matches the draw order exactly
- **insertions** — non-skeleton letters strictly between the first and last skeleton position ("the zone")

The **skeleton** is the greedy left-to-right subsequence of word positions that consume all available draw letters.

### Engine layer (`src/engine/`)

Pure TypeScript, zero React. All game logic lives here.

| File | Responsibility |
|------|----------------|
| `types.ts` | Shared types: `Draw`, `WordValidator`, `ScoreResult`, `ScorePart` |
| `draw.ts` | Weighted letter pool; `generateDrawWeighted(count)`; `getDailyDraw(date)` |
| `score.ts` | `normalizeWord`, `scoreWord` — the full scoring pipeline |
| `DictionaryService.ts` | `Dictionary` interface (`has` + `words`); `createSetDictionary`; `createWordValidatorFromDictionary` |
| `mainDictionary.ts` | Singleton: loads `an-array-of-french-words`, exports `mainDictionary` and `mainValidator` |
| `RoundService.ts` | `createDraw()` and `evaluateRound(draw, rawWord, validator)` |
| `solver.ts` | `solveTopN(draw, dict, n): SolverResult[]` — full dictionary scan, sorted score desc then length asc |
| `findBestWord.ts` | Thin wrapper around `solveTopN(…, 1)` |

### UI layer (`src/`)

React Router v6 SPA. `App.tsx` mounts `Layout` which renders `NavBar` + `<Outlet />` + `UsernameModal` (when guest).

#### Reusable components

| Component | Location | Used by |
|-----------|----------|---------|
| `Button` | `components/ui/` | everywhere — variants: primary, secondary, ghost |
| `Card` | `components/ui/` | Rules sections, DailyGame summary |
| `Badge` | `components/ui/` | Rules score items |
| `DrawDisplay` | `components/game/` | DailyGame, Training, Rules examples |
| `DrawInput` | `components/game/` | Solver (4-tile input with internal focus management) |
| `WordInput` | `components/game/` | DailyGame, Training |
| `ColoredWord` | `components/game/` | DailyGame, Training — exports `ROLE_CLASS_BY_STRING` for Rules |
| `ScoreCard` | `components/game/` | DailyGame, Training |
| `SolverResultsList` | `components/game/` | Training top-3 (collapsible) |
| `SolverResultsTable` | `components/game/` | Solver full table |

`computeLetterRoles` inside `ColoredWord` assigns display roles (`ordered` / `unordered` / `insert` / `unused`) purely from `ScoreResult` fields — no engine logic is duplicated in the UI.

### Auth

- `useAuth` reads/writes `auth_username` from `localStorage`
- `UsernameModal` blocks the UI on first visit until the user picks a name (calls `POST /api/users`)
- Username is passed as the `X-Username` header in future authenticated requests

### Backend (`server/`)

Hono on Node.js, `better-sqlite3`, ESM.

| File | Responsibility |
|------|----------------|
| `db.ts` | Opens `server/quadra.sqlite`, WAL mode, creates `users` table |
| `index.ts` | `POST /api/users`, `GET /api/users/:name/exists`, global JSON error handler |

Username rules: 2–20 chars, `[A-Za-z0-9_-]` only, case-insensitive unique.

### Key design notes

- **`Dictionary.words()`** — `findBestWord.ts` iterates the full dictionary via `Dictionary.words(): Iterable<string>`. Do not bypass this by accessing the underlying `Set` directly.
- **Normalization** — all text comparison goes through `score.normalizeWord`: `toUpperCase()` + NFD decomposition + diacritic strip. Called on both the word and the draw in every scoring function.
- **Daily draw** — `getDailyDraw(date)` uses a seeded LCG (`mulberry32`-style), seed = `YYYYMMDD` integer. Same UTC date → same draw for all users.

### Design tokens (Tailwind v4 — `src/index.css`)

| Token | Value | Tailwind utility |
|-------|-------|-----------------|
| `--color-canvas` | `#0f0f0f` | `bg-canvas` |
| `--color-surface` | `#1c1c1c` | `bg-surface` |
| `--color-elevated` | `#252525` | `bg-elevated` |
| `--color-line` | `#2e2e2e` | `border-line` |
| `--color-fg` | `#f5f5f5` | `text-fg` |
| `--color-muted` | `#737373` | `text-muted` |
| `--color-primary` | `#f97316` | `text-primary` / `bg-primary` |
| `--color-primary-dim` | `#ea6c0a` | `text-primary-dim` |
| `--color-success` | `#16a34a` | `text-success` |
| `--color-error` | `#dc2626` | `text-error` |
| `--color-info` | `#2563eb` | `text-info` |

---

## Development roadmap

### Stack decisions (already made, do not revisit)

- **Router**: React Router v6 (`createBrowserRouter` + `RouterProvider`)
- **CSS**: Tailwind CSS v4 via `@tailwindcss/vite` — no `tailwind.config.ts`, tokens in `@theme`
- **State**: `useState` + `useReducer` per page; `useContext` only for auth (future)
- **Backend**: Hono on Node + SQLite (`better-sqlite3`) — username-only auth, leaderboard

### Routes

```
/           → Home
/daily      → DailyGame   (3 tries, seeded daily draw)
/training   → Training    (infinite random rounds)
/solver     → Solver      (draw input → top 10 words)
/rules      → Rules       (from src/content/rules.json)
```

### Milestones

#### ✅ M1 — Foundation (DONE)
React Router v6, Tailwind v4, design tokens, `Layout` + `NavBar`, page shells.

#### ✅ M2 — Rules page (DONE)
- `src/content/rules.json` — sections: objectif, valid-words, score, code couleur, modes
- `src/pages/Rules.tsx` — typed renderer, 5 sub-components (Formula, ScoreItems, Examples, ColorLegend, GameModes)

#### ✅ M3 — Daily draw engine + page (DONE)
- `getDailyDraw(date: Date): Draw` — seeded LCG, seed = `YYYYMMDD`, deterministic per UTC date
- `src/services/dailyState.ts` — localStorage CRUD (`_v: 1` schema version guard)
- `src/hooks/useDailyGame.ts` — state machine (playing → submitted×N → completed); invalid words don't consume an attempt
- `DailyGame.tsx` — 3-try loop; after each try shows score + best possible (no word revealed); after final try reveals best word

#### ✅ M4 — Training mode (DONE)
- `src/hooks/useTraining.ts` — round lifecycle (playing → results → playing…)
- `Training.tsx` — colored word + score + top-3 collapsible + retry/next buttons

#### ✅ M5 — Solver page (DONE)
- `src/engine/solver.ts` — `solveTopN(draw, dict, n)`, sort: score desc, length asc on tie
- `Solver.tsx` — 4 letter-tile inputs, top-10 results table with full score breakdown

#### ✅ M6 — Full UI redesign (DONE)
- Extracted 10 reusable components (4 UI + 6 game) — see component table above
- All pages refactored to use shared components
- Deleted dead `src/App.css`

#### ✅ M7 — Backend foundation (DONE)
- `server/db.ts` + `server/index.ts` — Hono + better-sqlite3, `users` table
- `POST /api/users` — create user (2–20 chars, unique NOCASE)
- `GET /api/users/:name/exists` — availability check
- `src/services/api.ts` — `createUser()`, `usernameExists()`
- `src/hooks/useAuth.ts` — localStorage `auth_username`
- `src/components/UsernameModal.tsx` — blocks UI until username chosen
- Vite dev proxy: `/api` → `localhost:3001`
- Run with: `npm run server`

#### M8 — Leaderboard *(next)*
Depends on M7. Score submission on daily game completion. New `/leaderboard` route.

- `POST /api/scores` — submit daily score (requires `X-Username` header)
- `GET /api/leaderboard?sort=avg_score|game_count|account_age`
- SQLite table: `scores(id, user_id, date, score, best_possible, attempts)`
- `src/pages/Leaderboard.tsx` — ranked table
- Add `/leaderboard` to NavBar and router

### Dependency order

```
M1 ✅ → M2 ✅ (independent)
       → M3 ✅ → M4 ✅
       → M5 ✅ (engine) → M4 ✅ (UI)
       → M5 ✅ (UI)
       → M6 ✅ (after M2–M5)
            → M7 ✅
                → M8 (next)
```
