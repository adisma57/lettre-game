// src/engine/RoundService.test.ts
import { describe, it, expect } from "vitest";
import type { Draw } from "./types";
import {
  evaluateRound,
  createDraw,
  type WordValidator,
  type RoundResult,
} from "./RoundService";

// Validators de test
const alwaysValid: WordValidator = () => true;
const alwaysInvalid: WordValidator = () => false;
const simpleDict = (allowed: string[]): WordValidator => {
  const set = new Set(allowed.map((w) => w.toUpperCase()));
  return (w) => set.has(w);
};

describe("RoundService – createDraw", () => {
  it("génère un tirage de 4 lettres majuscules", () => {
    const draw: Draw = createDraw();
    expect(draw).toHaveLength(4);
    for (const letter of draw) {
      expect(letter).toMatch(/^[A-Z]$/);
    }
  });
});

describe("RoundService – evaluateRound (cas invalides)", () => {
  it("marque la manche comme invalide si le mot est vide", () => {
    const draw: Draw = ["R", "A", "M", "E"];
    const result = evaluateRound(draw, "", alwaysValid);

    expect(result.isValid).toBe(false);
    expect(result.invalidReason).toBe("empty");
    expect(result.score).toBeNull();
    expect(result.total).toBe(0);
  });

  it("marque la manche comme invalide si le mot n'est pas dans le dictionnaire", () => {
    const draw: Draw = ["R", "A", "M", "E"];
    const result = evaluateRound(draw, "RAME", alwaysInvalid);

    expect(result.isValid).toBe(false);
    expect(result.invalidReason).toBe("not_in_dictionary");
    expect(result.score).toBeNull();
    expect(result.total).toBe(0);
  });
});

describe("RoundService – evaluateRound (cas valides simples)", () => {
  it("retourne un score cohérent pour un mot valide sans dictionnaire restrictif", () => {
    const draw: Draw = ["R", "A", "M", "E"];
    const result = evaluateRound(draw, "rame", alwaysValid);

    expect(result.isValid).toBe(true);
    expect(result.normalizedWord).toBe("RAME");
    expect(result.score).not.toBeNull();
    expect(result.score?.total).toBe(15); // exemple de la spec
    expect(result.total).toBe(15);
  });

  it("utilise un dictionnaire fourni pour valider le mot", () => {
    const draw: Draw = ["B", "A", "N", "E"];
    const dict = simpleDict(["BAIGNER"]); // seul BAIGNER est autorisé

    const ok = evaluateRound(draw, "BAIGNER", dict);
    const ko = evaluateRound(draw, "BANANE", dict);

    expect(ok.isValid).toBe(true);
    expect(ok.score).not.toBeNull();
    expect(ok.total).toBe(13); // exemple de la spec

    expect(ko.isValid).toBe(false);
    expect(ko.invalidReason).toBe("not_in_dictionary");
    expect(ko.total).toBe(0);
  });

  it("peut retourner un mot valide dictionnaire mais avec score 0 (aucune lettre du tirage utilisée)", () => {
    const draw: Draw = ["R", "A", "M", "E"];
    const dict = simpleDict(["OUF"]);

    const result: RoundResult = evaluateRound(draw, "OUF", dict);

    expect(result.isValid).toBe(true); // mot FR valide
    expect(result.score).not.toBeNull();
    expect(result.score?.total).toBe(0); // moteur: aucune lettre du tirage → score 0
    expect(result.total).toBe(0);
  });
});

describe("RoundService – intégration scoring + dictionnaire", () => {
  it("gère un mot avec accents via le moteur", () => {
    const draw: Draw = ["E", "T", "A", "I"];
    const dict = simpleDict(["ETE"]); // on suppose le dictionnaire stocke la forme normalisée

    const result = evaluateRound(draw, "été", dict);

    expect(result.isValid).toBe(true);
    expect(result.normalizedWord).toBe("ETE");
    expect(result.score).not.toBeNull();
    expect(result.score?.usedLetters.sort()).toEqual(["E", "T"].sort());
    expect(result.total).toBe(6); // 2 lettres distinctes * 3
  });
});
