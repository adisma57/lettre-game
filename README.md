# Jeu de Lettres — Prototype

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
src/
  engine/          — pure TypeScript, zero React
    types.ts           Draw, ScoreResult, WordValidator
    draw.ts            weighted letter pool
    score.ts           normalizeWord, scoreWord
    DictionaryService  Dictionary interface + Set implementation
    mainDictionary.ts  singleton loaded from an-array-of-french-words
    RoundService.ts    evaluateRound orchestrator
    findBestWord.ts    brute-force best-word scan
  App.tsx          — single React component
```

The engine and UI are fully decoupled. All React state lives in `App.tsx`; all game logic is pure functions in `engine/`.

After each submission the app reveals the best achievable word by scanning the entire French dictionary (~336k words) with the scoring engine.

## Development

```bash
npm install
npm run dev      # localhost dev server
npm run test     # unit tests (Vitest)
npm run build    # production build
```
