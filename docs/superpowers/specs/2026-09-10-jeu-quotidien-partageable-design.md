# Quadra — Jeu quotidien partageable — Design Spec

**Date :** 2026-09-10
**Base de code :** `origin/main` @ `9f89c63` (3 juillet 2026)

## Objectif

Transformer Quadra en un jeu qu'on lance **une fois par jour, tous les jours**, sans friction
à l'entrée et conçu pour être partagé. Objectif produit retenu : **croissance, avec
monétisation à terme** (pas de publicité dans cette version).

Trois principes qui tranchent tous les arbitrages de ce document :

1. **Zéro friction avant la première partie.** Aucun compte, aucune saisie, aucun bandeau.
2. **La rétention repose sur la série et le percentile.** Tout ce qui casse injustement une
   série fait perdre un joueur, souvent définitivement.
3. **Le partage est le canal d'acquisition.** Le texte partagé ne doit rien divulguer et doit
   tenir sur une ligne.

---

## 1. Périmètre

### Ce qui disparaît

| Élément | Fichiers / objets concernés |
|---|---|
| Pseudo | `src/components/UsernameModal.tsx`, `src/hooks/useAuth.ts`, `POST /api/users`, `GET /api/users/:name/exists` |
| Classement | `src/pages/Leaderboard.tsx`, `GET /api/leaderboard`, `getLeaderboard()` et `LeaderboardRow` dans `server/repo.ts` |
| Solveur public | route `/solver`, `src/pages/Solver.tsx` |
| Navigation | `src/components/layout/NavBar.tsx` |

