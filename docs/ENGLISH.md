# Quadra EN — dedicated deployment

Work remains on `feat/english-version`. Do not merge it into `main`. The English Vercel project now tracks this branch as Production, but production builds remain temporarily blocked pending authorization to configure the production database credential.

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

On 13 September 2026, after explicit user authorization, EN_DATABASE_URL was saved as a sensitive Preview variable in this Vercel project, pointing to the Neon english-preview branch. No secret is committed.

Verified preview: https://quadra-dqk2mw7dk-adisma57s-projects.vercel.app (deployment dpl_GBr1VFtqBd4P8JhtGLkTKAPfxCjj, target Preview). Vercel authentication protects access. The initial deployment that Vercel defaulted to Production on this new project was removed; always specify the Preview target explicitly.

Both projects connect to `adisma57/lettre-game`. Branch filtering is configured separately in each Vercel project's Ignored Build Step (not in shared vercel.json):

- `quadra`: production branch `main`; ignores `feat/english-version` and `en/*`.
- `quadra-en`: production branch `feat/english-version`; accepts this branch and `en/*`, ignores all others. Production builds are temporarily ignored until the production Neon credential transfer is explicitly authorized.
- Use `en/<change>` for English feature previews. Merge tested English changes into `feat/english-version`, never `main`. Other feature branches belong to French previews and merge into `main`.
- French `DATABASE_URL` is now scoped separately: Production uses the existing production connection, all Previews use the former `refonte-jeu-quotidien` test connection. No production credential is needed for local development; local tests use memory.
- English Preview uses `english-preview`; the existing separate English `production` Neon branch is ready, but its connection is not yet stored in Vercel. GAME_LANGUAGE and VITE_GAME_LANGUAGE are set to `en` in both Preview and Production.

To deploy an English preview manually from a checkout linked to `quadra-en`:

```powershell
npx vercel link --project quadra-en --scope adisma57s-projects
npx vercel deploy --target=preview --scope adisma57s-projects
```

Do not use `--prod` until its dedicated EN_DATABASE_URL is configured. The production credential transfer was rejected by automatic approval review because the previous user authorization covered only Preview. After authorization, add that secret, remove only the temporary production condition from the English Ignored Build Step, and verify a deployment. Set VITE_SITE_URL when the permanent English domain is chosen. Do not reuse the Preview database for production.

## Validation

- Existing French test suite preserved.
- English tests cover dictionary parity, UK/US forms, rare-letter weighting, deterministic draws, scoring examples, storage namespace, caption URL and an English API attempt/finish flow.
- Browser local check: English daily draw → valid English attempt → reveal answer → saved English statistics → English practice page; no reported browser errors.
- Local browser checks use in-memory server data, not the Neon production database.
- Live Preview check: health reports English; a browser attempt and answer reveal both return HTTP 200; score 5 is persisted in the dedicated Neon preview branch. Results and statistics render without browser errors. The synthetic player's row was removed after verification.

The large English list includes uncommon words. This first version is intended for playtesting before deciding whether to narrow the dictionary. Dictionary/weight changes after launch can change solutions; finalize them before publishing permanent daily challenges.
