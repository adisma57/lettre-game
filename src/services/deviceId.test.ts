// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { getDeviceId, DEVICE_STORAGE_KEY } from "./deviceId";

describe("getDeviceId", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("crée un UUID au premier appel et le persiste", () => {
    const id = getDeviceId();
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(localStorage.getItem(DEVICE_STORAGE_KEY)).toBe(id);
  });

  it("renvoie le même identifiant aux appels suivants", () => {
    expect(getDeviceId()).toBe(getDeviceId());
  });

  it("réutilise une valeur déjà stockée", () => {
    localStorage.setItem(DEVICE_STORAGE_KEY, "valeur-existante");
    expect(getDeviceId()).toBe("valeur-existante");
  });

  it("renvoie un identifiant de repli si localStorage lève", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    const fresh = await import("./deviceId");
    const id = fresh.getDeviceId();
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    // Le repli doit provenir de la mémoire, pas de localStorage : la clé ne doit
    // jamais avoir été écrite avec succès (getItem lève systématiquement).
    expect(() => localStorage.getItem(DEVICE_STORAGE_KEY)).toThrow();
    expect(fresh.getDeviceId()).toBe(id);
  });
});
