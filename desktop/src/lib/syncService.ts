import { supabase } from "./supabase";
import { getDB } from "./db";

let syncing = false;

function isOnline(): boolean {
  return navigator.onLine;
}

export const enqueue = async (
  action: "create" | "update" | "delete",
  recordId?: number,
  payload?: Record<string, unknown>,
) => {
  const db = await getDB();
  await db.execute(
    `INSERT INTO sync_queue (action, table_name, record_id, payload, created_at)
     VALUES ($1, 'transactions', $2, $3, $4)`,
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

async function pushChanges(db: Awaited<ReturnType<typeof getDB>>) {
  const rows = await db.select<{
    id: number;
    action: string;
    record_id: number | null;
    payload: string | null;
  }[]>(
    "SELECT id, action, record_id, payload FROM sync_queue WHERE synced = 0 ORDER BY id ASC",
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
            .select()
            .single();
          if (error) throw error;
          await db.execute(
            "UPDATE transactions SET synced_at = $1, id = $2 WHERE id = $3",
            [new Date().toISOString(), created.id, row.record_id],
          );
          break;
        }
        case "update": {
          const payload = row.payload ? JSON.parse(row.payload) : {};
          const { error } = await supabase
            .from("transactions")
            .update(payload)
            .eq("id", row.record_id)
            .eq("user_id", user.id);
          if (error) throw error;
          await db.execute(
            "UPDATE transactions SET synced_at = $1 WHERE id = $2",
            [new Date().toISOString(), row.record_id],
          );
          break;
        }
        case "delete": {
          const { error } = await supabase
            .from("transactions")
            .delete()
            .eq("id", row.record_id)
            .eq("user_id", user.id);
          if (error) throw error;
          await db.execute("DELETE FROM transactions WHERE id = $1", [row.record_id]);
          break;
        }
      }
      await db.execute("UPDATE sync_queue SET synced = 1 WHERE id = $1", [row.id]);
    } catch (err) {
      console.error(`Sync failed for queue item ${row.id}:`, err);
    }
  }
}

async function pullChanges(db: Awaited<ReturnType<typeof getDB>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const [lastSync] = await db.select<{ synced_at: string }[]>(
    "SELECT MAX(synced_at) as synced_at FROM transactions WHERE synced_at IS NOT NULL",
  );

  let query = supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (lastSync?.synced_at) {
    query = query.gt("created_at", lastSync.synced_at);
  }

  const { data: remote, error } = await query;
  if (error) throw error;
  if (!remote || remote.length === 0) return;

  const now = new Date().toISOString();
  for (const row of remote) {
    const existing = await db.select<{ id: number }[]>(
      "SELECT id FROM transactions WHERE id = $1",
      [row.id],
    );

    if (existing.length > 0) {
      await db.execute(
        `UPDATE transactions SET amount=$1, type=$2, category=$3, date=$4,
                created_at=$5, recurring_frequency=$6, recurring_end_date=$7, synced_at=$8
         WHERE id=$9`,
        [row.amount, row.type, row.category, row.date, row.created_at,
         row.recurring_frequency ?? "none", row.recurring_end_date ?? null, now, row.id],
      );
    } else {
      await db.execute(
        `INSERT INTO transactions (id, amount, type, category, date, created_at,
                recurring_frequency, recurring_end_date, synced_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [row.id, row.amount, row.type, row.category, row.date, row.created_at,
         row.recurring_frequency ?? "none", row.recurring_end_date ?? null, now],
      );
    }
  }
}
