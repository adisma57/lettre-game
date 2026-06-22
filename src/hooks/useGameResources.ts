import { useMemo } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { mainDictionary, mainValidator } from "../engine/mainDictionary";
import { englishDictionary, englishValidator } from "../engine/englishDictionary";
import {
  generateDrawWeighted,
  getDailyDraw,
  WEIGHTED_POOL,
  WEIGHTED_POOL_EN,
} from "../engine/draw";
import type { Dictionary } from "../engine/DictionaryService";
import type { WordValidator } from "../engine/types";
import type { Draw } from "../engine/types";

export type GameResources = {
  dictionary: Dictionary;
  validator: WordValidator;
  generateDraw: () => Draw;
  getDailyDraw: (date?: Date) => Draw;
};

export function useGameResources(): GameResources {
  const { lang } = useLanguage();

  return useMemo<GameResources>(() => {
    if (lang === "en") {
      return {
        dictionary: englishDictionary,
        validator: englishValidator,
        generateDraw: () => generateDrawWeighted(4, WEIGHTED_POOL_EN),
        getDailyDraw: (date) => getDailyDraw(date, WEIGHTED_POOL_EN),
      };
    }
    return {
      dictionary: mainDictionary,
      validator: mainValidator,
      generateDraw: () => generateDrawWeighted(4, WEIGHTED_POOL),
      getDailyDraw: (date) => getDailyDraw(date, WEIGHTED_POOL),
    };
  }, [lang]);
}
