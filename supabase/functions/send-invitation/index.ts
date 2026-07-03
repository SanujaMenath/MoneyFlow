import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const APP_URL = Deno.env.get("APP_URL") || "http://localhost:1420";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

interface InvitationPayload {
  id: string;
  list_id: string;
  invited_email: string;
  invited_by: string;
  token: string;
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function validatePayload(body: unknown): body is { record: InvitationPayload } {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  if (!b.record || typeof b.record !== "object") return false;
  const r = b.record as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    typeof r.list_id === "string" &&
    typeof r.invited_email === "string" &&
    typeof r.invited_by === "string" &&
    typeof r.token === "string"
  );
}

serve(async (req) => {
  try {
    if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing required environment variables");
      return new Response("Server configuration error", { status: 500 });
    }

    const body = await req.json();
    if (!validatePayload(body)) {
      return new Response("Invalid payload", { status: 400 });
    }

    const { record } = body;

    if (!validateEmail(record.invited_email)) {
      return new Response("Invalid email address", { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify the invitation exists and belongs to a real list
    const { data: invitation, error: invError } = await supabase
      .from("shared_invitations")
      .select("id, list_id, status")
      .eq("id", record.id)
      .eq("token", record.token)
      .single();

    if (invError || !invitation) {
      return new Response("Invitation not found or already processed", { status: 404 });
    }

    const [listRes, profileRes] = await Promise.all([
      supabase.from("shared_lists").select("name").eq("id", record.list_id).single(),
      supabase.from("profiles").select("display_name").eq("id", record.invited_by).single(),
    ]);

    const listName = listRes.data?.name || "a shared list";
    const inviterName = profileRes.data?.display_name || "Someone";
    const acceptUrl = `${APP_URL}/collaboration?accept=${encodeURIComponent(record.token)}`;

    const safeListName = escapeHtml(listName);
    const safeInviterName = escapeHtml(inviterName);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "MoneyFlow <onboarding@resend.dev>",
        to: record.invited_email,
        subject: `${safeInviterName} invited you to "${safeListName}"`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2>${safeInviterName} invited you</h2>
            <p>Join <strong>${safeListName}</strong> on MoneyFlow to track shared expenses together.</p>
            <a href="${acceptUrl}"
               style="display: inline-block; background: #2563EB; color: white;
                      padding: 12px 24px; border-radius: 8px; text-decoration: none;
                      font-weight: 600; margin: 16px 0;">
              Accept Invitation
            </a>
            <p style="color: #6B7280; font-size: 12px;">
              If you don't have a MoneyFlow account,
              <a href="${APP_URL}">create one</a> with this email to join.
            </p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Resend error:", errText);
      return new Response("Failed to send email", { status: 500 });
    }

    return new Response("OK", { status: 200 });
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response("Internal server error", { status: 500 });
  }
});
