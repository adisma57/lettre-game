export type Lang = "fr" | "en";

export type Translations = {
  lang: Lang;
  nav: {
    daily: string;
    training: string;
    solver: string;
    archive: string;
    stats: string;
    rules: string;
    menuOpen: string;
    menuClose: string;
  };
  home: {
    tagline: string;
    rulesLink: string;
    daily: { title: string; description: string; cta: string };
    training: { title: string; description: string; cta: string };
    solver: { title: string; description: string; cta: string };
  };
  daily: {
    title: string;
    completed: string;
    bestWord: string;
    comeBack: string;
    bestWords: string;
    notInDict: string;
    attempt: (n: number) => string;
    retry: (remaining: number) => string;
    showMore: (n: number) => string;
    showLess: string;
    dateLocale: string;
  };
  archive: {
    title: string;
    subtitle: string;
    freeBadge: string;
    iapBadge: string;
    playedBadge: string;
    playCta: string;
    replayCta: string;
    backLink: string;
    iapDesc: string;
    dateLocale: string;
  };
  training: {
    title: string;
    subtitle: string;
    yourWord: string;
    notInDict: string;
    retry: string;
    next: string;
  };
  solver: {
    title: string;
    subtitle: string;
    analyse: string;
    reset: string;
    dailyWarning: string;
    resultsFor: (draw: string) => string;
    colWord: string;
    colScore: string;
    colUsed: string;
    colOrder: string;
    colInsert: string;
  };
  stats: {
    title: string;
    subtitle: string;
    sectionDaily: string;
    sectionStreak: string;
    sectionAttempts: string;
    sectionTraining: string;
    avgPerf: string;
    vsMax: string;
    avgDesc: string;
    gamesPlayed: string;
    perfectGames: string;
    bestScore: string;
    perfectRate: string;
    currentStreak: string;
    longestStreak: string;
    consecutiveDays: string;
    attemptsDesc: string;
    trainingPlayed: string;
    trainingAvg: string;
    empty: string;
    resetStats: string;
    resetConfirm: string;
  };
  auth: {
    title: string;
    rules: string;
    placeholder: string;
    submit: string;
    loading: string;
  };
  game: {
    yourScore: string;
    bestPossible: string;
    perfectBadge: string;
    wordPlaceholder: string;
    wordSubmit: string;
    top3Title: string;
    showTop3: string;
    hideTop3: string;
  };
};

const fr: Translations = {
  lang: "fr",
  nav: {
    daily: "Défi du jour",
    training: "Entraînement",
    solver: "Solveur",
    archive: "Archives",
    stats: "Mes stats",
    rules: "Règles",
    menuOpen: "Ouvrir le menu",
    menuClose: "Fermer le menu",
  },
  home: {
    tagline: "Formez le meilleur mot à partir d’un tirage de 4 lettres.",
    rulesLink: "Lire les règles du jeu",
    daily: {
      title: "Défi du jour",
      description: "Un tirage identique pour tous. 3 essais pour battre le meilleur score possible.",
      cta: "Jouer",
    },
    training: {
      title: "Entraînement",
      description: "Tirages aléatoires en boucle. Pas de limite, pas de pression.",
      cta: "S’entraîner",
    },
    solver: {
      title: "Solveur",
      description: "Entrez un tirage et découvrez les 10 meilleurs mots possibles.",
      cta: "Analyser",
    },
  },
  daily: {
    title: "Défi du jour",
    completed: "Partie terminée",
    bestWord: "Meilleur mot :",
    comeBack: "Revenez demain —",
    bestWords: "Meilleurs mots possibles",
    notInDict: "Mot non reconnu dans le dictionnaire.",
    attempt: (n) => `— Essai ${n} —`,
    retry: (n) => `Réessayer (${n} essai${n > 1 ? "s" : ""} restant${n > 1 ? "s" : ""})`,
    showMore: (n) => `▼ Voir les ${n} suivant${n > 1 ? "s" : ""}`,
    showLess: "▲ Masquer",
    dateLocale: "fr-FR",
  },
  archive: {
    title: "Défis passés",
    subtitle: "Rejoue les défis des jours précédents.",
    freeBadge: "Gratuit",
    iapBadge: "Achat requis",
    playedBadge: "Joué",
    playCta: "Jouer",
    replayCta: "Rejouer",
    backLink: "← Archives",
    iapDesc: "Les défis de plus de 3 jours seront disponibles prochainement en achat intégré.",
    dateLocale: "fr-FR",
  },
  training: {
    title: "Entraînement",
    subtitle: "Tirages aléatoires en boucle. Aucune limite.",
    yourWord: "Votre mot",
    notInDict: "Mot non reconnu dans le dictionnaire.",
    retry: "Retenter",
    next: "Prochain tirage →",
  },
  solver: {
    title: "Solveur",
    subtitle: "Entrez un tirage pour découvrir les 10 meilleurs mots possibles.",
    analyse: "Analyser",
    reset: "Réinitialiser",
    dailyWarning: "Ce tirage correspond au défi du jour — utilise le solveur uniquement sur d'autres tirages.",
    resultsFor: (draw) => `Résultats pour le tirage ${draw}`,
    colWord: "Mot",
    colScore: "Score",
    colUsed: "Lettres utilisées",
    colOrder: "Ordre",
    colInsert: "Insertions",
  },
  stats: {
    title: "Mes statistiques",
    subtitle: "Progression locale — mise à jour après chaque partie",
    sectionDaily: "Performance Défi du jour",
    sectionStreak: "Régularité",
    sectionAttempts: "Répartition des essais",
    sectionTraining: "Entraînement",
    avgPerf: "Performance moyenne",
    vsMax: "vs. score max",
    avgDesc: "Score moyen rapporté au meilleur score possible de chaque jour",
    gamesPlayed: "Parties jouées",
    perfectGames: "Scores parfaits",
    bestScore: "Meilleur score",
    perfectRate: "Taux de perfection",
    currentStreak: "Série actuelle",
    longestStreak: "Meilleure série",
    consecutiveDays: "jours consécutifs",
    attemptsDesc: "Nombre d'essais utilisés pour compléter le défi",
    trainingPlayed: "Parties jouées",
    trainingAvg: "Score moyen",
    empty: "Joue ta première partie pour voir tes stats !",
    resetStats: "Réinitialiser les stats",
    resetConfirm: "Remettre toutes les stats à zéro ?",
  },
  auth: {
    title: "Choisissez un pseudo",
    rules: "2–20 caractères, lettres, chiffres, _ ou -",
    placeholder: "MonPseudo",
    submit: "Commencer",
    loading: "…",
  },
  game: {
    yourScore: "Votre score",
    bestPossible: "Meilleur possible",
    perfectBadge: "Score parfait ✓",
    wordPlaceholder: "Entrez un mot...",
    wordSubmit: "Valider",
    top3Title: "Meilleurs mots possibles",
    showTop3: "▼ Voir le top 3",
    hideTop3: "▲ Masquer le top 3",
  },
};

