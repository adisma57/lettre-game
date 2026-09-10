import { EPOCH } from "../config";

const TIME_ZONE = "Europe/Paris";

// "en-CA" natively produces the YYYY-MM-DD format, which avoids
// having to recompose the string from the individual parts.
const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Current day in Paris, formatted as "YYYY-MM-DD". */
export function getTodayKey(now: Date = new Date()): string {
  return dayFormatter.format(now);
}

/**
 * True when `value` is a well-formed "YYYY-MM-DD" day key denoting a real
 * calendar date. Rejects non-strings, malformed shapes (missing padding,
 * extra content), and dates the ISO parser would silently normalise
 * (e.g. "2026-02-30" rolling over to March 2nd) by round-tripping the
 * parsed components back against the input.
 */
export function isDayKey(value: unknown): value is string {
  if (typeof value !== "string" || !DAY_KEY_PATTERN.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/**
 * Number of calendar days from `a` to `b`, negative if `b` precedes `a`.
 * Keys are interpreted at UTC midnight, so the arithmetic is insensitive
 * to daylight-saving changes.
 *
 * Throws if either argument is not a valid day key — these are programmer
 * errors. Callers holding untrusted data (e.g. localStorage) are expected
 * to filter with `isDayKey` first.
 */
export function daysBetween(a: string, b: string): number {
  if (!isDayKey(a)) throw new Error(`Clé de jour invalide : "${a}"`);
  if (!isDayKey(b)) throw new Error(`Clé de jour invalide : "${b}"`);

  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/** Puzzle number shown in the share text. EPOCH day is #1. */
export function puzzleNumber(dayKey: string): number {
  return daysBetween(EPOCH, dayKey) + 1;
}
