// src/engine/mainDictionary.ts
import words from "an-array-of-french-words";
import {
  createSetDictionary,
  createWordValidatorFromDictionary,
  type Dictionary,
} from "./DictionaryService";

// words est un Array<string> en minuscules, avec accents
// On laisse createSetDictionary gérer la normalisation.
const dictionary: Dictionary = createSetDictionary(words);

export const mainDictionary = dictionary;
export const mainValidator = createWordValidatorFromDictionary(dictionary);
