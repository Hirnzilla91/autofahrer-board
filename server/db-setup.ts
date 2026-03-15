/**
 * Database setup script — creates tables and seeds initial data.
 * Run with: npx tsx server/db-setup.ts
 * Requires DATABASE_URL environment variable.
 */
import pg from "pg";

async function setup() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("ERROR: DATABASE_URL environment variable is required.");
    process.exit(1);
  }

  const client = new pg.Client({
    connectionString,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();
  console.log("Connected to database.");

  // Create tables
  await client.query(`
    CREATE TABLE IF NOT EXISTS plates (
      id SERIAL PRIMARY KEY,
      plate VARCHAR(15) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  `);
  console.log("Table 'plates' ready.");

  await client.query(`
    CREATE TABLE IF NOT EXISTS comments (
      id SERIAL PRIMARY KEY,
      plate_id INTEGER NOT NULL REFERENCES plates(id) ON DELETE CASCADE,
      username VARCHAR(30) NOT NULL,
      text VARCHAR(120) NOT NULL,
      grade INTEGER NOT NULL CHECK (grade >= 1 AND grade <= 6),
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    );
  `);
  console.log("Table 'comments' ready.");

  // Create index for faster lookups
  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_comments_plate_id ON comments(plate_id);
  `);

  // Check if seed data already exists
  const existing = await client.query("SELECT COUNT(*) FROM plates");
  if (parseInt(existing.rows[0].count) > 0) {
    console.log("Seed data already exists. Skipping.");
    await client.end();
    return;
  }

  // Seed plates
  const samplePlates = [
    "HH AB 1234", "B CD 567", "M XY 89", "K LM 4321", "F GH 999",
    "S TU 111", "D EF 222", "HB RS 333", "N WX 444", "L PQ 555",
    "DO AB 666", "E KL 777", "DD MN 888", "KS OP 123", "H QR 456",
    "BI ST 789", "WI UV 321", "MA WX 654", "KA YZ 987", "AC AB 159",
  ];

  for (const plate of samplePlates) {
    await client.query("INSERT INTO plates (plate) VALUES ($1) ON CONFLICT DO NOTHING", [plate]);
  }
  console.log(`Seeded ${samplePlates.length} plates.`);

  // Seed comments
  const usernames = [
    "AutoFan42", "StrassenBeobachter", "VerkehrsCop", "Blinkerpolizei",
    "Spurhalter", "Tempolimit", "Parkverbot", "Ampelblitzer",
  ];

  const badComments = [
    "Blinker ist wohl Zubehör bei dem...",
    "Dreispurig fahren auf zwei Spuren!",
    "Handy am Steuer, Klassiker.",
    "Hat mich auf der A7 geschnitten!",
    "Parkt grundsätzlich in zweiter Reihe.",
    "Raser der Extraklasse auf der B27.",
    "Reißverschlussverfahren? Fremdwort!",
    "Fährt bei Rot über die Ampel.",
    "Lichthupe-Terrorist auf der Überholspur.",
    "Stinknormaler Schleicher auf der linken Spur.",
    "Hupt bei jeder Gelegenheit.",
    "Parkt auf dem Gehweg. Toll.",
    "Überholt in der 30er Zone. Held.",
  ];

  const goodComments = [
    "Vorbildlicher Fahrer, Hut ab!",
    "Immer freundlich, lässt andere rein.",
    "Perfekter Abstand, top Fahrer.",
    "Hat mir nett die Vorfahrt gelassen.",
  ];

  // Get all plate IDs
  const plateRows = await client.query("SELECT id FROM plates ORDER BY id");
  const plateIds = plateRows.rows.map((r: any) => r.id);

  for (const plateId of plateIds) {
    const numComments = Math.floor(Math.random() * 5) + 1;
    for (let i = 0; i < numComments; i++) {
      const username = usernames[Math.floor(Math.random() * usernames.length)];
      const isGood = Math.random() > 0.6;
      const commentList = isGood ? goodComments : badComments;
      const text = commentList[Math.floor(Math.random() * commentList.length)];
      const grade = isGood
        ? Math.floor(Math.random() * 2) + 1  // 1-2 for good
        : Math.floor(Math.random() * 3) + 4; // 4-6 for bad

      await client.query(
        "INSERT INTO comments (plate_id, username, text, grade) VALUES ($1, $2, $3, $4)",
        [plateId, username, text, grade]
      );
    }
  }
  console.log("Seeded comments.");

  await client.end();
  console.log("Done! Database is ready.");
}

setup().catch((err) => {
  console.error("Setup failed:", err);
  process.exit(1);
});