`src/engine/solver.ts` et `src/engine/findBestWord.ts` **restent dans le dépôt** : ils
deviennent du code serveur (mot du jour, top 10, tirages d'entraînement) et conservent leur
rôle d'outil de vérification du moteur de score. Ils ne sont plus atteignables depuis
l'interface.

### Ce qui reste

- Tout `src/engine/` (`score.ts`, `draw.ts`, `RoundService.ts`, `DictionaryService.ts`) et ses tests.
- Le mode entraînement, en accès secondaire depuis l'écran de fin de partie.
- Le bouton **« Voir les réponses »** et la phase terminale `revealed` (commit `9f89c63`).
- L'affichage du **top 10** en fin de partie (commit `d476e19`) et les **lettres colorées des
  essais précédents** (commit `1468299`).
- Le contenu de `src/content/rules.json`, déplacé dans une modale.
- La machinerie de fiabilité iOS du commit `2adf39b` : retry ×3 avec backoff dans
  `src/services/api.ts`, et reprise au montage via un drapeau de soumission.

---

## 2. Structure de l'application

```
/               → le tirage du jour, directement
/entrainement   → parties aléatoires illimitées
```

Plus de page d'accueil, plus de barre de navigation. L'URL racine ouvre la partie du jour.

En haut de l'écran de jeu, trois actions : **règles**, **stats**, **partage**. Le partage
n'apparaît qu'une fois la partie terminée. Règles et stats s'ouvrent en **modale** par-dessus
le jeu — on ne quitte jamais la partie en cours.

`src/pages/Home.tsx` est supprimé. `src/pages/Rules.tsx` est transformé en composant de
modale ; le rendu typé de `rules.json` et ses sous-composants sont conservés.

---

## 3. Identité anonyme

`crypto.randomUUID()` généré à la première visite, stocké dans `localStorage` sous
`quadra:device`. Jamais affiché, jamais saisi.

Module dédié : `src/services/deviceId.ts` — `getDeviceId(): string` (crée à la volée si absent).

### Fragilité du stockage — traitée explicitement

Le commit `2adf39b` a documenté que `localStorage` **échoue silencieusement sur iOS Safari**
en navigation privée et sous ITP. Comme le `deviceId`, la série et toutes les statistiques y
vivent, il faut assumer trois conséquences :

- **Purge ITP à 7 jours.** Le stockage d'un site *non installé* est effacé après 7 jours sans
  visite. Un joueur quotidien n'est jamais concerné (chaque visite réarme le délai) ; un
  joueur irrégulier perd série et stats. **Installer la PWA exonère de cette purge** — c'est
  un argument central du § 11, pas un confort.
- **Navigation privée.** Le `deviceId` est régénéré à chaque session : le nombre de joueurs
  du jour est légèrement surévalué et le percentile légèrement dilué. Accepté en l'état ;
  aucune parade ne vaut la complexité qu'elle coûterait.
- **Écriture impossible.** `getDeviceId()` et l'accès aux stats sont enveloppés dans
  `try/catch`. En cas d'échec, la partie reste jouable et scorée en mémoire ; seules la
  série et les statistiques sont indisponibles, avec un message explicite dans la modale de
  stats plutôt qu'un compteur à zéro trompeur.

**RGPD :** un identifiant aléatoire servant uniquement à la mesure d'audience agrégée
n'impose pas de bandeau de consentement. Cette analyse devra être refaite le jour où de la
publicité est ajoutée.

---

## 4. La partie du jour

Le format ne change pas : **3 essais, un mot invalide ne consomme pas d'essai, la partie
s'arrête si le joueur atteint le meilleur score possible.** La phase `revealed` reste
terminale.

### Origine des informations

| Moment | Appel | Réponse |
|---|---|---|
| Chargement | *(aucun)* | Tirage généré localement par `getDailyDraw()` — affichage immédiat, y compris hors-ligne |
| Après chaque essai valide | `POST /api/daily/:date/attempt` | `{ bestPossible }` |
| Fin de partie ou révélation | `POST /api/daily/:date/finish` | `{ bestWord, topWords, percentile, playersToday }` |

Le mot solution **et le top 10** ne transitent qu'au `finish`. Ouvrir les outils de
développement en cours de partie ne révèle rien — ce qui n'est pas le cas aujourd'hui, où
`solveTopN` tourne dans le navigateur dès le premier essai.

Le serveur recalcule le tirage à partir de la date avec le même `getDailyDraw()` : le client
ne le lui envoie pas, ce qui rend le serveur autoritatif. La ligne `daily_puzzles` est créée
**paresseusement** au premier `attempt` de la journée — un seul balayage du dictionnaire par
jour, pour tous les joueurs.

La soumission **par essai** conserve le choix fait en amont au commit `5a54435` et fournit la
métrique de croissance qui compte : combien de joueurs abandonnent après le premier essai.

### Règle de révélation

Cliquer sur « Voir les réponses » termine la partie et :

- **maintient la série** — on ne punit pas quelqu'un qui sèche, l'habitude est préservée ;
- **compte dans le percentile s'il y a eu au moins un essai**, pas sinon.

Cette règle ne demande **aucun champ supplémentaire** : avec une ligne par essai, une
révélation sans essai ne crée simplement aucune ligne dans `plays` et se trouve donc exclue
du percentile — numérateur comme dénominateur — automatiquement.

Côté statistiques locales, une révélation sans essai incrémente `gamesPlayed` et la série,
mais ni `accuracySum`, ni `accuracyCount`, ni `perfectCount`, ni `attemptDistribution`.

### Le percentile

**Définition :** part des joueurs de la journée dont le **meilleur score du jour** est
*strictement* inférieur au tien.

```sql
WITH best AS (
  SELECT device_id, MAX(score) AS score
  FROM plays WHERE date = $date GROUP BY device_id
)
SELECT count(*) FILTER (WHERE score < $score)::float / NULLIF(count(*), 0) FROM best
```

Deux garde-fous :

- **En dessous de 20 joueurs distincts sur la journée, le percentile n'est pas affiché.** On
  affiche le nombre de joueurs à la place. Un percentile sur 4 parties est du bruit.
- L'écran de fin **rafraîchit le percentile à chaque ouverture** (nouvel appel `finish`,
  idempotent). Un joueur du matin voit d'abord « 12 joueurs aujourd'hui », puis son
  percentile réel s'il rouvre le soir — ce qui donne une seconde raison d'ouvrir l'app.

### Hors-ligne et échecs réseau

