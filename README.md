# Quadra

A French word game. A random draw of 4 letters is revealed; the player proposes a French word and earns points based on how well it incorporates the drawn letters.

## Scoring

```
score = (used letters × 3) + order bonus − insertions
```

| Component | Description |
|-----------|-------------|
| **Used letters** | Each draw letter found in the word, ×3 (duplicates in the draw count separately) |
| **Order bonus** | +3 if all draw letters appear in the word in the exact draw order |
| **Insertions** | −1 for each letter between the first and last draw-letter position that is not itself a draw letter |

### Example — draw `R A M E`, word `RAME`
4 letters used × 3 = 12, +3 order bonus, 0 insertions → **15 pts**

### Example — draw `B A N E`, word `BAIGNER`
4 letters used × 3 = 12, +3 order (B→A→N→E in order), −2 insertions (I, G) → **13 pts**

## Architecture

```
server/                  — Hono API (Node.js + SQLite)
  index.ts                 POST /api/users, GET /api/users/:name/exists
  db.ts                    better-sqlite3, users table

src/
  engine/                — pure TypeScript, zero React
    types.ts               Draw, ScoreResult, WordValidator
    draw.ts                weighted letter pool + daily seeded draw
    score.ts               normalizeWord, scoreWord
    DictionaryService.ts   Dictionary interface + Set implementation
    mainDictionary.ts      singleton loaded from an-array-of-french-words
    RoundService.ts        evaluateRound orchestrator
    solver.ts              solveTopN — full dictionary scan, sorted by score
    findBestWord.ts        thin wrapper around solveTopN(…, 1)
  components/
    ui/                    Button, Card, Badge
    game/                  ColoredWord, DrawDisplay, DrawInput, WordInput, ScoreCard, SolverResults
    layout/                Layout, NavBar
    UsernameModal.tsx      shown on first visit to pick a username
  hooks/
    useAuth.ts             reads/writes auth_username from localStorage
    useDailyGame.ts        daily game state machine
    useTraining.ts         training round lifecycle
  pages/                 — one file per route
    Home.tsx, DailyGame.tsx, Training.tsx, Solver.tsx, Rules.tsx
  services/
    api.ts                 all network calls (createUser, usernameExists)
    dailyState.ts          localStorage CRUD for daily game state
  content/
    rules.json             rules content (title, sections)
```

## Development

```bash
npm install

# Terminal 1 — frontend (localhost:5173)
npm run dev

# Terminal 2 — API server (localhost:3001, proxied via Vite)
npm run server

npm run test     # Vitest unit tests
npm run build    # type-check + production bundle
```

> The Vite dev server proxies `/api` to `localhost:3001`, so no CORS setup is needed in dev.
