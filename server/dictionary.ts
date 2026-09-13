// Same source files as src/engine/mainDictionary.ts (LEFFF + Dicollecte supplement).
// Import attributes also support native Node ESM in the Vercel function.
import lefff from "../src/engine/data/lefff-words.json" with { type: "json" };
import supplement from "../src/engine/data/supplement-words.json" with { type: "json" };
import english from "../src/engine/data/english-words.json" with { type: "json" };
import { IS_ENGLISH } from "../src/language.js";
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
  (IS_ENGLISH ? english : [...(lefff as string[]), ...(supplement as string[])]).filter((w) => SOLVER_FORM.test(w)),
);
