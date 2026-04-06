# Leaderboard Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace avg_score with total_score in the leaderboard, and highlight the current user's row with a subtle blue left border + elevated background.

**Architecture:** Backend computes `SUM(score)` instead of `AVG(score)`; the field is renamed `total_score` throughout the type chain (repo → API service → UI). The highlight is purely frontend: read `localStorage.getItem("auth_username")` once in the component and apply a CSS class to the matching row.

**Tech Stack:** TypeScript, Hono (server), Neon (PostgreSQL), React, Tailwind CSS v4

---

### Task 1: Rename avg_score → total_score in server/repo.ts

**Files:**
- Modify: `server/repo.ts`

- [ ] **Step 1: Update `LeaderboardRow` type**

In `server/repo.ts`, change:
```ts
export type LeaderboardRow = {
  rank: number;
  username: string;
  avg_score: number;
  game_count: number;
  best_score: number;
  created_at: string;
};
```
to:
```ts
export type LeaderboardRow = {
  rank: number;
  username: string;
  total_score: number;
  game_count: number;
  best_score: number;
  created_at: string;
};
```

- [ ] **Step 2: Update `LEADERBOARD_BASE` SQL**

Change:
```ts
const LEADERBOARD_BASE = `
  SELECT
    u.username,
    ROUND(AVG(s.score)::numeric, 1)::float8 AS avg_score,
    COUNT(*)::int                       AS game_count,
    MAX(s.score)                        AS best_score,
    u.created_at                        AS created_at
  FROM scores s
  JOIN users u ON u.id = s.user_id
  GROUP BY u.id, u.username, u.created_at
`;
```
to:
```ts
const LEADERBOARD_BASE = `
  SELECT
    u.username,
    SUM(s.score)::int                   AS total_score,
    COUNT(*)::int                       AS game_count,
    MAX(s.score)                        AS best_score,
    u.created_at                        AS created_at
  FROM scores s
  JOIN users u ON u.id = s.user_id
  GROUP BY u.id, u.username, u.created_at
`;
```

- [ ] **Step 3: Update in-memory backend path**

In the `getLeaderboard` function, inside the `if (isMemoryBackend())` block, find the row-building loop:
```ts
rows.push({
  username: v.username,
  avg_score: Math.round((sum / v.scores.length) * 10) / 10,
  game_count: v.scores.length,
  best_score: Math.max(...v.scores),
  created_at: v.createdAt.toISOString().replace(/\.\d{3}Z$/, "Z"),
});
```
Replace with (remove the division, expose `sum` as `total_score`):
```ts
rows.push({
  username: v.username,
  total_score: sum,
  game_count: v.scores.length,
  best_score: Math.max(...v.scores),
  created_at: v.createdAt.toISOString().replace(/\.\d{3}Z$/, "Z"),
});
```

- [ ] **Step 4: Update sort comparators in the in-memory path**

Find the three sort comparators and replace `avg_score` with `total_score`:
```ts
const cmp =
  sort === "game_count"
    ? (a: Row, b: Row) =>
        b.game_count - a.game_count || b.total_score - a.total_score
    : sort === "account_age"
      ? (a: Row, b: Row) =>
          a.created_at.localeCompare(b.created_at) ||
          b.game_count - a.game_count
      : (a: Row, b: Row) =>
          b.total_score - a.total_score || b.game_count - a.game_count;
```

- [ ] **Step 5: Update SQL sort queries**

In the Neon path, update the three `sql.query` calls:

`sort === "game_count"`:
```ts
raw = (await sql.query(
  `${LEADERBOARD_BASE} ORDER BY game_count DESC, total_score DESC`,
)) as Row[];
```

`sort === "account_age"` — no change needed (sorts by `created_at`).

Default (`total_score`):
```ts
raw = (await sql.query(
  `${LEADERBOARD_BASE} ORDER BY total_score DESC, game_count DESC`,
)) as Row[];
```

- [ ] **Step 6: Update the Neon result mapping**

