import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
import wordListPath from "word-list";
// Pin the package in package-lock.json and commit the generated list.
const words = [...new Set(readFileSync(wordListPath, "utf8").split(/\r?\n/)
  .filter(word => /^[a-z]{2,}$/.test(word)))].sort();
writeFileSync(new URL("../src/engine/data/english-words.json", import.meta.url), JSON.stringify(words));
copyFileSync(new URL("../node_modules/word-list/license", import.meta.url),
  new URL("../src/engine/data/english-words.LICENSE", import.meta.url));
console.log(`Generated ${words.length} English words`);
