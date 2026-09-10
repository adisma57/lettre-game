# Refonte en jeu quotidien partageable — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformer Quadra en jeu quotidien sans compte, avec série, percentile anonyme et partage texte, en supprimant pseudo, classement et solveur public.

**Architecture:** Le client génère le tirage localement et ne contient plus de solveur ; le serveur calcule le mot du jour et le top 10 et les livre seulement en fin de partie. L'identité est un UUID anonyme en `localStorage` ; la série et les statistiques sont locales et pures ; le percentile vient d'une nouvelle table `plays` avec une ligne par essai.

**Tech Stack:** React 19, React Router 7, Tailwind v4, Vite 7, Vitest 4, Hono 4, Neon Postgres, Vercel.

**Spec:** `docs/superpowers/specs/2026-09-10-jeu-quotidien-partageable-design.md`

---

## Structure des fichiers

### Créés

| Fichier | Responsabilité |
|---|---|
| `src/config.ts` | `SITE_URL`, `EPOCH` — les deux seules constantes de déploiement |
| `src/engine/dayKey.ts` | Clé de jour Europe/Paris, `daysBetween`, `puzzleNumber` |
| `src/engine/dayKey.test.ts` | Tests de bascule, heure d'été, arithmétique de dates |
| `src/services/deviceId.ts` | UUID anonyme, avec repli mémoire si `localStorage` échoue |
| `src/services/deviceId.test.ts` | Tests (jsdom) |
| `src/services/stats.ts` | `applyResult` **pure**, plus `loadStats` / `saveStats` |
| `src/services/stats.test.ts` | Tests de série, joker, distribution |
| `src/services/share.ts` | `buildShareText` **pure** |
| `src/services/share.test.ts` | Tests de format |
| `src/services/pending.ts` | File des essais non transmis (`quadra:pending`) |
| `server/dictionary.ts` | Dictionnaire du solveur côté serveur (filtre supplémentaire) |
| `server/daily.ts` | Résolution + cache du puzzle du jour |
| `server/repo.test.ts` | Tests du percentile et du seuil |
| `src/components/modals/RulesModal.tsx` | Règles en modale |
| `src/components/modals/StatsModal.tsx` | Statistiques en modale |
| `src/components/ui/Modal.tsx` | Coquille de modale réutilisable |
| `src/components/game/ShareButton.tsx` | Partage natif + repli presse-papier |

### Modifiés

| Fichier | Changement |
|---|---|
| `vitest.config.ts` | Étendre `include` à `server/`, garder `environment: "node"` |
| `src/engine/draw.ts` | `getDailyDraw` accepte une clé de jour `string` |
| `src/engine/mainDictionary.ts` | Chargement différé, format texte brut |
| `src/services/api.ts` | Réécrit : `attempt`, `finish`, `training` |
| `src/services/dailyState.ts` | `getTodayKey` retiré, champs alignés |
| `src/hooks/useDailyGame.ts` | Plus de `solveTopN`, `deviceId`, stats, file d'attente |
| `src/hooks/useTraining.ts` | Tirage et top 3 depuis l'API |
| `src/router.tsx` | Deux routes |
| `src/components/layout/Layout.tsx` | Plus de `NavBar` ni `UsernameModal` |
| `server/repo.ts` | Table `plays`, percentile, archivage |
| `server/app.ts` | Nouvelles routes, anciennes retirées |
| `scripts/build-dictionary.ts` | Sortie texte brut + variante solveur |
| `index.html` | Métadonnées Open Graph |
| `CLAUDE.md` | Mise à jour complète |

### Supprimés

`src/pages/Home.tsx`, `src/pages/Solver.tsx`, `src/pages/Leaderboard.tsx`,
`src/pages/Rules.tsx`, `src/components/layout/NavBar.tsx`,
`src/components/UsernameModal.tsx`, `src/hooks/useAuth.ts`,
`src/components/game/SolverResults.tsx` *(remplacé — voir Tâche C3)*.

---

## Phase A — Modules purs

Aucun impact visible. L'application continue de fonctionner à l'identique après chaque tâche.

### Tâche A1 : Configuration de déploiement

**Files:**
- Create: `src/config.ts`

- [ ] **Step 1: Créer le fichier**

```ts
/**
 * Constantes de déploiement.
 * SITE_URL est repris dans le texte de partage et les métadonnées Open Graph.
 * EPOCH fixe le numéro de partie ; sa valeur exacte est arbitraire mais
 * ne doit jamais changer une fois en production.
 */
export const SITE_URL = "https://quadra-mots.fr";
export const EPOCH = "2026-09-10";
```

- [ ] **Step 2: Vérifier la compilation**

Run: `npx tsc -b --noEmit`
Expected: aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add src/config.ts
git commit -m "feat(config): constantes SITE_URL et EPOCH"
```

---

### Tâche A2 : Clé de jour Europe/Paris

**Files:**
- Create: `src/engine/dayKey.ts`
- Test: `src/engine/dayKey.test.ts`

- [ ] **Step 1: Écrire les tests qui échouent**

```ts
import { describe, it, expect } from "vitest";
import { getTodayKey, daysBetween, puzzleNumber } from "./dayKey";

