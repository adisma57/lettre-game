# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (Vite HMR)
npm run build     # Type-check (tsc) then bundle (vite)
npm run lint      # ESLint
npm run test      # Vitest in watch mode
npm run preview   # Serve the production build locally
```

Run a single test file:
```bash
npx vitest run src/engine/score.test.ts
```

## Architecture

This is a French word game prototype: the player proposes a word built around a random 4-letter draw and earns points based on how well the word incorporates the drawn letters.

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
| `draw.ts` | Weighted letter pool; `generateDrawWeighted(count)` |
| `score.ts` | `normalizeWord`, `scoreWord` — the full scoring pipeline |
| `DictionaryService.ts` | `Dictionary` interface (`has` + `words`); `createSetDictionary`; `createWordValidatorFromDictionary` |
| `mainDictionary.ts` | Singleton: loads `an-array-of-french-words`, exports `mainDictionary` and `mainValidator` |
| `RoundService.ts` | `createDraw()` and `evaluateRound(draw, rawWord, validator)` |
| `solver.ts` | `solveTopN(draw, dict, n): SolverResult[]` — full dictionary scan, sorted score desc then length asc |
| `findBestWord.ts` | Thin wrapper around `solveTopN(…, 1)` |

### UI layer

React Router v6 SPA. `App.tsx` is the root layout shell (NavBar + Outlet). All pages live in `src/pages/`.

`computeLetterRoles` (used by `ColoredWord`) assigns display roles (`ordered` / `unordered` / `insert` / `unused`) purely from `ScoreResult` fields — no engine logic is duplicated in the UI.

### Key design note — `Dictionary.words()`

`findBestWord.ts` iterates the full dictionary via `Dictionary.words(): Iterable<string>`. Do not bypass this by accessing the underlying `Set` directly.

### Normalization

All text comparison goes through `score.normalizeWord`: `toUpperCase()` + NFD decomposition + diacritic strip. Called on both the word and the draw in every scoring function.

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
- **Backend** (planned): Hono on Node + SQLite — username-only auth, leaderboard

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
- `src/content/rules.json` — 4 sections : objectif, score, code couleur, modes
- `src/pages/Rules.tsx` — renderer typé, 5 sous-composants (Formula, ScoreItems, Examples, ColorLegend, GameModes)

#### ✅ M3 — Daily draw engine + page (DONE)
- `getDailyDraw(date: Date): Draw` pure function in `engine/draw.ts`
  - Seeded RNG: LCG (`mulberry32`-style), seed = `YYYYMMDD` integer
  - Deterministic: same UTC date → same draw for all users
- `src/services/dailyState.ts` — localStorage CRUD for daily game state
- `src/hooks/useDailyGame.ts` — state machine (playing → submitted×N → completed)
- `DailyGame.tsx` — 3-try game loop:
  - After each try: show user score + best possible score (**no word revealed**)
  - After try 3 or score = bestPossible: reveal best word, show all tries
- Unit tests: determinism, UTC boundary, no seed collisions for ±50 years
- Files: `engine/draw.ts` (extend), `engine/draw.test.ts`, `services/dailyState.ts`, `hooks/useDailyGame.ts`, `pages/DailyGame.tsx`
- **Risk**: localStorage schema version field required — add `_v: 1` to detect stale state

#### Corrections applied (not milestones)

- **rules.json** — added `"valid-words"` section explaining that invalid/unknown words are rejected and do not consume an attempt.
- **useDailyGame.ts** — matching code fix: `submitWord` now returns early (without incrementing the attempt counter) when `evaluateRound` returns `isValid: false`.

#### ✅ M4 — Training mode (DONE)
- `src/hooks/useTraining.ts` — round lifecycle (playing → results → playing…)
- `Training.tsx` — submit word → show colored word + score + top 3 best words + "Prochain tirage" button
- No cumulative score; each round is standalone
- Files: `hooks/useTraining.ts`, `pages/Training.tsx`

#### ✅ M5 — Solver page (DONE)
- `src/engine/solver.ts` — `solveTopN(draw, dict, n): SolverResult[]`
  - Replaces `findBestWord.ts` (which becomes a one-liner delegating to `solveTopN`)
  - Sort: score desc, then word length asc (shortest first on tie)
  - Include all valid French words (even score = 0)
- `Solver.tsx` — 4 individual letter-tile inputs (one `<input maxLength={1}>` per cell, auto-focus-next), top-10 results table
- Unit tests: ranking order, tie-breaking, n limit
- Files: `engine/solver.ts`, `engine/solver.test.ts`, `pages/Solver.tsx`

#### M6 — Full UI redesign
Apply Tailwind tokens consistently across all pages. Extract reusable components:

| Component | Location | Used by |
|-----------|----------|---------|
| `Button` | `components/ui/` | everywhere |
| `Input` | `components/ui/` | word input, solver |
| `Badge` | `components/ui/` | score display |
| `Card` | `components/ui/` | score cards, results |
| `DrawDisplay` | `components/game/` | DailyGame, Training, Solver |
| `WordInput` | `components/game/` | DailyGame, Training (+ live validity indicator via debounced `dict.has()`) |
| `ColoredWord` | `components/game/` | score display (currently inline in old App.tsx logic) |
| `ScoreCard` | `components/game/` | DailyGame, Training |
| `SolverResults` | `components/game/` | Solver, Training (top 3) |

Remove `src/App.css` (dead Vite template file).

#### M7 — Backend foundation
- Hono server (`server/` at repo root, separate from `src/`)
- `POST /api/users` — create username (unique constraint)
- `GET /api/users/:name/exists` — availability check
- SQLite via `better-sqlite3`, table: `users(id, username, created_at)`
- `src/hooks/useAuth.ts` + `src/components/UsernameModal.tsx`
- All network calls go through `src/services/api.ts` (easy to swap mock → real)
- Auth token = username stored in `localStorage` under `auth_username`; sent as `X-Username` header
- Files: `server/`, `src/services/api.ts`, `src/hooks/useAuth.ts`, `src/components/UsernameModal.tsx`

#### M8 — Leaderboard *(future)*
Depends on M7. Score submission on daily game completion. New `/leaderboard` route. `GET /api/leaderboard?sort=avg_score|party_count|account_age`.

### Dependency order

```
M1 ✅ → M2 (independent)
       → M3 → M4
       → M5 (engine) → M4 (UI)
       → M5 (UI)
       → M6 (after M2–M5)
            → M7
                → M8
```

M2, M3 engine, and M5 engine are all parallelisable after M1.
