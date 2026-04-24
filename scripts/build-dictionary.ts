/**
 * One-time script to build src/engine/data/lefff-words.json from the LEFFF lexicon,
 * and src/engine/data/supplement-words.json from Dicollecte/Hunspell fr_FR.
 *
 * Sources:
 *   - LEFFF 3.4 (Lexique des Formes Fléchies du Français) — INRIA/Alexina, LGPL-LR
 *     https://github.com/ClaudeCoulombe/FrenchLefffLemmatizer
 *     ~400k inflected forms (conjugaisons, pluriels, féminins…)
 *
 *   - Dicollecte/Hunspell fr_FR — MPL-2.0 (npm: dictionary-fr)
 *     ~84k lemmes de base, maintenance active, meilleure couverture des emprunts
 *     modernes (krav-maga, hashtag, snowboard, taekwondo…)
 *     Le supplément = lemmes Dicollecte absents de LEFFF, noms propres exclus.
 *
 * The two files are merged at runtime in src/engine/mainDictionary.ts.
 *
 * Steps:
 *   1. curl -o /tmp/lefff-3.4.mlex https://raw.githubusercontent.com/ClaudeCoulombe/FrenchLefffLemmatizer/master/french_lefff_lemmatizer/data/lefff-3.4.mlex
 *      curl -o /tmp/lefff-3.4-addition.mlex https://raw.githubusercontent.com/ClaudeCoulombe/FrenchLefffLemmatizer/master/french_lefff_lemmatizer/data/lefff-3.4-addition.mlex
 *   2. npx tsx scripts/build-dictionary.ts
 *
 * Requires dictionary-fr in devDependencies (npm install).
 */

import { mkdirSync, createReadStream, readFileSync } from "fs";
import { writeFile } from "fs/promises";
import { createInterface } from "readline";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "../src/engine/data/lefff-words.json");
const SUPPLEMENT_PATH = path.join(__dirname, "../src/engine/data/supplement-words.json");
const DICOLLECTE_DIC = path.join(__dirname, "../node_modules/dictionary-fr/index.dic");

// These files are downloaded by curl before running this script:
//   curl -o /tmp/lefff-3.4.mlex https://raw.githubusercontent.com/ClaudeCoulombe/FrenchLefffLemmatizer/master/french_lefff_lemmatizer/data/lefff-3.4.mlex
//   curl -o /tmp/lefff-3.4-addition.mlex https://raw.githubusercontent.com/ClaudeCoulombe/FrenchLefffLemmatizer/master/french_lefff_lemmatizer/data/lefff-3.4-addition.mlex
const LOCAL_FILES = [
  "/tmp/lefff-3.4.mlex",
  "/tmp/lefff-3.4-addition.mlex",
];

// Keep only tokens that look like actual French words:
// - At least 2 characters
// - Only letters (including accented), hyphens, apostrophes
// - No HTML entities, numbers, pure punctuation
const WORD_RE = /^[a-zA-ZÀ-ÖØ-öø-ÿœŒæÆ][a-zA-ZÀ-ÖØ-öø-ÿœŒæÆ'-]{1,}$/;

function readLines(filePath: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const lines: string[] = [];
    const rl = createInterface({
      input: createReadStream(filePath, { encoding: "utf-8" }),
      crlfDelay: Infinity,
    });
    rl.on("line", (line) => lines.push(line));
    rl.on("close", () => resolve(lines));
    rl.on("error", reject);
  });
}

async function main() {
  const wordSet = new Set<string>();

  for (const filePath of LOCAL_FILES) {
    console.log(`Reading ${filePath} ...`);
    const lines = await readLines(filePath);
    console.log(`  → ${lines.length} lines`);

    for (const line of lines) {
      const parts = line.split("\t");
      const form = parts[0].trim().toLowerCase();
      const pos = parts[1]?.trim();
      // Skip proper nouns (np = nom propre in LEFFF)
      if (pos === "np") continue;
      if (form && WORD_RE.test(form) && form.length >= 2) {
        wordSet.add(form);
      }
    }
  }

  const words = Array.from(wordSet).sort();
  console.log(`\nTotal unique words kept: ${words.length}`);

  // Spot-check
  const checks = ["cervidé", "cervidés", "mange", "mangeait", "parabellum", "logiciel"];
  for (const w of checks) {
    console.log(`  "${w}" present: ${wordSet.has(w)}`);
  }

  mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(words), "utf-8");
  console.log(`\nWritten to ${OUT_PATH}`);

  // Build supplement: Dicollecte lemmes absent du LEFFF, noms propres exclus
  console.log(`\nBuilding supplement from ${DICOLLECTE_DIC} ...`);
  const dicRaw = readFileSync(DICOLLECTE_DIC, "utf-8");
  const dicLines = dicRaw.split("\n").slice(1); // skip entry count
  const supplementSet = new Set<string>();
  for (const line of dicLines) {
    const rawForm = line.split("/")[0].trim();
    if (/^[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŒ]/.test(rawForm)) continue; // noms propres
    const form = rawForm.toLowerCase();
    if (form.length < 2) continue;
    if (!WORD_RE.test(form)) continue;
    if (!wordSet.has(form)) supplementSet.add(form);
  }
  const supplement = Array.from(supplementSet).sort();
  console.log(`Supplement size: ${supplement.length}`);
  const supplementChecks = ["krav-maga", "hashtag", "snowboard", "taekwondo", "selfie"];
  for (const w of supplementChecks) {
    console.log(`  "${w}" in supplement: ${supplementSet.has(w)} / in lefff: ${wordSet.has(w)}`);
  }
  await writeFile(SUPPLEMENT_PATH, JSON.stringify(supplement), "utf-8");
  console.log(`Written to ${SUPPLEMENT_PATH}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
