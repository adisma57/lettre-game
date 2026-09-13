import { describe, it, expect } from "vitest";
import { solverDictionary } from "./dictionary.js";

// Combined raw form count (LEFFF + supplement), before filtering.
const RAW_FORM_COUNT = 400_944 + 21_580;

describe("solverDictionary", () => {
  it("contient des mots ordinaires", () => {
    expect(solverDictionary.has("maison")).toBe(true);
    expect(solverDictionary.has("bonjour")).toBe(true);
    expect(solverDictionary.has("table")).toBe(true);
  });

  it("ne contient aucune forme avec trait d'union ou apostrophe", () => {
    for (const word of solverDictionary.words()) {
      expect(word).not.toContain("-");
      expect(word).not.toContain("'");
    }
  });

  it("est notablement plus petit que le corpus brut combiné", () => {
    const size = Array.from(solverDictionary.words()).length;

    console.log(`solverDictionary size: ${size} (raw combined: ${RAW_FORM_COUNT})`);
    expect(size).toBeLessThan(RAW_FORM_COUNT);
    // The hyphen/apostrophe filter alone removes several thousand forms.
    expect(RAW_FORM_COUNT - size).toBeGreaterThan(1000);
  });
});
