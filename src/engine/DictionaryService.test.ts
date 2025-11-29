// src/engine/DictionaryService.test.ts
import { describe, it, expect } from "vitest";
import {
  createSetDictionary,
  createWordValidatorFromDictionary,
  type Dictionary,
} from "./DictionaryService";

describe("DictionaryService – createSetDictionary / has", () => {
  it("reconnaît les mots en ignorant casse et accents", () => {
    const dict: Dictionary = createSetDictionary(["rame", "BAIGNER", "été"]);

    // casse
    expect(dict.has("rame")).toBe(true);
    expect(dict.has("RAME")).toBe(true);

    // accents dans le mot testé
    expect(dict.has("Été")).toBe(true);
    expect(dict.has("ETE")).toBe(true);

    // mot absent
    expect(dict.has("RAM")).toBe(false);
    expect(dict.has("BANANE")).toBe(false);
  });

  it("ignore les entrées vides ou blanches à la création", () => {
    const dict = createSetDictionary(["  ", "", "RAME"]);

    expect(dict.has("RAME")).toBe(true);
    expect(dict.has("")).toBe(false);
    expect(dict.has("   ")).toBe(false);
  });
});

describe("DictionaryService – createWordValidatorFromDictionary", () => {
  it("produit un WordValidator compatible avec RoundService", () => {
    const dict = createSetDictionary(["rame", "baigner"]);
    const validator = createWordValidatorFromDictionary(dict);

    // RoundService lui passe déjà un mot normalisé, mais on teste les deux cas
    expect(validator("RAME")).toBe(true);
    expect(validator("BAIGNER")).toBe(true);

    // mot absent
    expect(validator("BANANE")).toBe(false);
  });
});
