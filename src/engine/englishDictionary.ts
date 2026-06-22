import wordList from "an-array-of-english-words";
import {
  createSetDictionary,
  createWordValidatorFromDictionary,
  type Dictionary,
} from "./DictionaryService";

const dictionary: Dictionary = createSetDictionary(wordList as string[]);

export const englishDictionary: Dictionary = dictionary;
export const englishValidator = createWordValidatorFromDictionary(dictionary);