`src/services/api.ts` possède déjà un retry ×3 avec backoff 1 s / 2 s sur les erreurs réseau
et 5xx, sans retry sur 4xx. **On le réutilise tel quel** pour les deux nouvelles routes.

Si `attempt` échoue durablement, la partie reste **jouable et scorée** ; seuls le
dénominateur, le percentile et le top 10 manquent, et l'interface affiche le score brut sans
« /X ».

Sans `bestPossible`, le client ne peut pas détecter l'arrêt anticipé sur score parfait : la
partie hors-ligne se joue alors **toujours sur les 3 essais**. Dégradation acceptable, et
`attemptDistribution` reflète les essais réellement joués.

Les essais non transmis sont mis en file dans `localStorage` sous `quadra:pending` (tableau
d'objets `{ date, attemptNum, score }`) et rejoués au prochain chargement — mécanisme
directement calqué sur le `scoreSubmitted` introduit par `2adf39b`. **La série est mise à jour
localement dans tous les cas** : une coupure réseau ne doit jamais la casser.

---

## 5. La journée et la série

### Bascule de journée

**Minuit Europe/Paris**, avec gestion automatique de l'heure d'été.

`getTodayKey()` quitte `src/services/dailyState.ts` — où il est encore en UTC — pour un
module dédié `src/engine/dayKey.ts`, importable par le client et par le serveur :

```ts
export function getTodayKey(now?: Date): string      // "YYYY-MM-DD" en Europe/Paris
export function daysBetween(a: string, b: string): number
export function puzzleNumber(dayKey: string): number // jours depuis EPOCH, + 1
```

`Intl.DateTimeFormat` avec `timeZone: "Europe/Paris"` pour la conversion — pas de calcul
manuel de décalage.

`getDailyDraw(date)` conserve son LCG semé sur l'entier `YYYYMMDD` mais reçoit désormais la
clé Europe/Paris. **Conséquence : les tirages passés changent.** Sans importance, aucun
historique de tirage n'est conservé côté client.

`EPOCH = "2026-09-10"`. La valeur exacte est sans importance tant qu'elle est figée une fois
pour toutes.

### Règle de série

Terminer une partie suffit à maintenir la série, **quel que soit le score**, révélation
comprise. La série mesure l'habitude, pas la performance.

À la fin d'une partie le jour `D`, avec `écart = daysBetween(lastPlayedDate, D)` :

| Écart | Effet |
|---|---|
| `1` | `currentStreak + 1` |
| `2` | Un jour manqué. Joker disponible → `currentStreak + 1` et consommation du joker. Sinon → `currentStreak = 1` |
| `≥ 3` | `currentStreak = 1` |

Première partie (`lastPlayedDate === null`) → `currentStreak = 1`.

**Joker disponible** = `jokerUsedOn === null` **ou** `daysBetween(jokerUsedOn, D) > 7`.
Fenêtre glissante de 7 jours, un seul champ. `jokerUsedOn` reçoit `D`.

`maxStreak = max(maxStreak, currentStreak)` après application.

---

## 6. Statistiques locales

`localStorage`, clé `quadra:stats`, avec le même garde de version que l'existant :

```ts
type Stats = {
  _v: 1
  gamesPlayed: number
  currentStreak: number
  maxStreak: number
  lastPlayedDate: string | null
  jokerUsedOn: string | null
  scoreSum: number
  accuracySum: number                        // Σ (score / bestPossible)
  accuracyCount: number                      // parties dont la précision est connue
  attemptDistribution: [number, number, number]
  perfectCount: number                       // parties où score === bestPossible
}
```

Affichage dans la modale : parties jouées · série actuelle · meilleure série · **précision
moyenne** (`accuracySum / accuracyCount`, masquée si `accuracyCount === 0`) · répartition des
essais en trois barres · parties parfaites.

La précision moyenne plutôt que le score moyen brut : les tirages n'ont pas la même
difficulté, un 18/20 vaut mieux qu'un 20/28.

**Contrainte d'architecture :** `src/services/stats.ts` expose une fonction **pure**

```ts
export function applyResult(
  stats: Stats,
  result: {
    date: string
    score: number
    bestPossible: number | null   // null si hors-ligne
    attempts: number              // 0 si révélation sans essai
  },
): Stats
```

sans aucun accès à `localStorage`. `loadStats()` et `saveStats()` sont séparées et triviales,
et enveloppées dans `try/catch` (cf. § 3). Toute la logique de série, joker compris, devient
testable en Vitest sans DOM.

La révélation n'est pas un paramètre : elle se traduit intégralement par `attempts === 0`
quand elle est sèche, et par un résultat ordinaire sinon. Aucun drapeau à propager.

**Cas limites :** `bestPossible === null` (hors-ligne) ou `attempts === 0` (révélation sèche)
→ `accuracySum`, `accuracyCount` et `perfectCount` ne bougent pas. `attempts === 0` →
`attemptDistribution` ne bouge pas non plus. `gamesPlayed` et la série sont incrémentés dans
tous les cas.

---

## 7. Partage

### Format retenu

```
Quadra #142 — 21/24 🟧🟧🟧⬜ ✅
Série 7 🔥 · mieux que 68 % des joueurs
https://quadramots.fr
```

- **Quatre cases**, une par lettre du tirage : 🟧 utilisée, ⬜ non utilisée. Dérivées de
  `ScoreResult.usedLetters` (multi-ensemble) confrontées à `ScoreResult.draw`, en consommant
  une occurrence par correspondance pour gérer les doublons.
- **✅** présent si `ScoreResult.orderBonus` est vrai, absent sinon.
- Le fragment « mieux que N % » n'apparaît que si le percentile est disponible (≥ 20 joueurs).
- Longueur de grille **fixe à 4 cases** : contrairement à une grille calquée sur le mot
  trouvé, elle ne divulgue pas la longueur du mot.
- Une partie terminée par révélation partage le score obtenu, sans mention de la révélation.

### Mise en œuvre

`src/services/share.ts`, fonction **pure** :

```ts
export function buildShareText(input: {
  puzzleNumber: number
  score: number
  bestPossible: number | null
  draw: Draw
  usedLetters: string[]
  orderBonus: boolean
  currentStreak: number
  percentile: number | null
}): string
```

Déclenchement : `navigator.share({ text })` si disponible, sinon
`navigator.clipboard.writeText()` avec confirmation visuelle. Aucune génération d'image.

### Métadonnées Open Graph

`index.html` ne contient qu'un `og:image`. À compléter : `og:title`, `og:description`,
`og:url`, `og:type`, `twitter:card` (`summary_large_image`). Chaque lien partagé affiche une
carte — c'est le premier contact de la majorité des nouveaux joueurs.

Le domaine est une **constante unique** partagée par `buildShareText()` et les métadonnées.

---

## 8. Dictionnaires

État actuel, vérifié : `scripts/build-dictionary.ts:76` **exclut déjà les noms propres**
(`pos === "np"`). Le LEFFF est passé à **400 944 formes**, complété par un supplément
Dicollecte de **21 580** (`src/engine/data/supplement-words.json`, commit `c64317c`), soit
**5,7 Mo sur deux fichiers**, chargés en imports statiques synchrones par
`src/engine/mainDictionary.ts`.

Deux problèmes subsistent.

### Dictionnaire du solveur (serveur)

Il reste **4 283 formes à trait d'union** dans le LEFFF, dont des noms de communes composés.
Ce dictionnaire fixe le dénominateur du score de tous les joueurs : il ne doit contenir que
des mots réellement connus. Filtre supplémentaire : **exclure les formes contenant un trait
d'union ou une apostrophe.**

**Vérification obligatoire avant mise en ligne :** exécuter le solveur sur **30 tirages
consécutifs** et relire les 30 mots obtenus. Si des mots inconnus du grand public
apparaissent encore, ajouter une curation par fréquence (croisement avec Lexique 383) dans un
second temps. Cette curation n'est **pas** dans le périmètre : on ne télécharge pas une
source de fréquences avant d'avoir constaté le problème.

### Dictionnaire de validation (client)

Reste volontairement généreux, traits d'union compris — refuser un vrai mot est le pire
défaut possible. Deux optimisations de chargement :

- **Format texte brut** (un mot par ligne) au lieu de JSON, pour les deux fichiers :
  guillemets et virgules économisés, et `split("\n")` est nettement plus rapide que
  `JSON.parse` d'un tableau de 400 000 chaînes.
- **`import()` différé** après le premier rendu : le tirage s'affiche immédiatement, le
  dictionnaire se charge pendant que le joueur réfléchit. `mainDictionary.ts` expose une
  promesse plutôt qu'un singleton synchrone — ce qui impacte `useDailyGame` et `useTraining`,
  qui doivent gérer un état « dictionnaire en cours de chargement » sur le champ de saisie.

Le solveur quittant le client, `solveTopN` n'est plus importé par `useDailyGame` : c'est ce
qui rend le chargement différé indolore, plus rien n'a besoin du dictionnaire avant la
première frappe.

---

## 9. Base de données

### Schéma

```sql
CREATE TABLE IF NOT EXISTS plays (
  id          SERIAL PRIMARY KEY,
  device_id   TEXT    NOT NULL,
  date        TEXT    NOT NULL,
  attempt_num INTEGER NOT NULL,
  score       INTEGER NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (device_id, date, attempt_num)
);

CREATE INDEX IF NOT EXISTS plays_date ON plays (date);

ALTER TABLE daily_puzzles ADD COLUMN IF NOT EXISTS best_word TEXT;
```

Une ligne par essai, contrainte d'unicité `(device_id, date, attempt_num)` — même granularité
que la table `scores` actuelle depuis le commit `5a54435`. L'insertion utilise
`ON CONFLICT DO NOTHING` : rejouer la file `quadra:pending` ne crée pas de doublon.

`daily_puzzles` existe déjà avec `(date, best_possible)`. `best_word` est ajoutée **nullable**,
les lignes existantes restent à `NULL` et sont recalculées à la demande. Le top 10 n'est
**pas** stocké : il se recalcule en même temps que `best_possible` et ne justifie pas une
colonne JSON.

### Données existantes

Un `device_id` ne peut pas être reconstruit depuis un pseudo : **aucune migration n'est
possible**. Plutôt qu'une suppression :

```sql
ALTER TABLE scores RENAME TO scores_archive;
ALTER TABLE users  RENAME TO users_archive;
```

Réversible, sans coût, et ça évite une perte définitive sur un choix qu'on ne peut pas
annuler.

`ensureSchema()` est réécrit en conséquence. Les migrations `ALTER TABLE` accumulées sur
`scores` (ajout de `attempt_num`, suppression de `attempts`, bascule d'index) disparaissent
avec le renommage.

---

## 10. API

Routes en anglais, par cohérence avec `server/app.ts`.

| Route | Corps | Réponse |
|---|---|---|
| `POST /api/daily/:date/attempt` | `{ deviceId, attemptNum, score }` | `{ bestPossible }` |
| `POST /api/daily/:date/finish` | `{ deviceId }` | `{ bestWord, topWords, percentile: number \| null, playersToday }` |
| `GET /api/training` | — | `{ draw, top3 }` |
| `GET /api/health` | — | inchangé |

`topWords` est un `SolverResult[]` de 10 entrées, le type déjà exporté par
`src/engine/solver.ts`.

`finish` est appelé aussi bien à la fin normale qu'à la révélation, et à chaque réouverture de
l'écran de fin pour rafraîchir le percentile. Il n'écrit **jamais** dans `plays` et reste donc
idempotent. Il crée en revanche la ligne `daily_puzzles` si elle est absente, exactement comme
`attempt` : c'est le cas d'une **révélation sans aucun essai**, où aucun `attempt` n'a été
appelé de la journée par ce joueur — et éventuellement le premier de la journée tous joueurs
confondus.

**`GET /api/training` renvoie le tirage et sa solution ensemble.** Le client ne peut jamais
demander la solution d'un tirage de son choix, ce qui referme la faille de divulgation
qu'ouvrait le solveur public — y compris pour le tirage du jour.

Validations : `:date` au format `YYYY-MM-DD` et **jamais dans le futur** ; `deviceId` conforme
au format UUID ; `attemptNum` entre 1 et 3 ; `score` positif ou nul.

Le middleware `withDb` et le gestionnaire d'erreurs global sont conservés. `cors` perd
l'en-tête `X-Username`.

---

## 11. Plateforme

- **Hébergement :** Vercel, inchangé. Neon est déjà branché via `api/[[...route]].ts`.
- **Domaine :** `quadramots.fr` en canonique, `quadra-mots.fr` en redirection (~16 €/an).
  À acheter avant toute communication : un lien partagé ne passe qu'une fois.
- **PWA :** `vite-plugin-pwa`. Les icônes existent déjà dans `public/`. Manifest, écran
  d'accueil, mise en cache de la coquille et du dictionnaire. Ce n'est pas qu'un confort :
  **l'installation exonère de la purge ITP à 7 jours sur iOS** (§ 3), donc c'est ce qui
  protège les séries des joueurs iPhone irréguliers. C'est aussi ce qui rend une application
  Android inutile à ce stade.
- **Mesure :** Vercel Analytics (gratuit, sans cookie, donc sans bandeau). La rétention à J+7
  est la métrique que ce redesign cherche à améliorer ; sans elle, aucune décision ultérieure
  sur la publicité n'est possible.
- **Publicité :** aucune dans cette version. Elle réintroduirait le bandeau de consentement
  que la suppression du pseudo vient d'éliminer, pour un revenu négligeable au volume actuel.

---

## 12. Tests

Le moteur existant et ses tests ne bougent pas. S'ajoutent quatre modules purs, testables
sans DOM ni réseau :

| Module | Cas couverts |
|---|---|
| `src/engine/dayKey.ts` | bascule à minuit Paris ; passage heure d'été et heure d'hiver ; `daysBetween` sur changement de mois et d'année ; `puzzleNumber` |
| `src/services/stats.ts` | `applyResult` : premier jour ; écart 1 ; écart 2 avec et sans joker ; écart ≥ 3 ; joker expiré après 7 jours ; `maxStreak` ; révélation sans essai ; `bestPossible` nul |
| `src/services/share.ts` | `buildShareText` : lettres du tirage en double ; bonus d'ordre présent et absent ; percentile absent ; numéro de partie |
| `server/repo.ts` | percentile sur meilleur score par appareil ; seuil des 20 joueurs ; idempotence de `(device_id, date, attempt_num)` ; création paresseuse de `daily_puzzles` |

Le chemin en mémoire de `server/repo.ts` (actif sans `DATABASE_URL`) est conservé et adapté au
nouveau schéma, ce qui permet de tester l'API sans base.

---

## 13. Documentation

`CLAUDE.md` est périmé sur plusieurs points **antérieurs à cette refonte** et doit être repris
dans le même mouvement :

- il décrit un backend SQLite + Hono local (`server/db.ts`, `server/quadra.sqlite`) alors que
  le projet tourne sur **Vercel + Neon** via `api/[[...route]].ts` ;
- il référence `an-array-of-french-words`, remplacé par le LEFFF puis complété par Dicollecte ;
- il ne mentionne ni `attempt_num`, ni le supplément, ni la phase `revealed`, ni le top 10 ;
- sa feuille de route s'arrête à un jalon M8 « Leaderboard » que cette version supprime.

À mettre à jour : tableau des composants, description du backend, tokens de design (le thème
Ember du commit `f8185b2` a modifié `src/index.css`), et remplacement de la feuille de route
par l'état réel.

---

## Hors périmètre

Explicitement exclus de cette version :

- Curation du dictionnaire du solveur par fréquence (conditionnée à la vérification du § 8).
- Publicité et bandeau de consentement.
- Application Android native.
- Défi entre amis par lien partagé.
- Toute forme de récupération de compte ou de synchronisation multi-appareils.
- Notifications push.
- Stockage du top 10 en base.
