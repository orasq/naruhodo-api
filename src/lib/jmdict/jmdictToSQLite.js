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
    db.run("CREATE TABLE word (id INTEGER PRIMARY KEY, content TEXT)");

    // kanji
    db.run(
      "CREATE TABLE kanji (id TEXT PRIMARY KEY, text TEXT, common INTEGER, word_id INTEGER, FOREIGN KEY(word_id) REFERENCES word(id))",
    );

    // Create index on kanji.text
    db.run("CREATE INDEX idx_kanji_text ON kanji (text)");

    // kana
    db.run(
      "CREATE TABLE kana (id TEXT PRIMARY KEY, text TEXT, common INTEGER, applies_to_kanji TEXT, word_id INTEGER, FOREIGN KEY(word_id) REFERENCES word(id))",
    );
  });

  // Read and parse the JMDict JSON
  const jsonData = JSON.parse(fs.readFileSync(input));

  const words = jsonData.words || [];

  // Process each entry in the words array
  words.forEach((entry) => {
    const wordId = entry.id || 0;

    // handle kanji array
    entry.kanji?.forEach((kanji) => {
      const kanjiId = crypto.randomUUID();

      // insert kanji
      db.run("INSERT INTO kanji (id, text,  word_id) VALUES (?, ?, ?)", [
        kanjiId,
        kanji.text,
        wordId,
      ]);
    });

    // handle kana array
    entry.kana?.forEach((kana) => {
      const kanaId = crypto.randomUUID();

      // insert kana
      db.run("INSERT INTO kana (id, text, word_id) VALUES (?, ?, ?)", [
        kanaId,
        kana.text,
        wordId,
      ]);
    });

    if (wordId !== 0) {
      converted++;
      db.run("INSERT INTO word (id, content) VALUES (?, ?)", [
        wordId,
        JSON.stringify(entry),
      ]);
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