Find:
```ts
return raw.map((r, i) => ({
  rank: i + 1,
  username: r.username,
  avg_score: r.avg_score,
  game_count: r.game_count,
  best_score: r.best_score,
  created_at: ...
}));
```
Replace `avg_score: r.avg_score` with `total_score: r.total_score`:
```ts
return raw.map((r, i) => ({
  rank: i + 1,
  username: r.username,
  total_score: r.total_score,
  game_count: r.game_count,
  best_score: r.best_score,
  created_at:
    r.created_at instanceof Date
      ? r.created_at.toISOString().replace(/\.\d{3}Z$/, "Z")
      : String(r.created_at),
}));
```

Also update the `Row` type alias just above this mapping:
```ts
type Row = Omit<Omit<LeaderboardRow, "rank">, "created_at"> & {
  created_at: Date | string;
};
```
This type is derived from `LeaderboardRow` so it will pick up `total_score` automatically — no change needed here.

- [ ] **Step 7: Commit**

```bash
git add server/repo.ts
git commit -m "feat(server): replace avg_score with total_score in leaderboard"
```

---

### Task 2: Update API types and sort key in src/services/api.ts

**Files:**
- Modify: `src/services/api.ts`

- [ ] **Step 1: Rename field in `LeaderboardEntry`**

Change:
```ts
export type LeaderboardEntry = {
  rank: number;
  username: string;
  avg_score: number;
  game_count: number;
  best_score: number;
  created_at: string;
};
```
to:
```ts
export type LeaderboardEntry = {
  rank: number;
  username: string;
  total_score: number;
  game_count: number;
  best_score: number;
  created_at: string;
};
```

- [ ] **Step 2: Rename sort literal in `LeaderboardSort`**

Change:
```ts
export type LeaderboardSort = "avg_score" | "game_count" | "account_age";
```
to:
```ts
export type LeaderboardSort = "total_score" | "game_count" | "account_age";
```

- [ ] **Step 3: Commit**

```bash
git add src/services/api.ts
git commit -m "feat(api): rename avg_score → total_score in LeaderboardEntry and LeaderboardSort"
```

---

### Task 3: Update Leaderboard UI — total score + current user highlight

**Files:**
- Modify: `src/pages/Leaderboard.tsx`

- [ ] **Step 1: Add current username read and update sort options**

At the top of the `Leaderboard` function component, add the username read:
```tsx
const currentUsername = localStorage.getItem("auth_username");
```

Update `SORT_OPTIONS` (at the top of the file):
```tsx
const SORT_OPTIONS: { value: LeaderboardSort; label: string }[] = [
  { value: "total_score",  label: "Score total"   },
  { value: "game_count",   label: "Parties jouées" },
  { value: "account_age",  label: "Ancienneté"     },
];
```

Update the default sort state:
```tsx
const [sort, setSort] = useState<LeaderboardSort>("total_score");
```

- [ ] **Step 2: Update column header**

Change:
```tsx
<th className="px-3 py-2 text-right">Moy.</th>
```
to:
```tsx
<th className="px-3 py-2 text-right">Total</th>
```

- [ ] **Step 3: Update row rendering — highlight + total_score field**

Replace the entire `<tr>` element:
```tsx
{rows.map((row) => {
  const isCurrentUser =
    currentUsername != null &&
    row.username.toLowerCase() === currentUsername.toLowerCase();
  return (
    <tr
      key={row.username}
      className={
        isCurrentUser
          ? "border-l-2 border-info bg-elevated"
          : row.rank === 1
            ? "border-l-2 border-primary bg-elevated"
            : ""
      }
    >
      <td className="border-b border-line px-3 py-3 text-muted">
        {row.rank === 1 ? "🥇" : row.rank === 2 ? "🥈" : row.rank === 3 ? "🥉" : row.rank}
      </td>
      <td className="border-b border-line px-3 py-3 font-semibold text-fg">
        {row.username}
      </td>
      <td className="border-b border-line px-3 py-3 text-right font-bold text-primary">
        {row.total_score}
      </td>
      <td className="border-b border-line px-3 py-3 text-right text-muted">
        {row.best_score}
      </td>
      <td className="border-b border-line px-3 py-3 text-right text-muted">
        {row.game_count}
      </td>
    </tr>
  );
})}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npm run build
```
Expected: no type errors. If you see `avg_score` or `"avg_score"` errors, check Tasks 1 and 2 are fully applied.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Leaderboard.tsx
git commit -m "feat(ui): total score column + current user row highlight in leaderboard"
```
