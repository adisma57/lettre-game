export type LetterRole = "unused" | "insert" | "unordered" | "ordered";

/** Tailwind class per role. Shared by ColoredWord and the rules colour legend. */
export const ROLE_CLASS: Record<LetterRole, string> = {
  ordered:   "text-primary",
  unordered: "text-primary/60",
  insert:    "text-fg-sub",
  unused:    "text-muted",
};
