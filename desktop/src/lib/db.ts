import Database from "@tauri-apps/plugin-sql";

let db: Database | null = null;

export const getDB = async () => {
  if (db) return db;

  db = await Database.load("sqlite:moneyflow.db");

  // Bootstrap: ensure schema_version exists before reading from it (M-10).
  // This must run before any SELECT on schema_version.
  await db.execute(
    "CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY)",
  );

  const [row] = await db.select<{ version: number }[]>(
    "SELECT version FROM schema_version ORDER BY version DESC LIMIT 1",
  );
  const currentVersion = row?.version ?? 0;

  const runMigration = async (version: number, sql: string) => {
    await db!.execute(sql);
    await db!.execute("INSERT OR IGNORE INTO schema_version (version) VALUES ($1)", [version]);
  };

  if (currentVersion < 1) {
    await runMigration(1, `
      CREATE TABLE IF NOT EXISTS transactions (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        amount      INTEGER NOT NULL,
        type        TEXT NOT NULL CHECK(type IN ('income','expense')),
        category    TEXT NOT NULL,
        date        TEXT NOT NULL,
        description TEXT,
        created_at  TEXT NOT NULL,
        updated_at  TEXT,
        recurring_frequency  TEXT DEFAULT 'none',
        recurring_end_date   TEXT,
        parent_transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL
      );
    `);
  }

  if (currentVersion < 2) {
    await runMigration(2, `
      ALTER TABLE transactions ADD COLUMN synced_at TEXT;
      ALTER TABLE transactions ADD COLUMN is_deleted INTEGER DEFAULT 0;
      CREATE TABLE IF NOT EXISTS sync_queue (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        action     TEXT NOT NULL CHECK(action IN ('create','update','delete')),
        table_name TEXT NOT NULL DEFAULT 'transactions',
        record_id  INTEGER,
        payload    TEXT,
        created_at TEXT NOT NULL,
        synced     INTEGER DEFAULT 0,
        retry_count INTEGER DEFAULT 0,
        next_retry_at TEXT
      );
    `);
  }

  if (currentVersion < 3) {
    // Add description + updated_at + parent_transaction_id + synced_id
    // to pre-existing installs that ran migration 1 without these columns.
    await runMigration(3, `
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS updated_at TEXT;
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS parent_transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL;
      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS synced_id TEXT;
    `);
  }

  if (currentVersion < 4) {
    // Add retry columns to sync_queue for pre-existing installs.
    await runMigration(4, `
      ALTER TABLE sync_queue ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
      ALTER TABLE sync_queue ADD COLUMN IF NOT EXISTS next_retry_at TEXT;
    `);
  }

  return db;
};