export const DEVICE_STORAGE_KEY = "quadra:device";

// Fallback used when localStorage is unreachable (iOS Safari private browsing,
// blocked storage). The day's game stays playable and recorded; only
// cross-session persistence is lost.
let memoryFallback: string | null = null;

export function getDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_STORAGE_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(DEVICE_STORAGE_KEY, id);
    return id;
  } catch {
    memoryFallback ??= crypto.randomUUID();
    return memoryFallback;
  }
}
