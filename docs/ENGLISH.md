# Quadra EN — dedicated deployment

Work remains on `feat/english-version`. Do not merge it into `main` or promote a preview without a separate release decision.

## What is implemented

- Separate English deployment, no language selector on the French site.
- English daily game, practice (`/practice`), rules with verified English examples, statistics, captions, hashtags, PNG share cards and browser messages.
- Same scoring rules. The day still changes at midnight Europe/Paris, explicitly documented in the English rules.
- English dictionary: `word-list` (exact version in package-lock.json), 274,137 alphabetic forms of at least two letters. Includes British and American spellings. Client validation and server solving use the exact same list. Regenerate with `npm run dictionary:en`; the MIT notice is committed beside the generated JSON.
- English weighted pool: J, K, Q, X, Z have weight 1; all other letters have weight 4. This is a deliberately simple game distribution, not literal English text frequencies. H, W, Y are no longer rare. Source for the English rarity distinction: https://www.norvig.com/mayzner.html . French weights and published French draws remain unchanged.
- English local progress, streaks and pending submissions use `:en` keys. Existing French storage keys remain unchanged.
- English server requires `EN_DATABASE_URL`, never falls back to French `DATABASE_URL` in a deployment. A language header rejects a frontend/backend mismatch.

## Local development (PowerShell)

Terminal 1:

```powershell
$env:GAME_LANGUAGE = 'en'
# Leave EN_DATABASE_URL unset for disposable in-memory testing.
npm run server
```

Terminal 2:

```powershell
npm run dev:en
```

`npm run build` builds French by default. `npm run build:en` builds English. `npm run lint` and `npm exec vitest run` run checks. For a production English build, set `VITE_SITE_URL` to the actual English site URL. Without it, the browser uses its current origin; preview metadata uses VERCEL_URL.

## Isolated hosting prepared

- Vercel project: `quadra-en`, `prj_cnd4GfM0naDzbOusz2RzdkvPOV1e`, team `adisma57s-projects`.
- Preview configuration: `GAME_LANGUAGE=en`, `VITE_GAME_LANGUAGE=en`.
- Neon project: `quadra-en`, `long-sun-64755588`, Frankfurt, free plan.
- Neon preview branch: `english-preview`, `br-holy-bread-b2zaket3`.
- Neon production branch remains empty: `br-young-darkness-b2l74w28`.
- No custom English domain has been selected; none has been purchased or connected.

The secret EN_DATABASE_URL still needs to be transferred from this Neon preview branch to the Vercel EN Preview environment. Automatic approval review blocked this transfer pending explicit user authorization. No secret is committed.

Git auto-deployment is disabled specifically for `feat/english-version` in vercel.json so pushing this experimental branch cannot create an unintended preview in the existing French project. Preview deployment is manual from a checkout linked to `quadra-en`:

```powershell
npx vercel link --project quadra-en --scope adisma57s-projects
npx vercel deploy --scope adisma57s-projects
```

Do not use `--prod` during this preparation. Before a later English production launch, configure its own EN_DATABASE_URL and VITE_SITE_URL and confirm the release separately.

## Validation

- Existing French test suite preserved.
- English tests cover dictionary parity, UK/US forms, rare-letter weighting, deterministic draws, scoring examples, storage namespace, caption URL and an English API attempt/finish flow.
- Browser local check: English daily draw → valid English attempt → reveal answer → saved English statistics → English practice page; no reported browser errors.
- Local browser checks use in-memory server data, not the Neon production database.

The large English list includes uncommon words. This first version is intended for playtesting before deciding whether to narrow the dictionary. Dictionary/weight changes after launch can change solutions; finalize them before publishing permanent daily challenges.
