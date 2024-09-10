const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Function to convert JMDict JSON to SQLite
async function jmdictToSQLite(input, output) {
  console.log(`Input file: ${input}`);
  console.log(`Output file: ${output}`);

  // Check if input file exists
  if (!fs.existsSync(input)) throw new Error(`Input file ${input} not found`);

  // Check if output file already exists
  if (fs.existsSync(output))
    throw new Error(`Output file ${output} already exists`);

  console.log("Converting...");

  // Counter for successful and unsuccessful conversions
  let converted = 0;
  let notConverted = 0;

  // Connect to SQLite database
  const db = new sqlite3.Database(output);

  // enable WAL mode
  db.run("PRAGMA journal_mode = WAL;");

  // Create tables
  db.serialize(() => {
    // word
    db.run("CREATE TABLE word (id INTEGER PRIMARY KEY)");

    // kanji
    db.run(
      "CREATE TABLE kanji (id TEXT PRIMARY KEY, text TEXT, common INTEGER, word_id INTEGER, FOREIGN KEY(word_id) REFERENCES word(id))",
    );

    // kana
    db.run(
      "CREATE TABLE kana (id TEXT PRIMARY KEY, text TEXT, common INTEGER, applies_to_kanji TEXT, word_id INTEGER, FOREIGN KEY(word_id) REFERENCES word(id))",
    );

    // sense
    db.run(
      "CREATE TABLE sense (id TEXT PRIMARY KEY, applies_to_kanji TEXT, applies_to_kana TEXT, word_id INTEGER, FOREIGN KEY(word_id) REFERENCES word(id))",
    );

    // gloss
    db.run(
      "CREATE TABLE gloss (id TEXT PRIMARY KEY, text TEXT, sense_id TEXT, FOREIGN KEY(sense_id) REFERENCES sense(id))",
    );

    // tag
    db.run("CREATE TABLE tag (id TEXT PRIMARY KEY, text TEXT)");

    // kanji's tag
    db.run(
      "CREATE TABLE kanji_tag (kanji_id TEXT, tag_id TEXT, FOREIGN KEY(kanji_id) REFERENCES kanji(id), FOREIGN KEY(tag_id) REFERENCES tag(id))",
    );

    // kana's tag
    db.run(
      "CREATE TABLE kana_tag (kana_id TEXT, tag_id TEXT, FOREIGN KEY(kana_id) REFERENCES kana(id), FOREIGN KEY(tag_id) REFERENCES tag(id))",
    );

    // sense's part of speech
    db.run(
      "CREATE TABLE sense_pos (sense_id TEXT, tag_id TEXT, FOREIGN KEY(sense_id) REFERENCES sense(id), FOREIGN KEY(tag_id) REFERENCES tag(id))",
    );
  });

  // Read and parse the JMDict JSON
  const jsonData = JSON.parse(fs.readFileSync(input));

  const tags = jsonData.tags || {};
  const words = jsonData.words || [];

  // Process each entry in the tags object
  for (const [key, value] of Object.entries(tags)) {
    db.run("INSERT INTO tag (id, text) VALUES (?, ?)", [key, value]);
  }

  // Process each entry in the words array
  words.forEach((entry) => {
    const wordId = entry.id || 0;

    // handle kanji array
    entry.kanji?.forEach((kanji) => {
      const kanjiId = crypto.randomUUID();

      // insert kanji
      db.run(
        "INSERT INTO kanji (id, text, common, word_id) VALUES (?, ?, ?, ?)",
        [kanjiId, kanji.text, kanji.common ? 1 : 0, wordId],
      );

      // insert kanji's tags
      kanji?.tags?.forEach((tag) => {
        db.run("INSERT INTO kanji_tag (kanji_id, tag_id) VALUES (?, ?)", [
          kanjiId,
          tag,
        ]);
      });
    });

    // handle kana array
    entry.kana?.forEach((kana) => {
      const kanaId = crypto.randomUUID();

      // insert kana
      db.run(
        "INSERT INTO kana (id, text, common, applies_to_kanji, word_id) VALUES (?, ?, ?, ?, ?)",
        [
          kanaId,
          kana.text,
          kana.common ? 1 : 0,
          kana.appliesToKanji.join(""),
          wordId,
        ],
      );

      // insert kana's tags
      kana?.tags?.forEach((tag) => {
        db.run("INSERT INTO kana_tag (kana_id, tag_id) VALUES (?, ?)", [
          kanaId,
          tag,
        ]);
      });
    });

    // handle sense array
    entry.sense?.forEach((sense) => {
      const senseId = crypto.randomUUID();

      // insert sense
      db.run(
        "INSERT INTO sense (id, applies_to_kanji, applies_to_kana, word_id) VALUES (?, ?, ?, ?)",
        [
          senseId,
          sense.appliesToKanji.join(""),
          sense.appliesToKana.join(""),
          wordId,
        ],
      );

      // insert sense's part of speech tags
      sense?.partOfSpeech?.forEach((tag) => {
        db.run("INSERT INTO sense_pos (sense_id, tag_id) VALUES (?, ?)", [
          senseId,
          tag,
        ]);
      });

      // insert sense's gloss array
      sense?.gloss?.forEach((term) => {
        const glossId = crypto.randomUUID();

        db.run("INSERT INTO gloss (id, text, sense_id) VALUES (?, ?, ?)", [
          glossId,
          term.text,
          senseId,
        ]);
      });
    });

    if (wordId !== 0) {
      converted++;
      db.run("INSERT INTO word (id) VALUES (?)", [wordId]);
    } else {
      notConverted++;
    }
  });

  // Close the database
  db.close(() => {
    console.log("Converting done!");
    console.log(`Converted entries: ${converted}`);
    console.log(`Not converted entries: ${notConverted}`);
  });
}

// A simple starting wrapper
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length !== 2) {
    console.error("Please specify two arguments:");
    console.error("- input JMDict JSON file");
    console.error("- output SQLite3 file");
    process.exit(1);
  }

  try {
    const input = path.resolve(args[0]);
    const output = path.resolve(args[1]);
    jmdictToSQLite(input, output)
      .then(() => console.log("Conversion completed!"))
      .catch((err) => console.error(err.message));
  } catch (err) {
    console.error(`Error: ${err.message}`);
  }
}
