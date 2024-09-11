import sqlite3, { type Database } from 'sqlite3';
import type { KuromojiToken } from 'kuromojin';
import type {
  DBKana,
  DBKanji,
  DBResultEntry,
  DBWord,
  ParsedWord,
  WordToken,
} from '../../types/types';

const JMDICT_DB_PATH = 'src/lib/jmdict/jmdict.db';

export async function getDictionaryEntries(wordTokensArray: WordToken[]) {
  const db = new sqlite3.Database(JMDICT_DB_PATH);
  db.run('PRAGMA journal_mode = WAL;');

  const dictionaryEntries = await Promise.all(
    wordTokensArray.map(async (wordTokens) => ({
      ...wordTokens,
      parsedText: await mapTokenWithDictionaryEntries(db, wordTokens.tokens),
    })),
  );

  db.close();

  return dictionaryEntries;
}

function mapTokenWithDictionaryEntries(
  db: Database,
  tokens: KuromojiToken[],
): Promise<ParsedWord[]> {
  return Promise.all(
    tokens.map(async (token) => {
      const entry =
        token.word_type === 'UNKNOWN'
          ? undefined
          : await fetchDictionaryEntry(db, token.basic_form);

      return {
        text: token.surface_form,
        dictionaryEntry: {
          wordBasicForm: token.basic_form,
          type: entry?.foundInKanji ? 'kanji' : 'kana',
          fullEntry: entry?.row,
        },
      };
    }),
  );
}

async function fetchDictionaryEntry(
  db: Database,
  word: string,
): Promise<DBResultEntry | undefined> {
  const resultRow = await getWordId(db, word);
  const wordId = resultRow?.row?.word_id as number;

  if (!wordId) {
    return undefined;
  }

  const dictionaryEntry = await fetchWord(db, wordId);

  if (!dictionaryEntry) {
    return undefined;
  }

  return { row: dictionaryEntry, foundInKanji: resultRow?.foundInKanji };
}

async function getWordId(
  db: Database,
  word: string,
): Promise<
  { row: DBKanji | DBKana | undefined; foundInKanji: boolean } | undefined
> {
  // first try to find in kanji table
  const wordByKanji = await fetchKanji(db, word);

  if (wordByKanji) {
    return { row: wordByKanji, foundInKanji: true };
  }

  // if not found in kanji, try kana table
  const wordByKana = await fetchKana(db, word);

  if (wordByKana) {
    return { row: wordByKana, foundInKanji: false };
  }

  return undefined;
}

function fetchKanji(db: Database, word: string): Promise<DBKanji | undefined> {
  return new Promise((resolve) => {
    db.get(
      'SELECT word_id FROM kanji WHERE text = ? LIMIT 1',
      [word],
      (err, row: DBKanji) => {
        if (err) {
          resolve(undefined);
        } else {
          resolve(row);
        }
      },
    );
  });
}

function fetchKana(db: Database, word: string): Promise<DBKana | undefined> {
  return new Promise((resolve) => {
    db.get(
      'SELECT word_id FROM kana WHERE text = ? LIMIT 1',
      [word],
      (err, row: DBKana) => {
        if (err) {
          resolve(undefined);
        } else {
          resolve(row);
        }
      },
    );
  });
}

function fetchWord(db: Database, wordId: number): Promise<DBWord | undefined> {
  return new Promise((resolve) => {
    db.get(
      'SELECT * FROM word WHERE id = ? LIMIT 1',
      [wordId],
      (err, row: DBWord) => {
        if (err) {
          resolve(undefined);
        } else {
          resolve(row);
        }
      },
    );
  });
}
