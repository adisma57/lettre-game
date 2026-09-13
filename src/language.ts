/** A deployment has one game language; French remains the default. */
export type GameLanguage = "fr" | "en";
const buildLanguage = (import.meta as ImportMeta & { env?: { VITE_GAME_LANGUAGE?: string } }).env?.VITE_GAME_LANGUAGE;
const runtimeLanguage = (globalThis as { process?: { env?: { GAME_LANGUAGE?: string } } }).process?.env?.GAME_LANGUAGE;
const configured = buildLanguage ?? runtimeLanguage ?? "fr";
if (configured !== "fr" && configured !== "en") throw new Error("Unsupported GAME_LANGUAGE");
export const GAME_LANGUAGE: GameLanguage = configured;
export const IS_ENGLISH = GAME_LANGUAGE === "en";
export const DATE_LOCALE = IS_ENGLISH ? "en-GB" : "fr-FR";
export function t(fr: string, en: string): string { return IS_ENGLISH ? en : fr; }
export function storageKey(fr: string): string { return IS_ENGLISH ? `${fr}:en` : fr; }
