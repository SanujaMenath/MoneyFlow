import { supabase } from "./supabase";
import { getDB } from "./db";

let syncing = false;

// Exponential backoff constants (M-05)
const BASE_RETRY_DELAY_MS = 5_000;
const MAX_RETRY_DELAY_MS = 300_000; // 5 minutes max
const MAX_RETRIES = 8;

function isOnline(): boolean {
  return navigator.onLine;
}

function backoffMs(retryCount: number): number {
  return Math.min(BASE_RETRY_DELAY_MS * 2 ** retryCount, MAX_RETRY_DELAY_MS);
}

export const enqueue = async (
  action: "create" | "update" | "delete",
  recordId?: number,
  payload?: Record<string, unknown>,
) => {
  const db = await getDB();
  await db.execute(
    `INSERT INTO sync_queue (action, table_name, record_id, payload, created_at, retry_count, next_retry_at)
     VALUES ($1, 'transactions', $2, $3, $4, 0, $4)`,
    [action, recordId ?? null, payload ? JSON.stringify(payload) : null, new Date().toISOString()],
  );
  sync(); // fire-and-forget
};

export const sync = async () => {
  if (syncing) return;
  if (!isOnline()) return;

  syncing = true;
  const db = await getDB();

  try {
    await pushChanges(db);
    await pullChanges(db);
  } catch (err) {
    console.error("Sync failed:", err);
  } finally {
    syncing = false;
  }
};

// Schedule a retry after the appropriate backoff window
async function scheduleRetry(db: Awaited<ReturnType<typeof getDB>>, queueId: number, retryCount: number) {
  const nextRetry = new Date(Date.now() + backoffMs(retryCount)).toISOString();
  await db.execute(
    "UPDATE sync_queue SET retry_count = $1, next_retry_at = $2 WHERE id = $3",
    [retryCount + 1, nextRetry, queueId],
  );
}

// ---------------------------------------------------------------------------
// Push: local SQLite → Supabase
// C-03 fix: no longer mutates the SQLite AUTOINCREMENT primary key.
//           Instead stores the Supabase remote id in the `synced_id` column.
// ---------------------------------------------------------------------------
async function pushChanges(db: Awaited<ReturnType<typeof getDB>>) {
  const now = new Date().toISOString();

  const rows = await db.select<{
    id: number;
    action: string;
    record_id: number | null;
    payload: string | null;
    retry_count: number;
    next_retry_at: string | null;
  }[]>(
    `SELECT id, action, record_id, payload, retry_count, next_retry_at
     FROM sync_queue
     WHERE synced = 0
       AND (retry_count = 0 OR next_retry_at IS NULL OR next_retry_at <= $1)
       AND retry_count < $2
     ORDER BY id ASC`,
    [now, MAX_RETRIES],
  );

  if (rows.length === 0) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  for (const row of rows) {
    try {
      switch (row.action) {
        case "create": {
          const payload = row.payload ? JSON.parse(row.payload) : {};
          const { data: created, error } = await supabase
            .from("transactions")
            .insert({ ...payload, user_id: user.id })
            .select("id")
            .single();
          if (error) throw error;
          // C-03 fix: store the remote id in synced_id column, never touch the local PK
          if (row.record_id !== null) {
            await db.execute(
              "UPDATE transactions SET synced_id = $1, synced_at = $2 WHERE id = $3",
              [String(created.id), new Date().toISOString(), row.record_id],
            );
          }
          break;
        }
        case "update": {
          const payload = row.payload ? JSON.parse(row.payload) : {};
          // Prefer synced_id (remote id) for Supabase operations
          const [localRow] = await db.select<{ synced_id: string | null }[]>(
            "SELECT synced_id FROM transactions WHERE id = $1",
            [row.record_id],
          );
          const remoteId = localRow?.synced_id ?? String(row.record_id);
          const { error } = await supabase
            .from("transactions")
            .update(payload)
            .eq("id", remoteId)
            .eq("user_id", user.id);
          if (error) throw error;
          await db.execute(
            "UPDATE transactions SET synced_at = $1 WHERE id = $2",
            [new Date().toISOString(), row.record_id],
          );
          break;
        }
        case "delete": {
          const [localRow] = await db.select<{ synced_id: string | null }[]>(
            "SELECT synced_id FROM transactions WHERE id = $1",
            [row.record_id],
          );
          const remoteId = localRow?.synced_id ?? String(row.record_id);
          const { error } = await supabase
            .from("transactions")
            .delete()
            .eq("id", remoteId)
            .eq("user_id", user.id);
          if (error) throw error;
          await db.execute("DELETE FROM transactions WHERE id = $1", [row.record_id]);
          break;
        }
      }
      await db.execute("UPDATE sync_queue SET synced = 1 WHERE id = $1", [row.id]);
    } catch (err) {
      console.error(`Sync failed for queue item ${row.id}:`, err);
      // M-05: exponential backoff — increment retry_count, set next_retry_at
      await scheduleRetry(db, row.id, row.retry_count);
    }
  }
}

// ---------------------------------------------------------------------------
// Pull: Supabase → local SQLite
// C-06 fix: filter by updated_at (not created_at) so edits and deletes sync.
// H-04 fix: LWW — skip remote rows where local updated_at is newer.
// ---------------------------------------------------------------------------
async function pullChanges(db: Awaited<ReturnType<typeof getDB>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // C-06 fix: use the maximum updated_at of already-synced rows as watermark
  const [watermarkRow] = await db.select<{ updated_at: string | null }[]>(
    "SELECT MAX(updated_at) as updated_at FROM transactions WHERE synced_at IS NOT NULL AND is_deleted = 0",
  );
  const watermark = watermarkRow?.updated_at ?? null;

  let query = supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: true });

  if (watermark) {
    // Pull only rows changed since last sync watermark
    query = query.gt("updated_at", watermark);
  }

  const { data: remote, error } = await query;
  if (error) throw error;
  if (!remote || remote.length === 0) return;

  const now = new Date().toISOString();

  for (const row of remote) {
    // Check whether this remote id matches any local row (by synced_id or direct id)
    const existing = await db.select<{
      id: number;
      updated_at: string | null;
    }[]>(
      "SELECT id, updated_at FROM transactions WHERE synced_id = $1 OR id = $2 LIMIT 1",
      [String(row.id), row.id],
    );

    if (existing.length > 0) {
      const local = existing[0];
      // H-04 LWW: skip if local record was updated more recently than the remote one
      if (local.updated_at && row.updated_at && local.updated_at > row.updated_at) {
        continue;
      }
      await db.execute(
        `UPDATE transactions
         SET amount=$1, type=$2, category=$3, date=$4, description=$5,
             created_at=$6, updated_at=$7, recurring_frequency=$8,
             recurring_end_date=$9, synced_at=$10, synced_id=$11,
             parent_transaction_id=$12
         WHERE id=$13`,
        [
          row.amount, row.type, row.category, row.date, row.description ?? null,
          row.created_at, row.updated_at ?? now, row.recurring_frequency ?? "none",
          row.recurring_end_date ?? null, now, String(row.id),
          row.parent_transaction_id ?? null, local.id,
        ],
      );
    } else {
      await db.execute(
        `INSERT INTO transactions
           (amount, type, category, date, description, created_at, updated_at,
            recurring_frequency, recurring_end_date, synced_at, synced_id,
            parent_transaction_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          row.amount, row.type, row.category, row.date, row.description ?? null,
          row.created_at, row.updated_at ?? now, row.recurring_frequency ?? "none",
          row.recurring_end_date ?? null, now, String(row.id),
          row.parent_transaction_id ?? null,
        ],
      );
    }
  }
}
