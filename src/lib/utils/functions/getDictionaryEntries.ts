import sqlite3, { type Database } from "sqlite3";
import type { KuromojiToken } from "kuromojin";
import type { DBKana, DBKanji, DBResultEntry, DBWord, ParsedWord, WordToken } from "../../types/types";

const JMDICT_DB_PATH = "src/lib/jmdict/jmdict.db";

export async function getDictionaryEntries(wordTokensArray: WordToken[]) {
 
  const dictionaryEntries = await Promise.all(
    wordTokensArray.map(async (wordTokens) => ({
      ...wordTokens,
      parsedText: await mapTokenWithDictionaryEntries(wordTokens.tokens),
    })),
  );

  return dictionaryEntries;
}

function mapTokenWithDictionaryEntries(
  tokens: KuromojiToken[],
): Promise<ParsedWord[]> {
  return Promise.all(
    tokens.map(async (token) => {
      const entry =
        token.word_type === "UNKNOWN"
          ? undefined
          : await fetchDictionaryEntry(token.basic_form);

      return {
        text: token.surface_form,
        dictionaryEntry: {
          wordBasicForm: token.basic_form,
          type: entry?.foundInKanji ? "kanji" : "kana",
          fullEntry: entry?.row,
        },
      };
    }),
  );
}

async function fetchDictionaryEntry(
  word: string,
): Promise<DBResultEntry | undefined> {
  return new Promise(async (resolve) => {
    // Open database
    const db = new sqlite3.Database(JMDICT_DB_PATH);
    db.run("PRAGMA journal_mode = WAL;");


    const resultRow = await getWordId(db, word);

    const wordId = resultRow?.row?.word_id as number;

    if (!wordId) {
      resolve(undefined);
      return;
    }

    const dictionaryEntry = await fetchWord(db, wordId);

    db.close();

    if(!dictionaryEntry) {
        resolve(undefined);
        return;
    };

    resolve({ row: dictionaryEntry, foundInKanji: resultRow?.foundInKanji });
  });
}

async function getWordId(db: Database, word: string, ): Promise<{ row: DBKanji | DBKana | undefined; foundInKanji: boolean } | undefined> {
  return new Promise(async (resolve) => {
    // first try to find in kanji table
    const wordByKanji = await fetchKanji(db, word);

    if (wordByKanji) {
      resolve({ row: wordByKanji, foundInKanji: true });
      return;
    }

    // if not found in kanji, try kana table
    const wordByKana = await fetchKana(db, word);

    if (wordByKana) {
      resolve({ row: wordByKana, foundInKanji: false });
      return;
    }

    resolve(undefined);
  });
}

async function fetchKanji(db: Database, word: string): Promise<DBKanji | undefined> {
  return new Promise(async (resolve) => {
    db.get("SELECT word_id FROM kanji WHERE text = ? LIMIT 1", [word], (err, row: DBKanji) => {
        if (err) {
            resolve(undefined)
        } else {
            resolve(row);
        };
    });
  });
}

async function fetchKana(db: Database, word: string): Promise<DBKana | undefined> {
  return new Promise(async (resolve) => {
    db.get("SELECT word_id FROM kana WHERE text = ? LIMIT 1", [word], (err, row: DBKana) => {
        if (err) {
            resolve(undefined)
        } else {
            resolve(row);
        };
    });
  });
}

async function fetchWord(db: Database, wordId: number): Promise<DBWord | undefined> {
  return new Promise(async (resolve) => {
    db.get("SELECT * FROM word WHERE id = ? LIMIT 1", [wordId], (err, row: DBWord) => {
        if (err) {
            resolve(undefined)
        } else {
            resolve(row);
        };
    });
  });
}
