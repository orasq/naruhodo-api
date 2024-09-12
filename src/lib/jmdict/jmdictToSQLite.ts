import { downloadAndExtractJson } from '../utils/functions/downloadAndExtractJson';

import fs from 'fs';
import sqlite3 from 'sqlite3';
import path from 'path';

// TODO: use self-hosted JSON file
const JSON_FILE_PATH =
  'https://github.com/scriptin/jmdict-simplified/releases/download/3.5.0%2B20240909122502/jmdict-eng-3.5.0+20240909122502.json.zip';
const FILE_NAME = 'jmdict-eng-3.5.0.json';
const OUTPUT_FILE_PATH = './src/lib/jmdict/';
const DB_NAME = 'jmdict.db';

// Function to convert JMDict JSON to SQLite
async function jmdictToSQLite() {
  const jsonData = await downloadAndExtractJson(JSON_FILE_PATH, FILE_NAME, OUTPUT_FILE_PATH);

  console.log('Start Converting DB to SQLite...');

  let converted = 0;
  let notConverted = 0;

  const db = new sqlite3.Database(OUTPUT_FILE_PATH + DB_NAME);
  db.run('PRAGMA journal_mode = WAL;');

  // Create tables
  db.serialize(() => {
    // word
    db.run('CREATE TABLE word (id INTEGER PRIMARY KEY, content TEXT)');

    // kanji
    db.run(
      'CREATE TABLE kanji (id TEXT PRIMARY KEY, text TEXT, word_id INTEGER, FOREIGN KEY(word_id) REFERENCES word(id))',
    );

    // create index on kanji.text
    db.run('CREATE INDEX idx_kanji_text ON kanji (text)');

    // kana
    db.run(
      'CREATE TABLE kana (id TEXT PRIMARY KEY, text TEXT, word_id INTEGER, FOREIGN KEY(word_id) REFERENCES word(id))',
    );

    // create index on kana.text
    db.run('CREATE INDEX idx_kana_text ON kana (text)');
  });

  if (!jsonData) {
    console.error('JSON data not found.');
    return;
  }

  const words = jsonData.words || [];

  // Process each entry in the words array
  words.forEach((entry) => {
    const wordId = entry.id || 0;

    // handle kanji array
    entry.kanji?.forEach((kanji) => {
      const kanjiId = crypto.randomUUID();

      // insert kanji
      db.run('INSERT INTO kanji (id, text,  word_id) VALUES (?, ?, ?)', [
        kanjiId,
        kanji.text,
        wordId,
      ]);
    });

    // handle kana array
    entry.kana?.forEach((kana) => {
      const kanaId = crypto.randomUUID();

      // insert kana
      db.run('INSERT INTO kana (id, text, word_id) VALUES (?, ?, ?)', [kanaId, kana.text, wordId]);
    });

    if (wordId !== 0) {
      converted++;
      db.run('INSERT INTO word (id, content) VALUES (?, ?)', [wordId, JSON.stringify(entry)]);
    } else {
      notConverted++;
    }
  });

  // Close the database
  db.close(() => {
    console.log('Converting done!');
    console.log(`Converted entries: ${converted}`);
    console.log(`Not converted entries: ${notConverted}`);
  });
}

try {
  jmdictToSQLite()
    .then(() => console.log('Conversion completed!'))
    .catch((err) => console.error(err.message));
} catch (err: any) {
  console.error(`Error: ${err.message}`);
}
