import { getDB } from "../../lib/db";
import { supabase } from "../../lib/supabase";
import { createTransaction } from "../transactions/services/transactionService";

export const migrateLocalToCloud = async () => {
  try {
    const db = await getDB();
    const localRows = await db.select<any[]>("SELECT * FROM transactions");

    if (localRows.length === 0) return alert("No local data found.");

    const { data: cloudRows } = await supabase.from("transactions").select("amount, date, category");

    let migratedCount = 0;
    let skippedCount = 0;

    for (const row of localRows) {
      const isDuplicate = cloudRows?.some(cloud => 
        cloud.amount === row.amount && 
        cloud.date === row.date && 
        cloud.category === row.category
      );

      if (!isDuplicate) {
        await createTransaction({
          amount: row.amount,
          type: row.type,
          category: row.category,
          date: row.date,
          createdAt: row.created_at,
          recurringFrequency: row.recurring_frequency || "none",
          recurringEndDate: row.recurring_end_date || null,
        });
        migratedCount++;
      } else {
        skippedCount++;
      }
    }

    alert(`Migration Finished!\nMigrated: ${migratedCount}\nSkipped (Duplicates): ${skippedCount}`);

  } catch (e) {
    console.error("Migration failed:", e);
    alert("Migration failed. Please check your connection and try again.");
  }
};