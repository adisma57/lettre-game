import { describe, it, expect, beforeEach } from "vitest";
import { app } from "./app.js";
import { resetMemoryStore } from "./repo.js";
import { getTodayKey } from "../src/engine/dayKey.js";

it("prepares today without revealing answers or recording a player", async () => {
  resetMemoryStore();
  const date = getTodayKey();
  const response = await app.request(`/api/daily/${date}/prepare`);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ready: true });
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  const result = await finish(date);
  expect((await result.json() as { playersToday: number }).playersToday).toBe(0);
  expect((await app.request("/api/daily/2000-01-01/prepare")).status).toBe(400);
});

type AttemptResponse = { bestPossible: number };
type FinishResponse = {
  bestWord: string;
  topWords: unknown[];
  percentile: number | null;
  playersToday: number;
};
type TrainingResponse = { draw: string[]; top3: unknown[] };
type HealthResponse = { ok: boolean };

function asJson<T>(res: Response): Promise<T> {
  return res.json() as Promise<T>;
}

// Fixed past date: at the time this suite was written, getTodayKey() (Europe/Paris)
// resolved to "2026-09-10". Using the day before keeps this suite unambiguously
// "past" (not "today") regardless of exactly when it runs, so it never drifts into
// being rejected by invalidDate()'s future check.
const PAST_DATE = "2026-09-09";

function randomUuid(): string {
  return "10000000-0000-4000-8000-000000000000".replace(/0(?=[^-]*$)/g, () =>
    Math.floor(Math.random() * 10).toString(),
  );
}

async function attempt(
  date: string,
  body: { deviceId?: string; attemptNum?: number; score?: number },
) {
  return app.request(`/api/daily/${date}/attempt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function finish(date: string, body: { score?: number } = { score: 0 }) {
  return app.request(`/api/daily/${date}/finish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/health", () => {
  it("répond 200 avec ok: true", async () => {
    const res = await app.request("/api/health");
    expect(res.status).toBe(200);
    const json = await asJson<HealthResponse>(res);
    expect(json.ok).toBe(true);
  });
});

describe("POST /api/daily/:date/attempt", () => {
  beforeEach(() => {
    resetMemoryStore();
  });

  it("renvoie 200 et un bestPossible positif pour un corps valide", async () => {
    const res = await attempt(PAST_DATE, {
      deviceId: randomUuid(),
      attemptNum: 1,
      score: 5,
    });
    expect(res.status).toBe(200);
    const json = await asJson<AttemptResponse>(res);
    expect(json.bestPossible).toBeGreaterThan(0);
  });

  it("enregistre une partie : un second appareil change playersToday", async () => {
    // Amène le nombre de joueurs juste sous le seuil de percentile avec des
    // appareils déjà connus, puis vérifie qu'un appel /attempt supplémentaire
    // fait bien progresser playersToday tel que rapporté par /finish.
    for (let i = 0; i < 19; i++) {
      const res = await attempt(PAST_DATE, {
        deviceId: randomUuid(),
        attemptNum: 1,
        score: 0,
      });
      expect(res.status).toBe(200);
    }

    const before = await finish(PAST_DATE);
    const beforeJson = await asJson<FinishResponse>(before);
    expect(beforeJson.playersToday).toBe(19);

    const res = await attempt(PAST_DATE, {
      deviceId: randomUuid(),
      attemptNum: 1,
      score: 10,
    });
    expect(res.status).toBe(200);

    const after = await finish(PAST_DATE);
    const afterJson = await asJson<FinishResponse>(after);
    expect(afterJson.playersToday).toBe(20);
  });

  it("rejette une date malformée", async () => {
    const res = await attempt("10-09-2026", { deviceId: randomUuid(), attemptNum: 1, score: 5 });
    expect(res.status).toBe(400);
  });

  it("rejette une date future", async () => {
    const res = await attempt("2999-01-01", { deviceId: randomUuid(), attemptNum: 1, score: 5 });
    expect(res.status).toBe(400);
  });

  it("rejette un deviceId invalide", async () => {
    const res = await attempt(PAST_DATE, { deviceId: "not-a-uuid", attemptNum: 1, score: 5 });
    expect(res.status).toBe(400);
  });

  it("rejette attemptNum = 0", async () => {
    const res = await attempt(PAST_DATE, { deviceId: randomUuid(), attemptNum: 0, score: 5 });
    expect(res.status).toBe(400);
  });

  it("rejette attemptNum = 4", async () => {
    const res = await attempt(PAST_DATE, { deviceId: randomUuid(), attemptNum: 4, score: 5 });
    expect(res.status).toBe(400);
  });

  it("rejette un score négatif", async () => {
    const res = await attempt(PAST_DATE, { deviceId: randomUuid(), attemptNum: 1, score: -1 });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/daily/:date/finish", () => {
  beforeEach(() => {
    resetMemoryStore();
  });

  it("n'écrit jamais dans plays : playersToday ne bouge pas après 3 appels", async () => {
    for (let i = 0; i < 20; i++) {
      const res = await attempt(PAST_DATE, {
        deviceId: randomUuid(),
        attemptNum: 1,
        score: i,
      });
      expect(res.status).toBe(200);
    }

    const first = await asJson<FinishResponse>(await finish(PAST_DATE, { score: 5 }));
    const second = await asJson<FinishResponse>(await finish(PAST_DATE, { score: 5 }));
    const third = await asJson<FinishResponse>(await finish(PAST_DATE, { score: 5 }));

    expect(first.playersToday).toBe(20);
    expect(second.playersToday).toBe(20);
    expect(third.playersToday).toBe(20);
  });

  it("fonctionne sans attempt préalable (révélation sans avoir joué)", async () => {
    const res = await finish(PAST_DATE, { score: 0 });
    expect(res.status).toBe(200);
    const json = await asJson<FinishResponse>(res);
    expect(typeof json.bestWord).toBe("string");
    expect(json.bestWord.length).toBeGreaterThan(0);
    expect(json.topWords).toHaveLength(10);
  });

  it("percentile est null en dessous de 20 appareils distincts", async () => {
    for (let i = 0; i < 19; i++) {
      await attempt(PAST_DATE, { deviceId: randomUuid(), attemptNum: 1, score: i });
    }
    const json = await asJson<FinishResponse>(await finish(PAST_DATE, { score: 5 }));
    expect(json.playersToday).toBe(19);
    expect(json.percentile).toBeNull();
  });

  it("percentile est un nombre à partir de 20 appareils distincts", async () => {
    for (let i = 0; i < 20; i++) {
      await attempt(PAST_DATE, { deviceId: randomUuid(), attemptNum: 1, score: i });
    }
    const json = await asJson<FinishResponse>(await finish(PAST_DATE, { score: 5 }));
    expect(json.playersToday).toBe(20);
    expect(typeof json.percentile).toBe("number");
  });

  it("rejette une date malformée", async () => {
    const res = await finish("not-a-date", { score: 5 });
    expect(res.status).toBe(400);
  });

  it("rejette une date future", async () => {
    const res = await finish("2999-01-01", { score: 5 });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/training", () => {
  it("renvoie un tirage de 4 lettres et exactement 3 top3", async () => {
    const res = await app.request("/api/training");
    expect(res.status).toBe(200);
    const json = await asJson<TrainingResponse>(res);
    expect(json.draw).toHaveLength(4);
    expect(json.top3).toHaveLength(3);
  });
});
