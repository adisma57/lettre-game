/**
 * One-time script to build src/engine/data/lefff-words.json from the LEFFF lexicon.
 *
 * Sources:
 *   - LEFFF 3.4 (Lexique des Formes Fléchies du Français) — INRIA/Alexina
 *     https://github.com/ClaudeCoulombe/FrenchLefffLemmatizer
 *
 * Format of each line: form\tPOS\tlemma\tfeatures
 * We extract column 0 (form) and keep only real French words.
 *
 * Run: npx tsx scripts/build-dictionary.ts
 */

import { mkdirSync, createReadStream } from "fs";
import { writeFile } from "fs/promises";
import { createInterface } from "readline";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "../src/engine/data/lefff-words.json");

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
      const form = line.split("\t")[0].trim().toLowerCase();
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
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
