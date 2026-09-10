// Same source files as src/engine/mainDictionary.ts (LEFFF + Dicollecte supplement).
// Plain default JSON imports are used here for consistency with mainDictionary.ts —
// verified to type-check under `tsc -b` (tsconfig.node.json resolves
// resolveJsonModule: true via "moduleResolution": "bundler") and to run correctly
// under both `tsx` and Vitest, which is the only way these files are ever loaded
// (the server is never emitted to plain JS; `npm run server` and tests both go
// through tsx/Vitest's transform, never native Node ESM on the raw .ts files).
import lefff from "../src/engine/data/lefff-words.json";
import supplement from "../src/engine/data/supplement-words.json";
import { createSetDictionary, type Dictionary } from "../src/engine/DictionaryService.js";

/**
 * Forms the solver may return: letters only. Proper nouns are already excluded
 * at generation time; this additionally drops hyphenated and apostrophed forms,
 * which in the LEFFF are largely compound place names.
 */
const SOLVER_FORM = /^[a-zA-ZÀ-ÖØ-öø-ÿœŒæÆ]{2,}$/;

/**
 * The solver's dictionary is stricter than the client's validation dictionary.
 * It sets the denominator of every player's score, so it must only contain
 * words a normal French speaker could plausibly find.
 * Built once per serverless instance.
 */
export const solverDictionary: Dictionary = createSetDictionary(
  [...(lefff as string[]), ...(supplement as string[])].filter((w) => SOLVER_FORM.test(w)),
);
