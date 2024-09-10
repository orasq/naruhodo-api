import { getTokenizer } from "kuromojin";
import sqlite3 from "sqlite3";
import type { BatchItem } from "../lib/types/types";
import { getTextTokens } from "../lib/utils/functions/getTextTokens";
import { mapTokenWithDictionaryEntries } from "../lib/utils/functions/mapTokenWithDictionaryEntries";

const JMDICT_DB_PATH = "src/lib/jmdict/jmdict.db";

export const getTokens = async (paragraphs: BatchItem[]) => {
  // Initialize tokenizer
  getTokenizer();

  // Open database
  const db = new sqlite3.Database(JMDICT_DB_PATH);
  db.run("PRAGMA journal_mode = WAL;");

  const parsedParagraphs = await Promise.all(
    paragraphs.map(async (paragraph) => {
      const tokens = await getTextTokens(paragraph.baseText);

      return {
        ...paragraph,
        parsedText: await mapTokenWithDictionaryEntries(db, tokens),
      };
    }),
  );

  db.close();

  return parsedParagraphs;
};




