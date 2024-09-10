import { tags } from "../utils/functions/getDictionaryTag";

export type BatchItem = {
  baseText: string;
  index: number;
};

export type DBWord = {
  id: string;
  content: string;
};

export type DBKanji = {
  id: string;
  text: string;
  word_id: number;
};

export type DBKana = {
  id: string;
  text: string;
  applies_to_kanji: string;
  word_id: number;
};

export type DBResultEntry = {
  row: DBWord;
  foundInKanji?: boolean;
};

export type RawKanjiEntry = {
  common: boolean;
  text: string;
  tags: Array<keyof typeof tags>;
};

export type RawKanaEntry = {
  common: boolean;
  text: string;
  tags: Array<keyof typeof tags>;
  appliesToKanji: Array<string>;
};

export type RawDictionaryEntry = {
  id: string;
  kanji: RawKanjiEntry[];
  kana: RawKanaEntry[];
  sense: Array<{
    partOfSpeech: Array<keyof typeof tags>;
    appliesToKanji: Array<string>;
    appliesToKana: Array<string>;
    related: Array<string>;
    antonym: Array<string>;
    field: Array<string>;
    dialect: Array<string>;
    misc: Array<string>;
    info: Array<string>;
    languageSource: Array<string>;
    gloss: Array<{
      lang: string;
      gender: string | null;
      type: string | null;
      text: string;
    }>;
  }>;
};

export type FormatedDictionaryEntry = {
  currentWord: RawKanjiEntry | RawKanaEntry | undefined;
  readings?: string[];
  alternatives?: RawKanjiEntry[] | RawKanaEntry[];
  meanings: {
    tags: string;
    gloss: string;
  }[];
};

export type ParsedWordDictionaryEntry = {
  wordBasicForm: string;
  type: "kanji" | "kana";
  fullEntry?: DBWord;
};

export type ParsedWord = {
  text: string;
  dictionaryEntry?: ParsedWordDictionaryEntry;
};
