import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

beforeAll(() => {
  vi.stubEnv("VITE_GAME_LANGUAGE", "en");
  vi.stubEnv("GAME_LANGUAGE", "en");
  vi.stubEnv("VITE_SITE_URL", "https://english.example");
  vi.stubEnv("EN_DATABASE_URL", "");
  vi.resetModules();
});
afterAll(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe("English deployment", () => {
  it("uses separate progress keys and English copy", async () => {
    const { storageKey, t } = await import("../src/language");
    expect(storageKey("quadra:stats")).toBe("quadra:stats:en");
    expect(t("Bonjour", "Hello")).toBe("Hello");
  });
  it("uses English rare letters in both random and daily pools", async () => {
    const { WEIGHTED_POOL, getDailyDraw } = await import("../src/engine/draw");
    for (const letter of ["J", "K", "Q", "X", "Z"]) expect(WEIGHTED_POOL.filter(l => l === letter)).toHaveLength(1);
    for (const letter of ["H", "W", "Y"]) expect(WEIGHTED_POOL.filter(l => l === letter)).toHaveLength(4);
    expect(getDailyDraw("2026-09-13")).toEqual(getDailyDraw("2026-09-13"));
  });
  it("shares the same English dictionary between browser and solver", async () => {
    const { loadMainDictionary } = await import("../src/engine/mainDictionary");
    const { solverDictionary } = await import("./dictionary");
    const client = await loadMainDictionary();
    for (const word of ["game", "playing", "colour", "color", "organise", "organize"]) {
      expect(client.has(word), word).toBe(true);
      expect(solverDictionary.has(word), word).toBe(true);
    }
    expect(client.has("mangeaient")).toBe(false);
    expect(client.has("zzzzzzzzzz")).toBe(false);
    expect([...client.words()]).toEqual([...solverDictionary.words()]);
  });
  it("has correctly scored English examples", async () => {
    const { default: rules } = await import("../src/content/rules.en.json");
    const { scoreWord } = await import("../src/engine/score");
    for (const example of rules.sections.flatMap(section => section.examples ?? [])) {
      expect(scoreWord(example.draw, example.word).total).toBe(example.score);
    }
  });
  it("uses English text, hashtags and the English site's URL", async () => {
    const { buildShareText } = await import("../src/services/share");
    const text = buildShareText({puzzleNumber:1,score:12,bestPossible:15,draw:["G","A","M","E"],currentStreak:3,percentile:null});
    expect(text).toContain("Today’s letters: G · A · M · E");
    expect(text).toContain("3-day streak");
    expect(text).toContain("#WordGames");
    expect(text).toContain("https://english.example");
    expect(text).not.toContain("quadra-mots.fr");
  });
  it("rejects French clients and serves an English game end to end", async () => {
    const { app } = await import("./app");
    const wrong = await app.request("/api/training", {headers:{"X-Game-Language":"fr"}});
    expect(wrong.status).toBe(409);
    const request = (path: string, body: unknown) => app.request(path, {method:"POST",headers:{"Content-Type":"application/json","X-Game-Language":"en"},body:JSON.stringify(body)});
    const attempt = await request("/api/daily/2026-09-13/attempt",{deviceId:crypto.randomUUID(),attemptNum:1,score:9});
    expect(attempt.status).toBe(200);
    const finish = await request("/api/daily/2026-09-13/finish",{score:9});
    const result = await finish.json() as {playersToday:number;bestWord:string};
    expect(finish.status).toBe(200);
    expect(result.playersToday).toBe(1);
    const { solverDictionary } = await import("./dictionary");
    expect(solverDictionary.has(result.bestWord)).toBe(true);
  });
});
