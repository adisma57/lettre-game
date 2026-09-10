# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Vite dev server (localhost:5173, HMR)
npm run server    # Hono API server (localhost:3001)
npm run build     # Type-check (tsc) then bundle (vite)
npm run lint      # ESLint — currently zero errors, keep it there
npm run test      # Vitest in watch mode
npm run preview   # Serve the production build locally
```

Run a single test file:
```bash
npx vitest run src/engine/score.test.ts
```

The Vite dev server proxies `/api/*` to `localhost:3001` — run both servers in dev.

Inspect the solver's output on 30 consecutive daily draws:
```bash
npx tsx scripts/check-solver.ts
```

## What Quadra is

A French daily word game. The player is given a random 4-letter draw and proposes
a word built around it, scoring on how well the word incorporates the drawn letters.

**One puzzle per day, three attempts, no account.** Opening the site drops you
straight into today's puzzle — there is no home page, no sign-up, no navigation bar.

### Scoring formula

`score = usedLetters × 3  +  (orderBonus ? 3 : 0)  −  insertions`

- **usedLetters** — draw letters found in the word (duplicates count separately)
- **orderBonus** — +3 if the skeleton matches the draw order exactly
- **insertions** — non-skeleton letters strictly between the first and last skeleton position

The **skeleton** is the greedy left-to-right subsequence of word positions that
consume all available draw letters.

## Product rules

These are decisions, not implementation details. Changing them changes the game.

- **A day starts at midnight Europe/Paris** (`src/engine/dayKey.ts`), not UTC. A UTC
  rollover falls at 01:00–02:00 local, which would split a French player's evening
  across two puzzles.
- **Finishing a game maintains the streak, whatever the score** — even zero. The
  streak measures the habit, not the performance.
- **One missed day is absorbed by a "joker"**, available once per rolling 7-day
  window. Two or more missed days reset the streak to 1.
- **Replaying the same day, or a clock that moved backwards, leaves the streak
  untouched** — never reset. We don't punish players for something they didn't do.
- **"Voir les réponses"** ends the game. It keeps the streak, but the game only
  counts toward the percentile if at least one attempt was made. That rule needs no
  flag: with one row per attempt, a reveal with no attempt simply writes no row.
- **The percentile is hidden below 20 distinct players that day.** A percentile over
  four games is noise; the player count is shown instead.
- **The share text must leak nothing.** Four squares, one per *drawn letter* — never
  one per letter of the found word, which would reveal its length.

## Architecture

### Routes

```
/               → DailyGame   (the day's puzzle, opens directly)
/entrainement   → Training    (unlimited random rounds)
```

Rules and stats are **modals** over the game screen, not pages. The only link to
`/entrainement` is on the end-of-game screen.

### Engine layer (`src/engine/`)

Pure TypeScript, zero React. Imported by both client and server.

| File | Responsibility |
|------|----------------|
| `types.ts` | `Draw`, `WordValidator`, `ScoreResult`, `ScorePart` |
| `dayKey.ts` | `getTodayKey()` (Europe/Paris), `isDayKey`, `daysBetween`, `puzzleNumber` |
| `draw.ts` | Weighted letter pool; `generateDrawWeighted(count)`; `getDailyDraw(dayKey)` |
| `score.ts` | `normalizeWord`, `scoreWord` — the full scoring pipeline |
| `DictionaryService.ts` | `Dictionary` interface (`has` + `words`); `createSetDictionary` |
| `mainDictionary.ts` | **Lazy**: `loadMainDictionary()`, `mainValidator`, `isDictionaryReady` |
| `RoundService.ts` | `createDraw()` and `evaluateRound(draw, rawWord, validator)` |
| `solver.ts` | `solveTopN(draw, dict, n)` — full scan, score desc then length asc |
| `findBestWord.ts` | Thin wrapper around `solveTopN(…, 1)` |

`daysBetween` **throws** on a malformed day key. Callers holding untrusted data
(localStorage, URL params) must filter with `isDayKey` first — `loadStats` does.

### Services (`src/services/`)

| File | Responsibility |
|------|----------------|
| `deviceId.ts` | Anonymous UUID in `localStorage`, with an in-memory fallback |
| `stats.ts` | Pure `applyResult` (streak, joker, aggregates) + `loadStats`/`saveStats` |
| `share.ts` | Pure `buildShareText` / `drawSquares` |
| `dailyState.ts` | Today's game state in `localStorage` (`_v: 2`) |
| `pending.ts` | Attempts that failed to reach the server, replayed on next load |
| `api.ts` | `submitAttempt`, `fetchFinish`, `fetchTrainingRound`, retry ×3 with backoff |

`src/config.ts` holds `SITE_URL` and `EPOCH` — the only deployment constants.

### Components

| Component | Location |
|-----------|----------|
| `Button`, `Card`, `Badge`, `Modal`, `LogoMark` | `components/ui/` |
| `DrawDisplay`, `WordInput`, `ColoredWord`, `letterRoles`, `ScoreCard`, `SolverResults`, `ShareButton` | `components/game/` |
| `RulesModal`, `StatsModal` | `components/modals/` |
| `Layout` | `components/layout/` |

`letterRoles.ts` holds the role → Tailwind-class map, shared by `ColoredWord` and
the rules colour legend. It lives outside the component file so fast refresh works.

### Backend (`server/`)

Hono on **Vercel + Neon serverless Postgres**, ESM. Entry point `api/[[...route]].ts`.
`server/repo.ts` has two backends: Neon when `DATABASE_URL` is set, an in-memory
store otherwise (local dev and tests).

| File | Responsibility |
|------|----------------|
| `app.ts` | Routes, CORS, `withDb` middleware, error handler |
| `repo.ts` | Schema, `insertPlay`, `getDailyPercentile`, `getDailyPuzzle`, `upsertDailyPuzzle` |
| `daily.ts` | `resolveBestPossible`, `resolveAnswers`, per-instance solver cache |
| `dictionary.ts` | The solver's dictionary (stricter than the client's) |

| Route | Body | Response |
|---|---|---|
| `POST /api/daily/:date/attempt` | `{ deviceId, attemptNum, score }` | `{ bestPossible }` |
| `POST /api/daily/:date/finish` | `{ score }` | `{ bestWord, topWords, percentile, playersToday }` |
| `GET /api/training` | — | `{ draw, top3 }` |
| `GET /api/health` | — | `{ ok, t }` |

`attempt` returns the denominator **without the answer**. `finish` returns the
answer, **never writes**, and is re-called on every reopen of the end screen so the
percentile refreshes through the day. `GET /api/training` returns a draw and its
solution *together*, so the client can never request the solution to a draw of its
choosing.

```sql
plays (id, device_id, date, attempt_num, score, created_at,
       UNIQUE (device_id, date, attempt_num))
daily_puzzles (date PK, best_possible, best_word)
users_archive, scores_archive   -- renamed, not dropped: a device_id cannot be
                                -- reconstructed from a username
```

## Dictionaries — two of them, on purpose

Source: **LEFFF 3.4** (INRIA/Alexina) plus a **Dicollecte/Hunspell** supplement for
modern vocabulary. Generated by `scripts/build-dictionary.ts`, which already
excludes proper nouns (`pos === "np"`).

- **Validation (client)** — deliberately generous. Rejecting a real word a player
  proposed is the worst failure this game can have. ~422 000 forms, loaded with a
  dynamic `import()` so it stays off the critical path (main chunk 319 KB, the
  dictionary in its own chunk).
- **Solver (server)** — stricter: letters only, no hyphenated or apostrophed forms.
  It sets the **denominator of every player's score**, so it must only contain words
  a player could plausibly find.

⚠️ **Known issue.** The solver dictionary still returns words no ordinary player can
find — `DIGAMMA`, `GAGAKU`, `SYNAPTOGENESE`, and *passé simple* forms like
`FENDIMES`. Running `scripts/check-solver.ts` shows roughly a dozen of thirty. This
distorts every player's score, the accuracy stat and the percentile. It needs
frequency curation (Lexique 383) or a filter on rare tenses before launch.

## Key design notes

- **Normalization** — all text comparison goes through `score.normalizeWord`:
  `toUpperCase()` + NFD decomposition + diacritic strip.
- **Daily draw** — `getDailyDraw(dayKey)` uses a seeded LCG (`mulberry32`-style),
  seed = `YYYYMMDD`. Same Paris day → same draw for everyone. Client and server
  compute it independently and must agree.
- **`localStorage` is not reliable.** Commit `2adf39b` documented iOS Safari
  silently failing it in private browsing and under ITP. Every access is wrapped;
  `deviceId` falls back to memory; `StatsModal` distinguishes "no games yet" from
  "storage blocked". Installing the PWA is what exempts a site from ITP's 7-day
  purge — that is what protects players' streaks, not a nice-to-have.
- **Double-counting guards** — a game must be counted once. `dailyState.statsApplied`
  survives reloads; a `useRef` in `useDailyGame` covers concurrent callers within one
  page load. Both are needed.
- **`react-hooks/set-state-in-effect`** is enforced. A synchronous `setState` in an
  effect body will fail lint; put it in the `useState` initialiser or an event
  handler instead.

## Design tokens (Tailwind v4 — `src/index.css`)

| Token | Value | Utility |
|-------|-------|---------|
| `--color-canvas` | `#0c0b09` | `bg-canvas` |
| `--color-surface` | `#141210` | `bg-surface` |
| `--color-elevated` | `#1d1a16` | `bg-elevated` |
| `--color-line` | `#2c2620` | `border-line` |
| `--color-fg` | `#f2ede6` | `text-fg` |
| `--color-fg-sub` | `#c0b8ac` | `text-fg-sub` |
| `--color-muted` | `#6a6050` | `text-muted` |
| `--color-primary` | `#f97316` | `text-primary` / `bg-primary` |
| `--color-primary-dim` | `#c45810` | `text-primary-dim` |
| `--color-success` | `#22c55e` | `text-success` |
| `--color-error` | `#ef4444` | `text-error` |

Fonts: `--font-display` (Syne), `--font-mono` (JetBrains Mono).

## Stack decisions (made, do not revisit)

- **Router**: React Router (`createBrowserRouter` + `RouterProvider`)
- **CSS**: Tailwind v4 via `@tailwindcss/vite` — no config file, tokens in `@theme`
- **State**: `useState` + `useReducer` per page; no global store
- **Backend**: Hono on Vercel + Neon Postgres, no accounts
- **Hosting**: Vercel. Domain `quadra-mots.fr`
- **PWA**: `vite-plugin-pwa`, `registerType: "autoUpdate"`
- **Analytics**: Vercel Analytics — no cookie, so no consent banner
- **No ads** for now: they would reintroduce the consent banner that removing
  accounts just eliminated, for negligible revenue at current volume.

## Testing

Vitest, `environment: "node"`, covering `src/**/*.test.ts` and `server/**/*.test.ts`.
A test needing `localStorage` opts into jsdom per file with `// @vitest-environment jsdom`
on line 1.

There is **no React testing library** — hooks and components are not unit-tested.
Verification for those relies on `tsc`, the pure-module tests, and playing the game
manually. Don't add a hook-level test framework casually; if you do, it's a decision
to make deliberately, not a side effect of one task.