const en: Translations = {
  lang: "en",
  nav: {
    daily: "Daily challenge",
    training: "Training",
    solver: "Solver",
    archive: "Archives",
    stats: "My stats",
    rules: "Rules",
    menuOpen: "Open menu",
    menuClose: "Close menu",
  },
  home: {
    tagline: "Build the best word from a 4-letter draw.",
    rulesLink: "Read the rules",
    daily: {
      title: "Daily challenge",
      description: "The same draw for everyone. 3 attempts to beat the best possible score.",
      cta: "Play",
    },
    training: {
      title: "Training",
      description: "Random draws on repeat. No limit, no pressure.",
      cta: "Train",
    },
    solver: {
      title: "Solver",
      description: "Enter a draw and find the 10 best possible words.",
      cta: "Analyse",
    },
  },
  daily: {
    title: "Daily challenge",
    completed: "Game over",
    bestWord: "Best word:",
    comeBack: "Come back tomorrow —",
    bestWords: "Best possible words",
    notInDict: "Word not found in the dictionary.",
    attempt: (n) => `— Attempt ${n} —`,
    retry: (n) => `Try again (${n} attempt${n > 1 ? "s" : ""} left)`,
    showMore: (n) => `▼ Show ${n} more`,
    showLess: "▲ Hide",
    dateLocale: "en-US",
  },
  archive: {
    title: "Past challenges",
    subtitle: "Replay previous daily challenges.",
    freeBadge: "Free",
    iapBadge: "Purchase required",
    playedBadge: "Played",
    playCta: "Play",
    replayCta: "Replay",
    backLink: "← Archives",
    iapDesc: "Challenges older than 3 days will be available soon as an in-app purchase.",
    dateLocale: "en-US",
  },
  training: {
    title: "Training",
    subtitle: "Random draws on repeat. No limit.",
    yourWord: "Your word",
    notInDict: "Word not found in the dictionary.",
    retry: "Retry",
    next: "Next draw →",
  },
  solver: {
    title: "Solver",
    subtitle: "Enter a draw to find the 10 best possible words.",
    analyse: "Analyse",
    reset: "Reset",
    dailyWarning: "This draw matches today's daily challenge — use the solver on other draws only.",
    resultsFor: (draw) => `Results for draw ${draw}`,
    colWord: "Word",
    colScore: "Score",
    colUsed: "Used letters",
    colOrder: "Order",
    colInsert: "Insertions",
  },
  stats: {
    title: "My statistics",
    subtitle: "Local progress — updated after every game",
    sectionDaily: "Daily challenge performance",
    sectionStreak: "Consistency",
    sectionAttempts: "Attempts breakdown",
    sectionTraining: "Training",
    avgPerf: "Average performance",
    vsMax: "vs. max score",
    avgDesc: "Average score relative to the best possible score each day",
    gamesPlayed: "Games played",
    perfectGames: "Perfect scores",
    bestScore: "Best score",
    perfectRate: "Perfect rate",
    currentStreak: "Current streak",
    longestStreak: "Best streak",
    consecutiveDays: "consecutive days",
    attemptsDesc: "Number of attempts used to complete the challenge",
    trainingPlayed: "Games played",
    trainingAvg: "Average score",
    empty: "Play your first game to see your stats!",
    resetStats: "Reset stats",
    resetConfirm: "Reset all stats to zero?",
  },
  auth: {
    title: "Choose a username",
    rules: "2–20 characters, letters, digits, _ or -",
    placeholder: "MyUsername",
    submit: "Start",
    loading: "…",
  },
  game: {
    yourScore: "Your score",
    bestPossible: "Best possible",
    perfectBadge: "Perfect score ✓",
    wordPlaceholder: "Enter a word...",
    wordSubmit: "Submit",
    top3Title: "Best possible words",
    showTop3: "▼ Show top 3",
    hideTop3: "▲ Hide top 3",
  },
};

export const translations: Record<Lang, Translations> = { fr, en };
