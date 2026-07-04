import Database from "@tauri-apps/plugin-sql";

let db: Database | null = null;

export const getDB = async () => {
  if (db) return db;

  db = await Database.load("sqlite:moneyflow.db");

  const [row] = await db.select<{ version: number }[]>(
    "SELECT version FROM schema_version ORDER BY version DESC LIMIT 1",
  );
  const currentVersion = row?.version ?? 0;

  const runMigration = async (version: number, sql: string) => {
    await db!.execute(sql);
    await db!.execute("INSERT INTO schema_version (version) VALUES ($1)", [version]);
  };

  if (currentVersion < 1) {
    await runMigration(1, `
      CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY);
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount INTEGER NOT NULL,
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        date TEXT NOT NULL,
        created_at TEXT NOT NULL,
        recurring_frequency TEXT DEFAULT 'none',
        recurring_end_date TEXT
      );
    `);
  }

  if (currentVersion < 2) {
    await runMigration(2, `
      ALTER TABLE transactions ADD COLUMN synced_at TEXT;
      ALTER TABLE transactions ADD COLUMN is_deleted INTEGER DEFAULT 0;
      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL CHECK(action IN ('create','update','delete')),
        table_name TEXT NOT NULL DEFAULT 'transactions',
        record_id INTEGER,
        payload TEXT,
        created_at TEXT NOT NULL,
        synced INTEGER DEFAULT 0
      );
    `);
  }

  return db;
};