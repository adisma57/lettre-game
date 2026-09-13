// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  loadPending,
  savePending,
  enqueuePending,
  clearPending,
  PENDING_STORAGE_KEY,
  type PendingAttempt,
} from "./pending";

describe("pending", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renvoie un tableau vide quand rien n'est stocké", () => {
    expect(loadPending()).toEqual([]);
  });

  it("renvoie un tableau vide si le JSON stocké est illisible", () => {
    localStorage.setItem(PENDING_STORAGE_KEY, "{not valid json");
    expect(loadPending()).toEqual([]);
  });

  it("renvoie un tableau vide si la valeur stockée n'est pas un tableau", () => {
    localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify({ foo: "bar" }));
    expect(loadPending()).toEqual([]);
  });

  it("enqueue puis load fait un aller-retour fidèle", () => {
    const item: PendingAttempt = { date: "2026-09-10", attemptNum: 1, score: 12 };
    enqueuePending(item);
    expect(loadPending()).toEqual([item]);

    const second: PendingAttempt = { date: "2026-09-10", attemptNum: 2, score: 9 };
    enqueuePending(second);
    expect(loadPending()).toEqual([item, second]);
  });

  it("clear vide la file", () => {
    enqueuePending({ date: "2026-09-10", attemptNum: 1, score: 12 });
    clearPending();
    expect(loadPending()).toEqual([]);
  });

  it("savePending ne lève pas si le stockage est indisponible", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(() => savePending([{ date: "2026-09-10", attemptNum: 1, score: 1 }])).not.toThrow();
    vi.restoreAllMocks();
  });
});
