import { storageKey } from "../language";
export const PENDING_STORAGE_KEY = storageKey("quadra:pending");

export type PendingAttempt = { date: string; attemptNum: number; score: number };

export function loadPending(): PendingAttempt[] {
  try {
    const raw = localStorage.getItem(PENDING_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as PendingAttempt[]) : [];
  } catch {
    return [];
  }
}

export function savePending(queue: PendingAttempt[]): void {
  try {
    localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Storage unavailable: the queue is lost, the game stays playable.
  }
}

export function enqueuePending(item: PendingAttempt): void {
  savePending([...loadPending(), item]);
}

export function clearPending(): void {
  savePending([]);
}