describe("getTodayKey", () => {
  it("23h30 heure de Paris en été → jour courant", () => {
    // 2026-09-10T21:30:00Z = 23:30 à Paris (UTC+2)
    expect(getTodayKey(new Date("2026-09-10T21:30:00Z"))).toBe("2026-09-10");
  });

  it("00h30 heure de Paris en été → jour suivant", () => {
    // 2026-09-10T22:30:00Z = 00:30 le 11 à Paris (UTC+2)
    expect(getTodayKey(new Date("2026-09-10T22:30:00Z"))).toBe("2026-09-11");
  });

  it("23h30 heure de Paris en hiver → jour courant", () => {
    // 2026-01-15T22:30:00Z = 23:30 à Paris (UTC+1)
    expect(getTodayKey(new Date("2026-01-15T22:30:00Z"))).toBe("2026-01-15");
  });

  it("00h30 heure de Paris en hiver → jour suivant", () => {
    // 2026-01-15T23:30:00Z = 00:30 le 16 à Paris (UTC+1)
    expect(getTodayKey(new Date("2026-01-15T23:30:00Z"))).toBe("2026-01-16");
  });

  it("format YYYY-MM-DD", () => {
    expect(getTodayKey(new Date("2026-03-05T12:00:00Z"))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("daysBetween", () => {
  it("jours consécutifs", () => {
    expect(daysBetween("2026-09-10", "2026-09-11")).toBe(1);
  });

  it("même jour", () => {
    expect(daysBetween("2026-09-10", "2026-09-10")).toBe(0);
  });

  it("changement de mois", () => {
    expect(daysBetween("2026-01-31", "2026-02-01")).toBe(1);
  });

  it("changement d'année", () => {
    expect(daysBetween("2025-12-31", "2026-01-01")).toBe(1);
  });

  it("traverse le passage à l'heure d'été (29 mars 2026)", () => {
    expect(daysBetween("2026-03-28", "2026-03-30")).toBe(2);
  });

  it("négatif si b précède a", () => {
    expect(daysBetween("2026-09-11", "2026-09-10")).toBe(-1);
  });
});

describe("puzzleNumber", () => {
  it("le jour de l'EPOCH est la partie #1", () => {
    expect(puzzleNumber("2026-09-10")).toBe(1);
  });

  it("le lendemain est la partie #2", () => {
    expect(puzzleNumber("2026-09-11")).toBe(2);
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/engine/dayKey.test.ts`
Expected: FAIL — `Failed to resolve import "./dayKey"`.

- [ ] **Step 3: Écrire l'implémentation**

```ts
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
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run src/engine/dayKey.test.ts`
Expected: PASS — 13 tests.

- [ ] **Step 5: Commit**

```bash
git add src/engine/dayKey.ts src/engine/dayKey.test.ts
git commit -m "feat(engine): clé de jour Europe/Paris et arithmétique de dates"
```

---

### Tâche A3 : Identifiant d'appareil anonyme

**Files:**
- Create: `src/services/deviceId.ts`
- Test: `src/services/deviceId.test.ts`

Note : ce test a besoin de `localStorage`, absent de l'environnement `node`
configuré dans `vitest.config.ts`. La directive en tête de fichier bascule
**ce fichier seulement** en jsdom (`jsdom` est déjà en devDependencies).

- [ ] **Step 1: Écrire les tests qui échouent**

```ts
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
    expect(fresh.getDeviceId()).toBe(id);
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/services/deviceId.test.ts`
Expected: FAIL — `Failed to resolve import "./deviceId"`.

- [ ] **Step 3: Écrire l'implémentation**

```ts
export const DEVICE_STORAGE_KEY = "quadra:device";

// Repli utilisé quand localStorage est inaccessible (Safari iOS en navigation
// privée, stockage bloqué). La partie du jour reste jouable et comptabilisée ;
// seule la persistance entre sessions est perdue.
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
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run src/services/deviceId.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/services/deviceId.ts src/services/deviceId.test.ts
git commit -m "feat(services): identifiant d'appareil anonyme avec repli mémoire"
```

---

### Tâche A4 : Statistiques et série

**Files:**
- Create: `src/services/stats.ts`
- Test: `src/services/stats.test.ts`

- [ ] **Step 1: Écrire les tests qui échouent**

```ts
import { describe, it, expect } from "vitest";
import { applyResult, createEmptyStats, type Stats } from "./stats";

function statsAt(overrides: Partial<Stats> = {}): Stats {
  return { ...createEmptyStats(), ...overrides };
}

describe("applyResult — série", () => {
  it("première partie → série à 1", () => {
    const next = applyResult(createEmptyStats(), {
      date: "2026-09-10", score: 12, bestPossible: 20, attempts: 2,
    });
    expect(next.currentStreak).toBe(1);
    expect(next.maxStreak).toBe(1);
    expect(next.lastPlayedDate).toBe("2026-09-10");
  });

  it("lendemain → série incrémentée", () => {
    const next = applyResult(
      statsAt({ gamesPlayed: 1, currentStreak: 4, maxStreak: 4, lastPlayedDate: "2026-09-10" }),
      { date: "2026-09-11", score: 12, bestPossible: 20, attempts: 1 },
    );
    expect(next.currentStreak).toBe(5);
    expect(next.maxStreak).toBe(5);
  });

  it("un jour manqué avec joker disponible → série maintenue et joker consommé", () => {
    const next = applyResult(
      statsAt({ gamesPlayed: 1, currentStreak: 6, maxStreak: 6, lastPlayedDate: "2026-09-10" }),
      { date: "2026-09-12", score: 12, bestPossible: 20, attempts: 1 },
    );
    expect(next.currentStreak).toBe(7);
    expect(next.jokerUsedOn).toBe("2026-09-12");
  });

  it("un jour manqué avec joker déjà consommé il y a 3 jours → série remise à 1", () => {
    const next = applyResult(
      statsAt({
        gamesPlayed: 1, currentStreak: 6, maxStreak: 6,
        lastPlayedDate: "2026-09-10", jokerUsedOn: "2026-09-09",
      }),
      { date: "2026-09-12", score: 12, bestPossible: 20, attempts: 1 },
    );
    expect(next.currentStreak).toBe(1);
    expect(next.jokerUsedOn).toBe("2026-09-09");
  });

  it("un jour manqué avec joker consommé il y a plus de 7 jours → joker de nouveau disponible", () => {
    const next = applyResult(
      statsAt({
        gamesPlayed: 1, currentStreak: 6, maxStreak: 6,
        lastPlayedDate: "2026-09-10", jokerUsedOn: "2026-09-01",
      }),
      { date: "2026-09-12", score: 12, bestPossible: 20, attempts: 1 },
    );
    expect(next.currentStreak).toBe(7);
    expect(next.jokerUsedOn).toBe("2026-09-12");
  });

  it("trois jours d'écart → série remise à 1 même avec joker", () => {
    const next = applyResult(
      statsAt({ gamesPlayed: 1, currentStreak: 9, maxStreak: 9, lastPlayedDate: "2026-09-10" }),
      { date: "2026-09-13", score: 12, bestPossible: 20, attempts: 1 },
    );
    expect(next.currentStreak).toBe(1);
  });

  it("maxStreak conserve le record après une série cassée", () => {
    const next = applyResult(
      statsAt({ gamesPlayed: 1, currentStreak: 9, maxStreak: 12, lastPlayedDate: "2026-09-10" }),
      { date: "2026-09-20", score: 12, bestPossible: 20, attempts: 1 },
    );
    expect(next.currentStreak).toBe(1);
    expect(next.maxStreak).toBe(12);
  });
});

describe("applyResult — agrégats", () => {
  it("cumule score, précision et distribution", () => {
    const next = applyResult(createEmptyStats(), {
      date: "2026-09-10", score: 15, bestPossible: 20, attempts: 2,
    });
    expect(next.gamesPlayed).toBe(1);
    expect(next.scoreSum).toBe(15);
    expect(next.accuracySum).toBeCloseTo(0.75);
    expect(next.accuracyCount).toBe(1);
    expect(next.attemptDistribution).toEqual([0, 1, 0]);
    expect(next.perfectCount).toBe(0);
  });

  it("compte une partie parfaite", () => {
    const next = applyResult(createEmptyStats(), {
      date: "2026-09-10", score: 20, bestPossible: 20, attempts: 1,
    });
    expect(next.perfectCount).toBe(1);
    expect(next.attemptDistribution).toEqual([1, 0, 0]);
  });

  it("hors-ligne (bestPossible null) → série et gamesPlayed seulement", () => {
    const next = applyResult(createEmptyStats(), {
      date: "2026-09-10", score: 15, bestPossible: null, attempts: 3,
    });
    expect(next.gamesPlayed).toBe(1);
    expect(next.currentStreak).toBe(1);
    expect(next.scoreSum).toBe(15);
    expect(next.accuracyCount).toBe(0);
    expect(next.accuracySum).toBe(0);
    expect(next.perfectCount).toBe(0);
    expect(next.attemptDistribution).toEqual([0, 0, 1]);
  });

  it("révélation sans essai → série maintenue, aucun agrégat de performance", () => {
    const next = applyResult(createEmptyStats(), {
      date: "2026-09-10", score: 0, bestPossible: 20, attempts: 0,
    });
    expect(next.gamesPlayed).toBe(1);
    expect(next.currentStreak).toBe(1);
    expect(next.accuracyCount).toBe(0);
    expect(next.perfectCount).toBe(0);
    expect(next.attemptDistribution).toEqual([0, 0, 0]);
  });

  it("ne mute pas l'objet d'entrée", () => {
    const before = createEmptyStats();
    applyResult(before, { date: "2026-09-10", score: 5, bestPossible: 10, attempts: 1 });
    expect(before.gamesPlayed).toBe(0);
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/services/stats.test.ts`
Expected: FAIL — `Failed to resolve import "./stats"`.

- [ ] **Step 3: Écrire l'implémentation**

```ts
import { daysBetween } from "../engine/dayKey";

export const STATS_STORAGE_KEY = "quadra:stats";

/** Nombre de jours pendant lesquels un joker consommé reste indisponible. */
const JOKER_COOLDOWN_DAYS = 7;

export type Stats = {
  _v: 1;
  gamesPlayed: number;
  currentStreak: number;
  maxStreak: number;
  lastPlayedDate: string | null;
  jokerUsedOn: string | null;
  scoreSum: number;
  accuracySum: number;
  accuracyCount: number;
  attemptDistribution: [number, number, number];
  perfectCount: number;
};

export type GameResult = {
  date: string;
  score: number;
  /** null quand le serveur n'a pas pu fournir le dénominateur (hors-ligne). */
  bestPossible: number | null;
  /** 0 pour une révélation sans aucun essai. */
  attempts: number;
};

export function createEmptyStats(): Stats {
  return {
    _v: 1,
    gamesPlayed: 0,
    currentStreak: 0,
    maxStreak: 0,
    lastPlayedDate: null,
    jokerUsedOn: null,
    scoreSum: 0,
    accuracySum: 0,
    accuracyCount: 0,
    attemptDistribution: [0, 0, 0],
    perfectCount: 0,
  };
}

function jokerAvailable(stats: Stats, today: string): boolean {
  if (stats.jokerUsedOn === null) return true;
  return daysBetween(stats.jokerUsedOn, today) > JOKER_COOLDOWN_DAYS;
}

/**
 * Applique le résultat d'une partie. Fonction pure : ne lit ni n'écrit
 * localStorage, ce qui la rend testable sans DOM.
 */
export function applyResult(stats: Stats, result: GameResult): Stats {
  const next: Stats = {
    ...stats,
    attemptDistribution: [...stats.attemptDistribution] as [number, number, number],
  };

  // ─── Série ───
  if (stats.lastPlayedDate === null) {
    next.currentStreak = 1;
  } else {
    const gap = daysBetween(stats.lastPlayedDate, result.date);
    if (gap === 1) {
      next.currentStreak = stats.currentStreak + 1;
    } else if (gap === 2 && jokerAvailable(stats, result.date)) {
      next.currentStreak = stats.currentStreak + 1;
      next.jokerUsedOn = result.date;
    } else {
      next.currentStreak = 1;
    }
  }
  next.maxStreak = Math.max(stats.maxStreak, next.currentStreak);
  next.lastPlayedDate = result.date;

  // ─── Agrégats ───
  next.gamesPlayed = stats.gamesPlayed + 1;
  next.scoreSum = stats.scoreSum + result.score;

  if (result.attempts >= 1 && result.attempts <= 3) {
    next.attemptDistribution[result.attempts - 1] += 1;
  }

  // Une révélation sans essai, ou une partie hors-ligne, n'a pas de précision
  // exploitable : on ne fausse pas la moyenne en l'y intégrant.
  if (result.bestPossible !== null && result.bestPossible > 0 && result.attempts >= 1) {
    next.accuracySum = stats.accuracySum + result.score / result.bestPossible;
    next.accuracyCount = stats.accuracyCount + 1;
    if (result.score >= result.bestPossible) {
      next.perfectCount = stats.perfectCount + 1;
    }
  }

  return next;
}

export function loadStats(): Stats {
  try {
    const raw = localStorage.getItem(STATS_STORAGE_KEY);
    if (!raw) return createEmptyStats();
    const parsed = JSON.parse(raw) as Partial<Stats>;
    if (parsed._v !== 1) return createEmptyStats();
    return { ...createEmptyStats(), ...parsed } as Stats;
  } catch {
    return createEmptyStats();
  }
}

/** Renvoie false si l'écriture a échoué (stockage indisponible). */
export function saveStats(stats: Stats): boolean {
  try {
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run src/services/stats.test.ts`
Expected: PASS — 12 tests.

- [ ] **Step 5: Commit**

```bash
git add src/services/stats.ts src/services/stats.test.ts
git commit -m "feat(services): statistiques locales et règle de série avec joker"
```

---

### Tâche A5 : Texte de partage

**Files:**
- Create: `src/services/share.ts`
- Test: `src/services/share.test.ts`

- [ ] **Step 1: Écrire les tests qui échouent**

```ts
import { describe, it, expect } from "vitest";
import { buildShareText, drawSquares } from "./share";

describe("drawSquares", () => {
  it("marque les lettres utilisées", () => {
    expect(drawSquares(["A", "B", "C", "D"], ["A", "C"])).toBe("🟧⬜🟧⬜");
  });

  it("aucune lettre utilisée", () => {
    expect(drawSquares(["A", "B", "C", "D"], [])).toBe("⬜⬜⬜⬜");
  });

  it("toutes les lettres utilisées", () => {
    expect(drawSquares(["A", "B", "C", "D"], ["A", "B", "C", "D"])).toBe("🟧🟧🟧🟧");
  });

  it("lettre en double : une seule occurrence utilisée en marque une seule", () => {
    expect(drawSquares(["A", "A", "B", "C"], ["A", "B"])).toBe("🟧⬜🟧⬜");
  });

  it("lettre en double utilisée deux fois en marque deux", () => {
    expect(drawSquares(["A", "A", "B", "C"], ["A", "A"])).toBe("🟧🟧⬜⬜");
  });
});

describe("buildShareText", () => {
  const base = {
    puzzleNumber: 142,
    score: 21,
    bestPossible: 24,
    draw: ["Q", "R", "T", "Z"],
    usedLetters: ["Q", "R", "T"],
    orderBonus: true,
    currentStreak: 7,
    percentile: 0.68,
  };

  it("format complet", () => {
    expect(buildShareText(base)).toBe(
      "Quadra #142 — 21/24 🟧🟧🟧⬜ ✅\n" +
      "Série 7 🔥 · mieux que 68 % des joueurs\n" +
      "https://quadra-mots.fr",
    );
  });

  it("sans bonus d'ordre → pas de coche", () => {
    expect(buildShareText({ ...base, orderBonus: false })).toContain("🟧🟧🟧⬜\n");
  });

  it("sans percentile → la ligne se limite à la série", () => {
    const text = buildShareText({ ...base, percentile: null });
    expect(text).toContain("Série 7 🔥\n");
    expect(text).not.toContain("mieux que");
  });

  it("sans dénominateur → score en points bruts", () => {
    expect(buildShareText({ ...base, bestPossible: null })).toContain("21 pts");
  });

  it("arrondit le percentile à l'entier", () => {
    expect(buildShareText({ ...base, percentile: 0.684 })).toContain("68 %");
  });

  it("se termine toujours par l'URL du site", () => {
    expect(buildShareText(base).endsWith("https://quadra-mots.fr")).toBe(true);
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/services/share.test.ts`
Expected: FAIL — `Failed to resolve import "./share"`.

- [ ] **Step 3: Écrire l'implémentation**

```ts
import { SITE_URL } from "../config";
import type { Draw } from "../engine/types";

const USED = "🟧";
const UNUSED = "⬜";

/**
 * Une case par lettre du tirage. Longueur fixe à 4 : contrairement à une
 * grille calquée sur le mot trouvé, elle ne divulgue pas sa longueur.
 * Les doublons sont gérés en consommant une occurrence par correspondance.
 */
export function drawSquares(draw: Draw, usedLetters: string[]): string {
  const pool = [...usedLetters];
  return draw
    .map((letter) => {
      const i = pool.indexOf(letter);
      if (i === -1) return UNUSED;
      pool.splice(i, 1);
      return USED;
    })
    .join("");
}

export type ShareInput = {
  puzzleNumber: number;
  score: number;
  bestPossible: number | null;
  draw: Draw;
  usedLetters: string[];
  orderBonus: boolean;
  currentStreak: number;
  percentile: number | null;
};

export function buildShareText(input: ShareInput): string {
  const scoreLabel =
    input.bestPossible === null
      ? `${input.score} pts`
      : `${input.score}/${input.bestPossible}`;

  const squares = drawSquares(input.draw, input.usedLetters);
  const bonus = input.orderBonus ? " ✅" : "";

  const streak = `Série ${input.currentStreak} 🔥`;
  const rank =
    input.percentile === null
      ? ""
      : ` · mieux que ${Math.round(input.percentile * 100)} % des joueurs`;

  return [
    `Quadra #${input.puzzleNumber} — ${scoreLabel} ${squares}${bonus}`,
    `${streak}${rank}`,
    SITE_URL,
  ].join("\n");
}
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run src/services/share.test.ts`
Expected: PASS — 11 tests.

- [ ] **Step 5: Lancer toute la suite pour vérifier l'absence de régression**

Run: `npm run test -- --run`
Expected: PASS — les tests moteur existants passent toujours.

- [ ] **Step 6: Commit**

```bash
git add src/services/share.ts src/services/share.test.ts
git commit -m "feat(services): construction du texte de partage"
```

---

## Phase B — Backend

### Tâche B1 : Étendre la découverte des tests aux fichiers serveur

**Files:**
- Modify: `vitest.config.ts`

- [ ] **Step 1: Modifier la configuration**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "server/**/*.test.ts"],
    environment: "node",
  },
});
```

- [ ] **Step 2: Vérifier que la suite tourne toujours**

Run: `npm run test -- --run`
Expected: PASS — même nombre de tests qu'avant (aucun test serveur n'existe encore).

- [ ] **Step 3: Commit**

```bash
git add vitest.config.ts
git commit -m "chore(test): ramasser aussi les tests du dossier server"
```

---

### Tâche B2 : Table `plays` et archivage de l'ancien schéma

**Files:**
- Modify: `server/repo.ts`
- Test: `server/repo.test.ts`

Le percentile est testé sur le **backend mémoire** (actif sans `DATABASE_URL`),
ce qui permet de tester la logique sans base de données.

- [ ] **Step 1: Écrire les tests qui échouent**

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { insertPlay, getDailyPercentile, resetMemoryStore } from "./repo.js";

describe("getDailyPercentile", () => {
  beforeEach(() => {
    resetMemoryStore();
  });

  it("renvoie null en dessous de 20 joueurs distincts", async () => {
    for (let i = 0; i < 19; i++) {
      await insertPlay(`device-${i}`, "2026-09-10", 1, i);
    }
    const result = await getDailyPercentile("2026-09-10", 10);
    expect(result.percentile).toBeNull();
    expect(result.playersToday).toBe(19);
  });

  it("renvoie un percentile à partir de 20 joueurs distincts", async () => {
    // scores 0..19, un joueur chacun
    for (let i = 0; i < 20; i++) {
      await insertPlay(`device-${i}`, "2026-09-10", 1, i);
    }
    // 10 joueurs ont un score strictement inférieur à 10
    const result = await getDailyPercentile("2026-09-10", 10);
    expect(result.playersToday).toBe(20);
    expect(result.percentile).toBeCloseTo(0.5);
  });

  it("utilise le meilleur score du jour par appareil", async () => {
    for (let i = 0; i < 19; i++) {
      await insertPlay(`device-${i}`, "2026-09-10", 1, 0);
    }
    // Un 20e joueur en trois essais : seul son meilleur score compte
    await insertPlay("device-haut", "2026-09-10", 1, 2);
    await insertPlay("device-haut", "2026-09-10", 2, 30);
    await insertPlay("device-haut", "2026-09-10", 3, 5);

    const result = await getDailyPercentile("2026-09-10", 25);
    expect(result.playersToday).toBe(20);
    // 19 joueurs à 0 sont sous 25, le 20e est à 30 donc au-dessus
    expect(result.percentile).toBeCloseTo(19 / 20);
  });

  it("ignore les parties des autres jours", async () => {
    for (let i = 0; i < 20; i++) {
      await insertPlay(`device-${i}`, "2026-09-09", 1, 50);
    }
    const result = await getDailyPercentile("2026-09-10", 10);
    expect(result.playersToday).toBe(0);
    expect(result.percentile).toBeNull();
  });
});

describe("insertPlay", () => {
  beforeEach(() => {
    resetMemoryStore();
  });

  it("est idempotent sur (device_id, date, attempt_num)", async () => {
    await insertPlay("device-a", "2026-09-10", 1, 12);
    await insertPlay("device-a", "2026-09-10", 1, 99);
    for (let i = 0; i < 19; i++) {
      await insertPlay(`device-${i}`, "2026-09-10", 1, 0);
    }
    const result = await getDailyPercentile("2026-09-10", 100);
    expect(result.playersToday).toBe(20);
    // Le second insert a été ignoré : device-a reste à 12, donc < 100
    expect(result.percentile).toBeCloseTo(1);
  });

  it("accepte plusieurs essais pour un même appareil", async () => {
    await insertPlay("device-a", "2026-09-10", 1, 5);
    await insertPlay("device-a", "2026-09-10", 2, 8);
    for (let i = 0; i < 19; i++) {
      await insertPlay(`device-${i}`, "2026-09-10", 1, 0);
    }
    const result = await getDailyPercentile("2026-09-10", 7);
    expect(result.playersToday).toBe(20);
    // device-a a pour meilleur score 8, donc pas sous 7
    expect(result.percentile).toBeCloseTo(19 / 20);
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run server/repo.test.ts`
Expected: FAIL — `insertPlay is not exported`.

- [ ] **Step 3: Remplacer le contenu de `server/repo.ts`**

Supprimer intégralement `LeaderboardRow`, `getLeaderboard`, `insertUser`,
`findUserIdByUsername`, `usernameExists`, `insertScoreIfAbsent`, les helpers
`currentWeekMondayUtc` / `currentMonthStartUtc` / `LEADERBOARD_SELECT` /
`LEADERBOARD_GROUPBY`, ainsi que les champs `usersById`, `lowerToId`, `scores`
et `nextUserId` du store mémoire.

Conserver tel quel le bloc de configuration Neon en tête de fichier (jusqu'à
`isUniqueViolation` inclus) et y ajouter :

```ts
// ─── Store mémoire (sans DATABASE_URL) ───────────────────────────────────────

type MemPlay = {
  deviceId: string;
  date: string;
  attemptNum: number;
  score: number;
};

const mem = {
  plays: [] as MemPlay[],
  dailyPuzzles: new Map<string, { bestPossible: number; bestWord: string }>(),
};

/** Réservé aux tests : vide le store mémoire entre deux cas. */
export function resetMemoryStore(): void {
  mem.plays = [];
  mem.dailyPuzzles.clear();
}

/** Seuil en dessous duquel un percentile n'est pas statistiquement lisible. */
export const MIN_PLAYERS_FOR_PERCENTILE = 20;

export type DailyPuzzle = { bestPossible: number; bestWord: string };
export type PercentileResult = { percentile: number | null; playersToday: number };

export async function ensureSchema(): Promise<void> {
  if (isMemoryBackend()) {
    console.warn(
      "[quadra] Base en mémoire (pas de DATABASE_URL) — données perdues au redémarrage.",
    );
    return;
  }

  const sql = getNeon();

  await sql`
    CREATE TABLE IF NOT EXISTS plays (
      id          SERIAL PRIMARY KEY,
      device_id   TEXT    NOT NULL,
      date        TEXT    NOT NULL,
      attempt_num INTEGER NOT NULL,
      score       INTEGER NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (device_id, date, attempt_num)
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS plays_date ON plays (date)`;

  await sql`
    CREATE TABLE IF NOT EXISTS daily_puzzles (
      date          TEXT    NOT NULL PRIMARY KEY,
      best_possible INTEGER NOT NULL
    )
  `;

  await sql`ALTER TABLE daily_puzzles ADD COLUMN IF NOT EXISTS best_word TEXT`;

  // Archivage de l'ancien schéma pseudo + classement. Un device_id ne peut pas
  // être reconstruit depuis un pseudo : on renomme plutôt que de supprimer.
  await sql`ALTER TABLE IF EXISTS scores RENAME TO scores_archive`;
  await sql`ALTER TABLE IF EXISTS users  RENAME TO users_archive`;
}

export async function insertPlay(
  deviceId: string,
  date: string,
  attemptNum: number,
  score: number,
): Promise<void> {
  if (isMemoryBackend()) {
    const exists = mem.plays.some(
      (p) => p.deviceId === deviceId && p.date === date && p.attemptNum === attemptNum,
    );
    if (!exists) mem.plays.push({ deviceId, date, attemptNum, score });
    return;
  }

  const sql = getNeon();
  await sql`
    INSERT INTO plays (device_id, date, attempt_num, score)
    VALUES (${deviceId}, ${date}, ${attemptNum}, ${score})
    ON CONFLICT (device_id, date, attempt_num) DO NOTHING
  `;
}

export async function getDailyPercentile(
  date: string,
  score: number,
): Promise<PercentileResult> {
  if (isMemoryBackend()) {
    const best = new Map<string, number>();
    for (const p of mem.plays) {
      if (p.date !== date) continue;
      best.set(p.deviceId, Math.max(best.get(p.deviceId) ?? -Infinity, p.score));
    }
    const playersToday = best.size;
    if (playersToday < MIN_PLAYERS_FOR_PERCENTILE) {
      return { percentile: null, playersToday };
    }
    let below = 0;
    for (const v of best.values()) if (v < score) below += 1;
    return { percentile: below / playersToday, playersToday };
  }

  const sql = getNeon();
  const rows = (await sql`
    WITH best AS (
      SELECT device_id, MAX(score) AS score
      FROM plays WHERE date = ${date} GROUP BY device_id
    )
    SELECT
      COUNT(*)::int                                   AS players_today,
      COUNT(*) FILTER (WHERE score < ${score})::int   AS below
    FROM best
  `) as { players_today: number; below: number }[];

  const playersToday = rows[0]?.players_today ?? 0;
  const below = rows[0]?.below ?? 0;
  if (playersToday < MIN_PLAYERS_FOR_PERCENTILE) {
    return { percentile: null, playersToday };
  }
  return { percentile: below / playersToday, playersToday };
}

export async function getDailyPuzzle(date: string): Promise<DailyPuzzle | null> {
  if (isMemoryBackend()) {
    return mem.dailyPuzzles.get(date) ?? null;
  }

  const sql = getNeon();
  const rows = (await sql`
    SELECT best_possible, best_word FROM daily_puzzles WHERE date = ${date}
  `) as { best_possible: number; best_word: string | null }[];

  const row = rows[0];
  if (!row || row.best_word === null) return null;
  return { bestPossible: row.best_possible, bestWord: row.best_word };
}

export async function upsertDailyPuzzle(
  date: string,
  puzzle: DailyPuzzle,
): Promise<void> {
  if (isMemoryBackend()) {
    if (!mem.dailyPuzzles.has(date)) mem.dailyPuzzles.set(date, puzzle);
    return;
  }

  const sql = getNeon();
  await sql`
    INSERT INTO daily_puzzles (date, best_possible, best_word)
    VALUES (${date}, ${puzzle.bestPossible}, ${puzzle.bestWord})
    ON CONFLICT (date) DO UPDATE
      SET best_possible = EXCLUDED.best_possible,
          best_word     = EXCLUDED.best_word
  `;
}
```

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run server/repo.test.ts`
Expected: PASS — 6 tests.

- [ ] **Step 5: Commit**

```bash
git add server/repo.ts server/repo.test.ts
git commit -m "feat(server): table plays, percentile anonyme, archivage users/scores"
```

---

### Tâche B3 : Dictionnaire du solveur côté serveur

**Files:**
- Modify: `scripts/build-dictionary.ts:44-48` (la constante `WORD_RE` et son voisinage)
- Create: `server/dictionary.ts`

Le dictionnaire du solveur fixe le dénominateur du score de tous les joueurs :
il ne doit contenir que des mots courants. Le filtre `np` est déjà en place
(`scripts/build-dictionary.ts:76`) ; il reste 4 283 formes à trait d'union.

- [ ] **Step 1: Ajouter la génération du fichier solveur**

Dans `scripts/build-dictionary.ts`, à côté de la constante `OUT_PATH`, ajouter :

```ts
const SOLVER_OUT_PATH = path.join(
  __dirname,
  "../server/data/solver-words.json",
);

/** Formes acceptées pour le solveur : lettres uniquement, ni trait d'union ni apostrophe. */
const SOLVER_WORD_RE = /^[a-zA-ZÀ-ÖØ-öø-ÿœŒæÆ]{2,}$/;
```

Puis, juste avant l'écriture existante de `OUT_PATH`, ajouter :

```ts
const solverWords = words.filter((w) => SOLVER_WORD_RE.test(w));
mkdirSync(path.dirname(SOLVER_OUT_PATH), { recursive: true });
await writeFile(SOLVER_OUT_PATH, JSON.stringify(solverWords));
console.log(`Solveur : ${solverWords.length} formes → ${SOLVER_OUT_PATH}`);
```

*(`words` est le tableau final déjà construit par le script ; adapter le nom
de variable à celui réellement utilisé dans le fichier.)*

- [ ] **Step 2: Régénérer les dictionnaires**

```bash
curl -o /tmp/lefff-3.4.mlex https://raw.githubusercontent.com/ClaudeCoulombe/FrenchLefffLemmatizer/master/french_lefff_lemmatizer/data/lefff-3.4.mlex
curl -o /tmp/lefff-3.4-addition.mlex https://raw.githubusercontent.com/ClaudeCoulombe/FrenchLefffLemmatizer/master/french_lefff_lemmatizer/data/lefff-3.4-addition.mlex
npx tsx scripts/build-dictionary.ts
```

Expected: deux lignes de log, dont `Solveur : ~396000 formes`.

- [ ] **Step 3: Créer le module de dictionnaire serveur**

```ts
import solverWords from "./data/solver-words.json" with { type: "json" };
import {
  createSetDictionary,
  type Dictionary,
} from "../src/engine/DictionaryService.js";

/**
 * Dictionnaire du solveur : plus strict que celui de validation côté client.
 * Ni noms propres (filtrés à la génération), ni formes à trait d'union.
 * Chargé une seule fois par instance de fonction Vercel.
 */
export const solverDictionary: Dictionary = createSetDictionary(
  solverWords as string[],
);
```

- [ ] **Step 4: Vérifier la compilation**

Run: `npx tsc -b --noEmit`
Expected: aucune erreur.

- [ ] **Step 5: Commit**

```bash
git add scripts/build-dictionary.ts server/dictionary.ts server/data/solver-words.json
git commit -m "feat(server): dictionnaire du solveur sans formes à trait d'union"
```

---

### Tâche B4 : `getDailyDraw` sur clé de jour

**Files:**
- Modify: `src/engine/draw.ts:44-60`
- Modify: `src/engine/draw.test.ts`

- [ ] **Step 1: Adapter les tests existants**

Remplacer dans `src/engine/draw.test.ts` le bloc `describe("getDailyDraw", …)` par :

```ts
describe("getDailyDraw", () => {
  it("même clé de jour → même tirage (déterminisme)", () => {
    expect(getDailyDraw("2026-04-04")).toEqual(getDailyDraw("2026-04-04"));
  });

  it("clés de jour différentes → tirages différents", () => {
    expect(getDailyDraw("2026-04-04")).not.toEqual(getDailyDraw("2026-04-05"));
  });

  it("renvoie 4 lettres majuscules A-Z", () => {
    const draw = getDailyDraw("2026-04-04");
    expect(draw).toHaveLength(4);
    for (const letter of draw) {
      expect(letter).toMatch(/^[A-Z]$/);
    }
  });

  it("sans argument, utilise le jour courant à Paris", () => {
    expect(getDailyDraw()).toEqual(getDailyDraw(getTodayKey()));
  });
});
```

Ajouter en tête du fichier : `import { getTodayKey } from "./dayKey";`

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `npx vitest run src/engine/draw.test.ts`
Expected: FAIL — `getDailyDraw` reçoit une chaîne là où il attend une `Date`.

- [ ] **Step 3: Modifier l'implémentation**

Remplacer `dateToSeed` et `getDailyDraw` dans `src/engine/draw.ts` par :

```ts
// "2026-04-04" → 20260404
function dayKeyToSeed(dayKey: string): number {
  return Number(dayKey.replace(/-/g, ""));
}

/**
 * Renvoie le même tirage pour tous les joueurs un jour donné.
 * Fonction pure : le serveur obtient le même résultat que le client.
 */
export function getDailyDraw(dayKey: string = getTodayKey()): Draw {
  const rng = mulberry32(dayKeyToSeed(dayKey));
  return Array.from({ length: 4 }, () =>
    WEIGHTED_POOL[Math.floor(rng() * WEIGHTED_POOL.length)]
  );
}
```

Ajouter en tête du fichier : `import { getTodayKey } from "./dayKey";`

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `npx vitest run src/engine/draw.test.ts`
Expected: PASS.

- [ ] **Step 5: Corriger les appelants**

Run: `npx tsc -b --noEmit`
Expected: erreurs dans `src/hooks/useDailyGame.ts` — les corriger en remplaçant
`getDailyDraw()` par `getDailyDraw(getTodayKey())` et en important `getTodayKey`
depuis `../engine/dayKey`.

- [ ] **Step 6: Commit**

```bash
git add src/engine/draw.ts src/engine/draw.test.ts src/hooks/useDailyGame.ts
git commit -m "feat(engine): tirage quotidien indexé sur la clé de jour Paris"
```

---

### Tâche B5 : Vérification manuelle des 30 tirages

Cette tâche est une **porte de qualité** exigée par le § 8 de la spec : si le
solveur renvoie régulièrement des mots inconnus du grand public, le percentile
et la précision moyenne perdent tout sens.

**Files:**
- Create: `scripts/check-solver.ts`

- [ ] **Step 1: Écrire le script de vérification**

```ts
/**
 * Affiche le meilleur mot de 30 tirages quotidiens consécutifs.
 * Usage : npx tsx scripts/check-solver.ts
 *
 * À relire à l'œil : si des mots inconnus du grand public reviennent
 * souvent, il faut ajouter une curation par fréquence (Lexique 383).
 */
import { getDailyDraw } from "../src/engine/draw.js";
import { solveTopN } from "../src/engine/solver.js";
import { solverDictionary } from "../server/dictionary.js";

const start = new Date("2026-09-10T12:00:00Z");

for (let i = 0; i < 30; i++) {
  const day = new Date(start.getTime() + i * 86_400_000);
  const key = day.toISOString().slice(0, 10);
  const draw = getDailyDraw(key);
  const [best] = solveTopN(draw, solverDictionary, 1);
  console.log(
    `${key}  ${draw.join("")}  →  ${best?.word ?? "(aucun)"}  (${best?.score.total ?? 0} pts)`,
  );
}
```

*(Ce script utilise la signature `getDailyDraw(dayKey: string)` livrée en Tâche B4.)*

- [ ] **Step 2: Exécuter et relire la sortie**

Run: `npx tsx scripts/check-solver.ts`
Expected: 30 lignes. **Relire les 30 mots.**

- [ ] **Step 3: Décider**

- Si les mots sont majoritairement reconnaissables → continuer, rien à faire.
- Si des mots obscurs reviennent (plus de 5 sur 30) → **arrêter et signaler** :
  une curation par fréquence est nécessaire, elle est hors périmètre de ce plan
  et fera l'objet d'un plan distinct.

- [ ] **Step 4: Commit**

```bash
git add scripts/check-solver.ts
git commit -m "chore(scripts): vérification manuelle de la qualité du solveur"
```

---

### Tâche B6 : Résolution et cache du puzzle du jour

**Files:**
- Create: `server/daily.ts`

- [ ] **Step 1: Écrire le module**

```ts
import { getDailyDraw } from "../src/engine/draw.js";
import { solveTopN, type SolverResult } from "../src/engine/solver.js";
import { solverDictionary } from "./dictionary.js";
import { getDailyPuzzle, upsertDailyPuzzle, type DailyPuzzle } from "./repo.js";

/**
 * Cache mémoire par instance de fonction : évite de rebalayer le dictionnaire
 * à chaque requête d'une même instance chaude. La base reste la source de
 * vérité partagée entre instances.
 */
const topWordsCache = new Map<string, SolverResult[]>();

function solve(dayKey: string): SolverResult[] {
  const cached = topWordsCache.get(dayKey);
  if (cached) return cached;
  const results = solveTopN(getDailyDraw(dayKey), solverDictionary, 10);
  topWordsCache.set(dayKey, results);
  return results;
}

/**
 * Renvoie le dénominateur du jour, en le calculant et en le persistant
 * s'il est absent. Appelé aussi bien par /attempt que par /finish.
 */
export async function resolveBestPossible(dayKey: string): Promise<number> {
  const stored = await getDailyPuzzle(dayKey);
  if (stored) return stored.bestPossible;

  const [best] = solve(dayKey);
  const puzzle: DailyPuzzle = {
    bestPossible: best?.score.total ?? 0,
    bestWord: best?.word ?? "",
  };
  await upsertDailyPuzzle(dayKey, puzzle);
  return puzzle.bestPossible;
}

/** Renvoie le mot solution et le top 10. Réservé à la fin de partie. */
export async function resolveAnswers(
  dayKey: string,
): Promise<{ bestWord: string; topWords: SolverResult[] }> {
  await resolveBestPossible(dayKey);
  const results = solve(dayKey);
  return { bestWord: results[0]?.word ?? "", topWords: results };
}
```

- [ ] **Step 2: Vérifier la compilation**

Run: `npx tsc -b --noEmit`
Expected: aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add server/daily.ts
git commit -m "feat(server): résolution et mise en cache du puzzle du jour"
```

---

### Tâche B7 : Nouvelles routes API

**Files:**
- Modify: `server/app.ts` (réécriture complète du corps après la configuration CORS)

- [ ] **Step 1: Réécrire `server/app.ts`**

Conserver l'en-tête existant jusqu'à `corsOrigins()` inclus, en retirant
`"X-Username"` de `allowHeaders`, puis remplacer tout le reste par :

```ts
import { Hono } from "hono";
import type { MiddlewareHandler } from "hono";
import { cors } from "hono/cors";
import { ensureSchema, insertPlay, getDailyPercentile } from "./repo.js";
import { resolveBestPossible, resolveAnswers } from "./daily.js";
import { getTodayKey } from "../src/engine/dayKey.js";

const app = new Hono().basePath("/api");

// … corsOrigins() inchangé …

app.use("*", cors({ origin: corsOrigins(), allowHeaders: ["Content-Type"] }));

let schemaReady: Promise<void> | undefined;
const withDb: MiddlewareHandler = async (_c, next) => {
  schemaReady ??= ensureSchema();
  await schemaReady;
  await next();
};

app.get("/health", (c) => c.json({ ok: true, t: new Date().toISOString() }));

app.onError((err, c) => {
  console.error("[server error]", err);
  return c.json({ error: "Erreur serveur." }, 500);
});

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-fA-F-]{36}$/;

/** Refuse une date malformée ou postérieure au jour courant à Paris. */
function invalidDate(date: string): boolean {
  return !DATE_RE.test(date) || date > getTodayKey();
}

// ─── POST /api/daily/:date/attempt ───────────────────────────────────────────

app.post("/daily/:date/attempt", withDb, async (c) => {
  const date = c.req.param("date");
  if (invalidDate(date)) return c.json({ error: "Date invalide." }, 400);

  const body = (await c.req.json().catch(() => ({}))) as {
    deviceId?: string;
    attemptNum?: number;
    score?: number;
  };

  if (typeof body.deviceId !== "string" || !UUID_RE.test(body.deviceId)) {
    return c.json({ error: "Identifiant d'appareil invalide." }, 400);
  }
  if (
    typeof body.attemptNum !== "number" ||
    body.attemptNum < 1 ||
    body.attemptNum > 3
  ) {
    return c.json({ error: "Numéro d'essai hors limites." }, 400);
  }
  if (typeof body.score !== "number" || body.score < 0) {
    return c.json({ error: "Score invalide." }, 400);
  }

  const bestPossible = await resolveBestPossible(date);
  await insertPlay(body.deviceId, date, body.attemptNum, body.score);

  return c.json({ bestPossible });
});

// ─── POST /api/daily/:date/finish ────────────────────────────────────────────

app.post("/daily/:date/finish", withDb, async (c) => {
  const date = c.req.param("date");
  if (invalidDate(date)) return c.json({ error: "Date invalide." }, 400);

  const body = (await c.req.json().catch(() => ({}))) as { score?: number };
  const score = typeof body.score === "number" && body.score >= 0 ? body.score : 0;

  const { bestWord, topWords } = await resolveAnswers(date);
  const { percentile, playersToday } = await getDailyPercentile(date, score);

  return c.json({ bestWord, topWords, percentile, playersToday });
});

// ─── GET /api/training ───────────────────────────────────────────────────────

app.get("/training", withDb, async (c) => {
  const { createDraw } = await import("../src/engine/RoundService.js");
  const { solveTopN } = await import("../src/engine/solver.js");
  const { solverDictionary } = await import("./dictionary.js");

  const draw = createDraw();
  const top3 = solveTopN(draw, solverDictionary, 3);
  return c.json({ draw, top3 });
});

export { app };
```

- [ ] **Step 2: Démarrer le serveur en local**

Run: `npm run server`
Expected: démarrage sans erreur, avertissement « Base en mémoire ».

- [ ] **Step 3: Vérifier les routes à la main**

```bash
curl -s localhost:3001/api/health
curl -s -X POST localhost:3001/api/daily/2026-09-10/attempt -H 'Content-Type: application/json' -d '{"deviceId":"11111111-1111-1111-1111-111111111111","attemptNum":1,"score":10}'
curl -s -X POST localhost:3001/api/daily/2026-09-10/finish -H 'Content-Type: application/json' -d '{"score":10}'
curl -s localhost:3001/api/training
```

Expected :
- `health` → `{"ok":true,…}`
- `attempt` → `{"bestPossible":<entier > 0>}`
- `finish` → `{"bestWord":"…","topWords":[…10 entrées…],"percentile":null,"playersToday":1}`
- `training` → `{"draw":["…"],"top3":[…3 entrées…]}`

- [ ] **Step 4: Vérifier le rejet d'une date future**

```bash
curl -s -X POST localhost:3001/api/daily/2099-01-01/attempt -H 'Content-Type: application/json' -d '{"deviceId":"11111111-1111-1111-1111-111111111111","attemptNum":1,"score":10}'
```

Expected: `{"error":"Date invalide."}` avec un statut 400.

- [ ] **Step 5: Commit**

```bash
git add server/app.ts
git commit -m "feat(api): routes daily/attempt, daily/finish et training"
```

---

## Phase C — Client

### Tâche C1 : Client API

**Files:**
- Modify: `src/services/api.ts` (réécriture complète)
- Create: `src/services/pending.ts`

- [ ] **Step 1: Réécrire `src/services/api.ts`**

```ts
import type { Draw } from "../engine/types";
import type { SolverResult } from "../engine/solver";

const BASE = import.meta.env.VITE_API_URL ?? "";
const MAX_ATTEMPTS = 3;

/**
 * Réessaie sur erreur réseau et 5xx, jamais sur 4xx.
 * Reprend la stratégie introduite pour fiabiliser iOS Safari (commit 2adf39b).
 */
async function postWithRetry<T>(path: string, body: unknown): Promise<T | null> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      await new Promise<void>((r) => setTimeout(r, attempt * 1000));
    }
    try {
      const res = await fetch(`${BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) return (await res.json()) as T;
      if (res.status >= 400 && res.status < 500) {
        console.error(`[api] ${path} → ${res.status}, abandon`);
        return null;
      }
      console.error(`[api] ${path} → ${res.status}, tentative ${attempt + 1}/${MAX_ATTEMPTS}`);
    } catch (err) {
      console.error(`[api] ${path} — erreur réseau, tentative ${attempt + 1}/${MAX_ATTEMPTS}`, err);
    }
  }
  return null;
}

export type AttemptResponse = { bestPossible: number };

/** Enregistre un essai et renvoie le dénominateur du jour. null si indisponible. */
export function submitAttempt(payload: {
  date: string;
  deviceId: string;
  attemptNum: number;
  score: number;
}): Promise<AttemptResponse | null> {
  const { date, ...body } = payload;
  return postWithRetry<AttemptResponse>(`/api/daily/${date}/attempt`, body);
}

export type FinishResponse = {
  bestWord: string;
  topWords: SolverResult[];
  percentile: number | null;
  playersToday: number;
};

/** Récupère la solution et le percentile. Idempotent : n'écrit rien. */
export function fetchFinish(
  date: string,
  score: number,
): Promise<FinishResponse | null> {
  return postWithRetry<FinishResponse>(`/api/daily/${date}/finish`, { score });
}

export type TrainingRound = { draw: Draw; top3: SolverResult[] };

export async function fetchTrainingRound(): Promise<TrainingRound | null> {
  try {
    const res = await fetch(`${BASE}/api/training`);
    if (!res.ok) return null;
    return (await res.json()) as TrainingRound;
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Créer la file des essais non transmis**

```ts
export const PENDING_STORAGE_KEY = "quadra:pending";

export type PendingAttempt = {
  date: string;
  attemptNum: number;
  score: number;
};

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
    // Stockage indisponible : la file est perdue, la partie reste jouable.
  }
}

export function enqueuePending(item: PendingAttempt): void {
  savePending([...loadPending(), item]);
}

export function clearPending(): void {
  savePending([]);
}
```

- [ ] **Step 3: Vérifier la compilation**

Run: `npx tsc -b --noEmit`
Expected: erreurs attendues dans `UsernameModal.tsx`, `Leaderboard.tsx` et
`useDailyGame.ts` — elles disparaîtront aux tâches C2 et C4.

- [ ] **Step 4: Commit**

```bash
git add src/services/api.ts src/services/pending.ts
git commit -m "feat(services): client API attempt/finish/training et file d'attente"
```

---

### Tâche C2 : Hook de la partie du jour

**Files:**
- Modify: `src/hooks/useDailyGame.ts` (réécriture complète)
- Modify: `src/services/dailyState.ts`

- [ ] **Step 1: Adapter `src/services/dailyState.ts`**

Retirer la fonction `getTodayKey` (elle vit désormais dans `src/engine/dayKey.ts`)
et son commentaire. Enrichir `AttemptRecord` du `ScoreResult` complet — le texte
de partage a besoin de `usedLetters` et `orderBonus`, que `total` seul ne fournit
pas :

```ts
export type AttemptRecord = {
  rawWord: string;
  normalizedWord: string;
  total: number;
  score: ScoreResult | null;   // requis par buildShareText
};
```

Ajouter l'import : `import type { ScoreResult } from "../engine/types";`

Remplacer le type `DailyState` par :

```ts
export type DailyState = {
  _v: 2;                        // 2 : deviceId, percentile, plus de pseudo
  date: string;                 // "YYYY-MM-DD" Europe/Paris
  draw: Draw;
  attempts: AttemptRecord[];
  bestPossibleScore: number;    // -1 tant que le serveur n'a pas répondu
  bestWord: string | null;
  topWords: SolverResult[];
  completed: boolean;
  revealed: boolean;
  percentile: number | null;
  playersToday: number;
  statsApplied: boolean;        // évite de compter deux fois la même partie
};
```

Adapter `loadDailyState` (`parsed._v !== 2`), `createFreshState` (nouveaux champs
à `[]`, `false`, `null`, `0`, `false`) et l'import de `getTodayKey`, qui vient
maintenant de `../engine/dayKey`. Ajouter l'import de `SolverResult`.

Le passage de `_v: 1` à `_v: 2` invalide les parties en cours des joueurs
existants — acceptable, la partie du jour est perdue une seule fois.

- [ ] **Step 2: Réécrire `src/hooks/useDailyGame.ts`**

```ts
import { useState, useEffect, useCallback } from "react";
import type { Draw } from "../engine/types";
import type { RoundResult } from "../engine/RoundService";
import type { SolverResult } from "../engine/solver";
import { evaluateRound } from "../engine/RoundService";
import { normalizeWord } from "../engine/score";
import { mainValidator } from "../engine/mainDictionary";
import { getDailyDraw } from "../engine/draw";
import { getTodayKey } from "../engine/dayKey";
import {
  loadDailyState, saveDailyState, createFreshState,
  type AttemptRecord, type DailyState,
} from "../services/dailyState";
import { submitAttempt, fetchFinish } from "../services/api";
import { getDeviceId } from "../services/deviceId";
import { loadStats, saveStats, applyResult } from "../services/stats";
import { enqueuePending, loadPending, clearPending } from "../services/pending";

type Phase =
  | { kind: "playing" }
  | { kind: "attempt_shown" }
  | { kind: "completed" }
  | { kind: "revealed" };

const MAX_ATTEMPTS = 3;

export type GameState = {
  draw: Draw;
  phase: Phase;
  attempts: AttemptRecord[];
  bestPossibleScore: number;
  bestWord: string | null;
  topWords: SolverResult[];
  percentile: number | null;
  playersToday: number;
  inputWord: string;
  setInputWord: (w: string) => void;
  isInputValid: boolean | null;
  submitWord: () => void;
  retryRound: () => void;
  revealAnswers: () => void;
  currentAttemptResult: RoundResult | null;
};

export function useDailyGame(): GameState {
  const today = getTodayKey();
  const [state, setState] = useState<DailyState>(() =>
    createFreshState(today, getDailyDraw(today)),
  );
  const [phase, setPhase] = useState<Phase>({ kind: "playing" });
  const [inputWord, setInputWord] = useState("");
  const [isInputValid, setIsInputValid] = useState<boolean | null>(null);
  const [currentAttemptResult, setCurrentAttemptResult] = useState<RoundResult | null>(null);

  // Restauration + rejeu de la file d'attente au montage
  useEffect(() => {
    const saved = loadDailyState();
    if (saved) {
      setState(saved);
      setPhase(
        saved.revealed  ? { kind: "revealed"      } :
        saved.completed ? { kind: "completed"     } :
        saved.attempts.length > 0 ? { kind: "attempt_shown" } :
                                    { kind: "playing" },
      );
    }

    const queue = loadPending();
    if (queue.length === 0) return;
    const deviceId = getDeviceId();
    void (async () => {
      for (const item of queue) {
        await submitAttempt({ ...item, deviceId });
      }
      clearPending();
    })();
  }, []);

  // Validation différée de la saisie (300 ms)
  useEffect(() => {
    if (inputWord === "") {
      setIsInputValid(null);
      return;
    }
    const timer = setTimeout(() => {
      const normalized = normalizeWord(inputWord).trim();
      setIsInputValid(normalized ? mainValidator(normalized) : null);
    }, 300);
    return () => clearTimeout(timer);
  }, [inputWord]);

  /** Termine la partie : récupère solution, top 10 et percentile, met à jour les stats. */
  const finish = useCallback(
    async (finalState: DailyState, bestScore: number, attemptCount: number) => {
      const answers = await fetchFinish(finalState.date, bestScore);

      const next: DailyState = {
        ...finalState,
        bestWord: answers?.bestWord ?? finalState.bestWord,
        topWords: answers?.topWords ?? finalState.topWords,
        percentile: answers?.percentile ?? null,
        playersToday: answers?.playersToday ?? 0,
      };

      if (!finalState.statsApplied) {
        const stats = applyResult(loadStats(), {
          date: finalState.date,
          score: bestScore,
          bestPossible: finalState.bestPossibleScore >= 0 ? finalState.bestPossibleScore : null,
          attempts: attemptCount,
        });
        saveStats(stats);
        next.statsApplied = true;
      }

      setState(next);
      saveDailyState(next);
    },
    [],
  );

  const submitWord = useCallback(() => {
    const result = evaluateRound(state.draw, inputWord, mainValidator);

    if (!result.isValid) {
      setCurrentAttemptResult(result);
      return;   // un mot invalide ne consomme pas d'essai
    }

    const attempt: AttemptRecord = {
      rawWord: result.rawWord,
      normalizedWord: result.normalizedWord,
      total: result.total,
      score: result.score,
    };
    const attempts = [...state.attempts, attempt];
    const attemptNum = attempts.length;
    const deviceId = getDeviceId();

    setCurrentAttemptResult(result);

    void (async () => {
      const res = await submitAttempt({
        date: state.date, deviceId, attemptNum, score: result.total,
      });
      if (res === null) {
        enqueuePending({ date: state.date, attemptNum, score: result.total });
      }

      const bestPossible = res?.bestPossible ?? state.bestPossibleScore;
      const bestScore = Math.max(...attempts.map((a) => a.total));
      const won = bestPossible >= 0 && bestScore >= bestPossible;
      const over = won || attemptNum >= MAX_ATTEMPTS;

      const next: DailyState = {
        ...state,
        attempts,
        bestPossibleScore: bestPossible,
        completed: over,
      };
      setState(next);
      saveDailyState(next);
      setPhase(over ? { kind: "completed" } : { kind: "attempt_shown" });
      if (over) await finish(next, bestScore, attemptNum);
    })();
  }, [state, inputWord, finish]);

  const retryRound = useCallback(() => {
    setInputWord("");
    setIsInputValid(null);
    setCurrentAttemptResult(null);
    setPhase({ kind: "playing" });
  }, []);

  const revealAnswers = useCallback(() => {
    const next: DailyState = { ...state, revealed: true, completed: true };
    setState(next);
    saveDailyState(next);
    setPhase({ kind: "revealed" });
    const bestScore = state.attempts.length
      ? Math.max(...state.attempts.map((a) => a.total))
      : 0;
    void finish(next, bestScore, state.attempts.length);
  }, [state, finish]);

  return {
    draw: state.draw,
    phase,
    attempts: state.attempts,
    bestPossibleScore: state.bestPossibleScore,
    bestWord: state.bestWord,
    topWords: state.topWords,
    percentile: state.percentile,
    playersToday: state.playersToday,
    inputWord, setInputWord, isInputValid,
    submitWord, retryRound, revealAnswers, currentAttemptResult,
  };
}
```

- [ ] **Step 3: Vérifier la compilation**

Run: `npx tsc -b --noEmit`
Expected: plus d'erreur dans `useDailyGame.ts` ; il en reste dans
`Leaderboard.tsx`, `UsernameModal.tsx` et `Solver.tsx`, supprimés en C4.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useDailyGame.ts src/services/dailyState.ts
git commit -m "feat(daily): identité anonyme, percentile serveur et stats locales"
```

---

### Tâche C3 : Hook d'entraînement

**Files:**
- Modify: `src/hooks/useTraining.ts`
- Modify: `src/components/game/SolverResults.tsx` → conserver `SolverResultsList`, supprimer `SolverResultsTable`

- [ ] **Step 1: Modifier `useTraining.ts`**

Remplacer l'import `import { solveTopN, type SolverResult } from "../engine/solver";`
par :

```ts
import type { SolverResult } from "../engine/solver";
import { fetchTrainingRound } from "../services/api";
```

Remplacer `mainValidator, mainDictionary` par `mainValidator` seul, puis remplacer
l'initialisation de `draw`, `submitWord` et `nextRound` par :

```ts
  const [draw, setDraw] = useState<Draw>([]);
  const [pendingTop3, setPendingTop3] = useState<SolverResult[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRound = useCallback(async () => {
    setLoading(true);
    const round = await fetchTrainingRound();
    if (round) {
      setDraw(round.draw);
      setPendingTop3(round.top3);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void loadRound(); }, [loadRound]);

  const submitWord = useCallback(() => {
    const result = evaluateRound(draw, inputWord, mainValidator);
    if (!result.isValid) {
      setCurrentResult(result);
      return;
    }
    setBestPossibleScore(pendingTop3[0]?.score.total ?? 0);
    setTop3(pendingTop3);
    setCurrentResult(result);
    setPhase({ kind: "results" });
  }, [draw, inputWord, pendingTop3]);

  const nextRound = useCallback(() => {
    setInputWord("");
    setIsInputValid(null);
    setCurrentResult(null);
    setBestPossibleScore(-1);
    setTop3([]);
    setPhase({ kind: "playing" });
    void loadRound();
  }, [loadRound]);
```

Ajouter `loading: boolean` au type `TrainingState` et à l'objet retourné.

- [ ] **Step 2: Supprimer `SolverResultsTable`**

Dans `src/components/game/SolverResults.tsx`, supprimer l'export
`SolverResultsTable` (utilisé uniquement par la page Solveur) et ne conserver
que `SolverResultsList`.

- [ ] **Step 3: Afficher l'état de chargement**

Dans `src/pages/Training.tsx`, récupérer `loading` depuis `useTraining()` et,
juste avant le rendu du tirage, ajouter :

```tsx
if (loading) {
  return <p className="text-center text-muted">Chargement du tirage…</p>;
}
```

- [ ] **Step 4: Vérifier la compilation**

Run: `npx tsc -b --noEmit`
Expected: plus d'erreur liée à `useTraining` ni à `SolverResults`.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useTraining.ts src/pages/Training.tsx src/components/game/SolverResults.tsx
git commit -m "feat(training): tirage et top 3 servis par l'API"
```

---

### Tâche C4 : Suppression du pseudo, du classement et du solveur

**Files:**
- Delete: `src/pages/Home.tsx`, `src/pages/Solver.tsx`, `src/pages/Leaderboard.tsx`, `src/components/layout/NavBar.tsx`, `src/components/UsernameModal.tsx`, `src/hooks/useAuth.ts`
- Modify: `src/router.tsx`, `src/components/layout/Layout.tsx`

- [ ] **Step 1: Supprimer les fichiers**

```bash
git rm src/pages/Home.tsx src/pages/Solver.tsx src/pages/Leaderboard.tsx \
       src/components/layout/NavBar.tsx src/components/UsernameModal.tsx \
       src/hooks/useAuth.ts
```

- [ ] **Step 2: Réécrire `src/router.tsx`**

```tsx
import { createBrowserRouter } from "react-router-dom";
import App from "./App";
import DailyGame from "./pages/DailyGame";
import Training from "./pages/Training";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true,          element: <DailyGame /> },
      { path: "entrainement", element: <Training />  },
    ],
  },
]);
```

- [ ] **Step 3: Réécrire `src/components/layout/Layout.tsx`**

```tsx
import { Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas overflow-x-hidden">
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Vérifier la compilation et le lint**

Run: `npx tsc -b --noEmit && npm run lint`
Expected: aucune erreur.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: suppression du pseudo, du classement et du solveur public"
```

---

### Tâche C5 : Modale réutilisable et règles

**Files:**
- Create: `src/components/ui/Modal.tsx`
- Create: `src/components/modals/RulesModal.tsx`
- Delete: `src/pages/Rules.tsx`

- [ ] **Step 1: Créer la coquille de modale**

```tsx
import { useEffect, type ReactNode } from "react";

type ModalProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function Modal({ title, onClose, children }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-surface p-6 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold text-fg text-xl">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="text-muted hover:text-fg text-2xl leading-none"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Créer `RulesModal.tsx`**

Déplacer le corps de `src/pages/Rules.tsx` — le rendu typé de `rules.json` et
ses sous-composants — dans `src/components/modals/RulesModal.tsx`, en
enveloppant le contenu dans `<Modal title="Règles" onClose={onClose}>` et en
exposant :

```tsx
export function RulesModal({ onClose }: { onClose: () => void }) { /* … */ }
```

Puis : `git rm src/pages/Rules.tsx`

- [ ] **Step 3: Vérifier la compilation**

Run: `npx tsc -b --noEmit`
Expected: aucune erreur.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(ui): modale réutilisable et règles en modale"
```

---

### Tâche C6 : Modale de statistiques

**Files:**
- Create: `src/components/modals/StatsModal.tsx`
- Modify: `src/services/stats.ts`

- [ ] **Step 1: Exposer la disponibilité du stockage**

Sans ça, un joueur dont le stockage est bloqué (Safari iOS en navigation privée)
verrait des compteurs à zéro et croirait avoir perdu ses statistiques. Ajouter à
`src/services/stats.ts` :

```ts
/**
 * Teste si localStorage est réellement utilisable. Distingue « nouveau joueur »
 * de « stockage bloqué », deux situations qui produisent les mêmes stats vides.
 */
export function isStatsStorageAvailable(): boolean {
  try {
    const probe = "quadra:probe";
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 2: Créer le composant**

```tsx
import { Modal } from "../ui/Modal";
import { loadStats, isStatsStorageAvailable } from "../../services/stats";

function Figure({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="text-center">
      <div className="font-bold text-fg text-2xl">{value}</div>
      <div className="text-muted text-xs">{label}</div>
    </div>
  );
}

export function StatsModal({ onClose }: { onClose: () => void }) {
  if (!isStatsStorageAvailable()) {
    return (
      <Modal title="Statistiques" onClose={onClose}>
        <p className="text-muted text-sm">
          Ton navigateur bloque le stockage local : tes statistiques et ta série ne
          peuvent pas être conservées d'une session à l'autre. En navigation privée,
          c'est normal. Tu peux quand même jouer chaque jour.
        </p>
      </Modal>
    );
  }

  const stats = loadStats();
  const maxBar = Math.max(1, ...stats.attemptDistribution);
  const accuracy =
    stats.accuracyCount > 0
      ? `${Math.round((stats.accuracySum / stats.accuracyCount) * 100)} %`
      : "—";

  return (
    <Modal title="Statistiques" onClose={onClose}>
      <div className="mb-6 grid grid-cols-4 gap-2">
        <Figure value={stats.gamesPlayed} label="parties" />
        <Figure value={stats.currentStreak} label="série" />
        <Figure value={stats.maxStreak} label="record" />
        <Figure value={accuracy} label="précision" />
      </div>

      <h3 className="mb-2 font-bold text-fg text-sm">Répartition des essais</h3>
      <div className="mb-6 space-y-1">
        {stats.attemptDistribution.map((count, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-4 text-muted text-sm">{i + 1}</span>
            <div
              className="rounded bg-primary px-2 py-0.5 text-right font-mono text-canvas text-xs"
              style={{ width: `${Math.max(8, (count / maxBar) * 100)}%` }}
            >
              {count}
            </div>
          </div>
        ))}
      </div>

      <p className="text-muted text-sm">
        {stats.perfectCount} partie{stats.perfectCount > 1 ? "s" : ""} parfaite
        {stats.perfectCount > 1 ? "s" : ""}
      </p>
    </Modal>
  );
}
```

- [ ] **Step 3: Vérifier la compilation**

Run: `npx tsc -b --noEmit`
Expected: aucune erreur.

- [ ] **Step 4: Commit**

```bash
git add src/components/modals/StatsModal.tsx src/services/stats.ts
git commit -m "feat(ui): modale de statistiques"
```

---

### Tâche C7 : Bouton de partage et écran unique

**Files:**
- Create: `src/components/game/ShareButton.tsx`
- Modify: `src/pages/DailyGame.tsx`

- [ ] **Step 1: Créer `ShareButton.tsx`**

```tsx
import { useState } from "react";
import { Button } from "../ui/Button";
import { buildShareText, type ShareInput } from "../../services/share";

export function ShareButton({ input }: { input: ShareInput }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const text = buildShareText(input);
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // L'utilisateur a annulé, ou le partage natif a échoué : on copie.
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error("[share] copie impossible");
    }
  }

  return (
    <Button variant="primary" onClick={() => void share()}>
      {copied ? "Copié !" : "Partager"}
    </Button>
  );
}
```

- [ ] **Step 2: Câbler l'écran de jeu**

Dans `src/pages/DailyGame.tsx` :

1. Ajouter l'état des modales et les trois icônes d'en-tête :

```tsx
const [modal, setModal] = useState<"rules" | "stats" | null>(null);
```

```tsx
<header className="mb-6 flex items-center justify-between">
  <button onClick={() => setModal("rules")} aria-label="Règles" className="text-muted hover:text-fg">?</button>
  <h1 className="font-bold text-fg text-2xl">QUADRA</h1>
  <button onClick={() => setModal("stats")} aria-label="Statistiques" className="text-muted hover:text-fg">📊</button>
</header>

{modal === "rules" && <RulesModal onClose={() => setModal(null)} />}
{modal === "stats" && <StatsModal onClose={() => setModal(null)} />}
```

2. Dans les blocs `phase.kind === "completed"` et `phase.kind === "revealed"`,
   remplacer le lien vers le classement par le bouton de partage et l'accès à
   l'entraînement :

```tsx
{bestAttempt && (
  <ShareButton
    input={{
      puzzleNumber: puzzleNumber(getTodayKey()),
      score: bestAttempt.total,
      bestPossible: bestPossibleScore >= 0 ? bestPossibleScore : null,
      draw,
      usedLetters: bestAttempt.score?.usedLetters ?? [],
      orderBonus: bestAttempt.score?.orderBonus ?? false,
      currentStreak: loadStats().currentStreak,
      percentile,
    }}
  />
)}
<Link to="/entrainement">
  <Button variant="ghost">S'entraîner</Button>
</Link>
```

3. Afficher le percentile sous le score :

```tsx
{percentile !== null ? (
  <p className="text-muted text-sm">
    Mieux que {Math.round(percentile * 100)} % des joueurs aujourd'hui
  </p>
) : (
  <p className="text-muted text-sm">
    {playersToday} joueur{playersToday > 1 ? "s" : ""} aujourd'hui
  </p>
)}
```

4. Ajouter les imports nécessaires en tête de `DailyGame.tsx` :

```tsx
import { Link } from "react-router-dom";
import { puzzleNumber } from "../engine/dayKey";
import { getTodayKey } from "../engine/dayKey";
import { loadStats } from "../services/stats";
import { RulesModal } from "../components/modals/RulesModal";
import { StatsModal } from "../components/modals/StatsModal";
import { ShareButton } from "../components/game/ShareButton";
```

`bestAttempt` se calcule ainsi, en amont du rendu :

```tsx
const bestAttempt = attempts.length
  ? attempts.reduce((a, b) => (b.total > a.total ? b : a))
  : null;
```

- [ ] **Step 3: Lancer l'application et vérifier à la main**

Run: `npm run dev` (et `npm run server` dans un second terminal)

Vérifier :
- la racine `/` ouvre directement le tirage du jour ;
- les modales règles et stats s'ouvrent et se ferment (croix, Échap, clic hors zone) ;
- après trois essais, le bouton Partager copie un texte de trois lignes ;
- `/entrainement` charge un tirage.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(ui): écran unique, modales et bouton de partage"
```

---

## Phase D — Plateforme

### Tâche D1 : Dictionnaire en texte brut et chargement différé

**Files:**
- Modify: `scripts/build-dictionary.ts`
- Modify: `src/engine/mainDictionary.ts`

- [ ] **Step 1: Écrire les dictionnaires client en texte brut**

Dans `scripts/build-dictionary.ts`, remplacer l'écriture JSON du dictionnaire
client par une écriture texte, un mot par ligne :

```ts
await writeFile(OUT_PATH.replace(/\.json$/, ".txt"), words.join("\n"));
```

Faire de même pour le supplément. Supprimer ensuite les anciens `.json` client
(garder `server/data/solver-words.json` en JSON, il n'est pas dans le bundle).

- [ ] **Step 2: Rendre `mainDictionary` asynchrone**

```ts
// Source principale : LEFFF 3.4 — INRIA/Alexina
// Supplément : Dicollecte/Hunspell fr_FR (MPL-2.0)
// Généré par scripts/build-dictionary.ts
import {
  createSetDictionary,
  createWordValidatorFromDictionary,
  type Dictionary,
} from "./DictionaryService";
import type { WordValidator } from "./types";

let cached: Dictionary | null = null;

/**
 * Charge les dictionnaires à la demande. Le tirage s'affiche immédiatement ;
 * le dictionnaire arrive pendant que le joueur réfléchit.
 */
export async function loadMainDictionary(): Promise<Dictionary> {
  if (cached) return cached;
  const [lefff, supplement] = await Promise.all([
    import("./data/lefff-words.txt?raw").then((m) => m.default),
    import("./data/supplement-words.txt?raw").then((m) => m.default),
  ]);
  cached = createSetDictionary([
    ...lefff.split("\n"),
    ...supplement.split("\n"),
  ]);
  return cached;
}

/** Valide un mot ; renvoie false tant que le dictionnaire n'est pas chargé. */
export function mainValidator(normalizedWord: string): boolean {
  return cached ? cached.has(normalizedWord) : false;
}

export function isDictionaryReady(): boolean {
  return cached !== null;
}
```

- [ ] **Step 3: Déclencher le chargement dans les deux hooks**

Dans `useDailyGame` et `useTraining`, ajouter au montage :

```ts
const [dictReady, setDictReady] = useState(isDictionaryReady());

useEffect(() => {
  void loadMainDictionary().then(() => setDictReady(true));
}, []);
```

et désactiver la soumission tant que `dictReady` est faux (exposer `dictReady`
dans l'état retourné et le brancher sur le bouton de `WordInput`).

- [ ] **Step 4: Vérifier le poids du bundle**

Run: `npm run build`
Expected: le chunk principal ne contient plus les dictionnaires ; ils
apparaissent comme des ressources séparées.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "perf(dict): dictionnaires en texte brut et chargement différé"
```

---

### Tâche D2 : PWA

**Files:**
- Modify: `package.json`, `vite.config.ts`

- [ ] **Step 1: Installer le plugin**

```bash
npm install -D vite-plugin-pwa
```

- [ ] **Step 2: Configurer `vite.config.ts`**

Ajouter à la liste des plugins :

```ts
VitePWA({
  registerType: "autoUpdate",
  includeAssets: ["favicon.png", "apple-touch-icon.png"],
  manifest: {
    name: "Quadra",
    short_name: "Quadra",
    description: "Le jeu de mots quotidien. Un tirage, trois essais, chaque jour.",
    lang: "fr",
    start_url: "/",
    display: "standalone",
    background_color: "#0f0f0f",
    theme_color: "#0f0f0f",
    icons: [
      { src: "/logo.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
    ],
  },
  workbox: {
    // Les dictionnaires dépassent la limite par défaut de 2 Mo.
    maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
  },
})
```

- [ ] **Step 3: Vérifier**

Run: `npm run build && npm run preview`
Expected: `dist/manifest.webmanifest` et `dist/sw.js` présents ; l'application
est proposée à l'installation dans Chrome.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(pwa): manifest, service worker et installation hors-ligne"
```

---

### Tâche D3 : Métadonnées Open Graph

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Compléter l'en-tête**

Remplacer la ligne `og:image` isolée par :

```html
<meta name="description" content="Le jeu de mots quotidien. Un tirage de quatre lettres, trois essais, un nouveau défi chaque jour." />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Quadra" />
<meta property="og:title" content="Quadra — le jeu de mots quotidien" />
<meta property="og:description" content="Un tirage de quatre lettres, trois essais, un nouveau défi chaque jour." />
<meta property="og:url" content="https://quadra-mots.fr" />
<meta property="og:image" content="https://quadra-mots.fr/logo-wordmark.png" />
<meta name="twitter:card" content="summary_large_image" />
```

- [ ] **Step 2: Vérifier**

Run: `npm run build`
Expected: les balises apparaissent dans `dist/index.html`.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat(seo): métadonnées Open Graph pour les liens partagés"
```

---

### Tâche D4 : Mesure d'audience

Sans cette mesure, aucune décision ultérieure sur la publicité n'est possible :
la rétention à J+7 est la métrique que toute cette refonte cherche à améliorer.
Vercel Analytics ne pose pas de cookie, donc n'impose pas de bandeau de consentement.

**Files:**
- Modify: `package.json`, `src/App.tsx`

- [ ] **Step 1: Installer le paquet**

```bash
npm install @vercel/analytics
```

- [ ] **Step 2: Monter le composant**

```tsx
import { Analytics } from "@vercel/analytics/react";
import Layout from "./components/layout/Layout";

// Racine de l'arbre de routes. Layout rend la page active via son <Outlet />.
export default function App() {
  return (
    <>
      <Layout />
      <Analytics />
    </>
  );
}
```

- [ ] **Step 3: Vérifier**

Run: `npm run build`
Expected: aucune erreur de compilation.

En local, `@vercel/analytics` n'envoie rien et journalise un avertissement en
console : c'est le comportement attendu hors déploiement.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/App.tsx
git commit -m "feat(analytics): mesure d'audience Vercel sans cookie"
```

---

### Tâche D5 : Mise à jour de la documentation

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Corriger les cinq points périmés**

- Backend : remplacer la description SQLite + `server/db.ts` par **Vercel + Neon**
  via `api/[[...route]].ts`, avec `server/repo.ts`, `server/daily.ts`,
  `server/dictionary.ts`.
- Dictionnaire : remplacer `an-array-of-french-words` par **LEFFF 3.4 + supplément
  Dicollecte**, avec la distinction dictionnaire de validation / dictionnaire du solveur.
- Tableau des composants : retirer `NavBar`, `SolverResultsTable`, `UsernameModal` ;
  ajouter `Modal`, `RulesModal`, `StatsModal`, `ShareButton`.
- Routes : remplacer les six routes par `/` et `/entrainement`.
- Feuille de route : remplacer les jalons M1–M8 par l'état réel, avec le jalon
  « refonte jeu quotidien » marqué fait.

- [ ] **Step 2: Ajouter la section des règles produit**

```markdown
### Règles produit

- **Journée** : bascule à minuit Europe/Paris (`src/engine/dayKey.ts`).
- **Série** : terminer une partie suffit, quel que soit le score. Un jour manqué
  est absorbé par un joker, disponible une fois par fenêtre glissante de 7 jours.
- **Révélation** : « Voir les réponses » maintient la série ; la partie ne compte
  dans le percentile que s'il y a eu au moins un essai.
- **Percentile** : masqué en dessous de 20 joueurs distincts sur la journée.
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: mise à jour de CLAUDE.md après la refonte"
```

---

## Vérification finale

- [ ] **Suite complète**

Run: `npm run test -- --run`
Expected: PASS, aucun test ignoré.

- [ ] **Compilation et lint**

Run: `npm run build && npm run lint`
Expected: aucune erreur.

- [ ] **Parcours manuel**

Avec `npm run dev` et `npm run server` :

1. `/` ouvre le tirage du jour sans aucun écran intermédiaire.
2. Un mot invalide ne consomme pas d'essai.
3. Après trois essais : score, dénominateur, mot solution, top 10.
4. Le bouton Partager produit trois lignes sans révéler le mot.
5. La modale de stats affiche une série à 1 après la première partie.
6. « Voir les réponses » sans aucun essai maintient la série à 1.
7. `/entrainement` charge un tirage et affiche le top 3 après soumission.
8. Serveur coupé : la partie reste jouable, le score s'affiche sans dénominateur.
