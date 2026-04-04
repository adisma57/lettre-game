import words from "an-array-of-french-words";
import { createSetDictionary, createWordValidatorFromDictionary, type Dictionary } from "./DictionaryService";

const dictionary: Dictionary = createSetDictionary(words);

export const mainDictionary = dictionary;
export const mainValidator = createWordValidatorFromDictionary(dictionary);
