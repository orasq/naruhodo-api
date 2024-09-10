import type { KuromojiToken } from "kuromojin";
import type { Database } from "sqlite3";
import type { DBKanji, DBResultEntry, DBWord, ParsedWord } from "../../types/types";

export function mapTokenWithDictionaryEntries(
    db: Database,
    tokens: KuromojiToken[],
  ): Promise<ParsedWord[]> {
    return Promise.all(
      tokens.map(async (token) => {
        const entry =
          token.word_type === "UNKNOWN"
            ? undefined
            : await fetchDictionaryEntry(db, token.basic_form);
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
    db: Database,
    kanjiText: string,
  ): Promise<DBResultEntry | undefined> {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT word_id FROM kanji WHERE text = ?`,
        [kanjiText],
        (err, row: DBKanji) => {
          if (err || !row) return resolve(undefined);
  
          db.get(
            `SELECT * FROM word WHERE id = ?`,
            [row.word_id],
            (err, row: DBWord) => {
              if (err) resolve(undefined);
  
              resolve({ row, foundInKanji: true });
            },
          );
        },
      );
    });
  }
  