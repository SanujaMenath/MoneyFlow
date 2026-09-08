import { supabase } from "../lib/supabase";
import type { Profile, ProfileUpdate } from "@moneyflow/shared";

const AVATAR_BUCKET = "avatars";
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;

async function ensureProfile(userId: string): Promise<void> {
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .single();

  if (!existing) {
    const { error } = await supabase.from("profiles").insert([
      {
        id: userId,
        currency: "LKR",
        language: "en",
        timezone: "UTC",
        date_format: "YYYY-MM-DD",
        notification_preferences: {
          push_enabled: true,
          email_notifications: true,
          weekly_summary: false,
          monthly_report: true,
        },
        default_dashboard_view: "overview",
      },
    ]);
    if (error && error.code !== "23505") throw error;
  }
}

export async function getProfile(userId: string): Promise<Profile> {
  await ensureProfile(userId);

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data;
}

export async function updateProfile(userId: string, updates: ProfileUpdate): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: userId, ...updates, updated_at: new Date().toISOString() });

  if (error) throw error;
}

export async function uploadAvatar(
  userId: string,
  blob: Blob,
  fileExt: string
): Promise<string> {
  if (blob.size > MAX_AVATAR_SIZE) {
    throw new Error("Image must be less than 2MB");
  }

  const fileName = `${userId}/avatar.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(fileName, blob, { upsert: true, contentType: `image/${fileExt}` });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from(AVATAR_BUCKET)
    .getPublicUrl(fileName);

  const avatarUrl = urlData.publicUrl;

  await updateProfile(userId, { avatar_url: avatarUrl });

  return avatarUrl;
}

export async function deleteAvatar(userId: string): Promise<void> {
  const { data: files } = await supabase.storage
    .from(AVATAR_BUCKET)
    .list(userId);

  if (files && files.length > 0) {
    const filePaths = files.map((f) => `${userId}/${f.name}`);
    await supabase.storage.from(AVATAR_BUCKET).remove(filePaths);
  }

  await updateProfile(userId, { avatar_url: null });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const { error } = await supabase.rpc("change_user_password", {
    current_password: currentPassword,
    new_password: newPassword,
  });
  if (error) throw error;
}

export async function updateEmail(newEmail: string): Promise<void> {
  const { error } = await supabase.auth.updateUser({ email: newEmail });
  if (error) throw error;
}

export async function requestAccountDeletion(userId: string, password: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("Not authenticated");

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  });
  if (signInError) throw new Error("Password is incorrect");

  try {
    await deleteAvatar(userId);
  } catch {
    // Ignore avatar cleanup failure and proceed
  }

  const { error: rpcError } = await supabase.rpc("delete_user_account");
  if (rpcError) {
    await supabase.from("profiles").delete().eq("id", userId);
  }

  await supabase.auth.signOut();
}
