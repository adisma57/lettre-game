import { describe, it, expect } from "vitest";
import { buildShareText } from "./share";

describe("buildShareText", () => {
  const base = {
    puzzleNumber: 142,
    score: 21,
    bestPossible: 24,
    draw: ["Q", "R", "T", "Z"],
    currentStreak: 7,
    percentile: 0.68,
  };

  it("format complet", () => {
    expect(buildShareText(base)).toBe(
      "Quadra #142 — 21/24\nLettres du jour : Q · R · T · Z\n" +
      "Série 7 🔥 · mieux que 68 % des joueurs\n" +
      "\nTu fais mieux avec les mêmes quatre lettres ?\n" +
      "#QuadraMots #JeuxDeLettres #JeuxDeMots #WordGames #DefiDuJour\n" +
      "https://quadra-mots.fr",
    );
  });

  it("conserve les lettres en double et leur ordre", () => {
    expect(buildShareText({ ...base, draw: ["A", "A", "B", "C"] })).toContain("Lettres du jour : A · A · B · C");
  });

  it("sans percentile → la ligne se limite à la série", () => {
    const text = buildShareText({ ...base, percentile: null });
    expect(text).toContain("Série 7 🔥\n");
    expect(text).not.toContain("mieux que");
  });

  it("sans dénominateur → score en points bruts", () => {
    expect(buildShareText({ ...base, bestPossible: null })).toContain("21 pts");
  });

  it("arrondit le percentile à l'entier", () => {
    expect(buildShareText({ ...base, percentile: 0.684 })).toContain("68 %");
  });

  it("se termine toujours par l'URL du site", () => {
    expect(buildShareText(base).endsWith("https://quadra-mots.fr")).toBe(true);
  });

  it("hors ligne : sans dénominateur ni percentile", () => {
    expect(buildShareText({ ...base, bestPossible: null, percentile: null })).toBe(
      "Quadra #142 — 21 pts\nLettres du jour : Q · R · T · Z\n" +
      "Série 7 🔥\n" +
      "\nTu fais mieux avec les mêmes quatre lettres ?\n" +
      "#QuadraMots #JeuxDeLettres #JeuxDeMots #WordGames #DefiDuJour\n" +
      "https://quadra-mots.fr",
    );
  });

  it("score nul : rien trouvé", () => {
    expect(buildShareText({ ...base, score: 0 })).toBe(
      "Quadra #142 — 0/24\nLettres du jour : Q · R · T · Z\n" +
      "Série 7 🔥 · mieux que 68 % des joueurs\n" +
      "\nTu fais mieux avec les mêmes quatre lettres ?\n" +
      "#QuadraMots #JeuxDeLettres #JeuxDeMots #WordGames #DefiDuJour\n" +
      "https://quadra-mots.fr",
    );
  });

  it("ne fuite pas le mot trouvé : aucune suite de 3+ lettres majuscules A-Z", () => {
    // The found word is always normalized to uppercase (see engine/types.ts),
    // so a leaked word would show up as a run of 3+ consecutive A-Z letters.
    // The template itself (French copy + URL) is lowercase/mixed-case, so
    // this guard only trips on an actual leak, not on the fixed wording.
    const text = buildShareText(base);
    expect(text).not.toMatch(/[A-Z]{3,}/);
  });
});
