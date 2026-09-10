import { EPOCH } from "../config";

const TIME_ZONE = "Europe/Paris";

// "en-CA" produit nativement le format YYYY-MM-DD, ce qui évite
// de recomposer la chaîne à partir des parties.
const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Jour courant à Paris, au format "YYYY-MM-DD". */
export function getTodayKey(now: Date = new Date()): string {
  return dayFormatter.format(now);
}

/**
 * Nombre de jours calendaires de `a` vers `b`, négatif si `b` précède `a`.
 * Les clés sont interprétées à minuit UTC : l'arithmétique est donc
 * insensible aux changements d'heure.
 */
export function daysBetween(a: string, b: string): number {
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/** Numéro de partie affiché dans le texte de partage. Le jour de l'EPOCH vaut 1. */
export function puzzleNumber(dayKey: string): number {
  return daysBetween(EPOCH, dayKey) + 1;
}
