import { useState, useEffect, useRef, useCallback } from "react";
import {
  User, Camera, Trash2, KeyRound, Mail, AlertTriangle,
  Save, Globe, Bell,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import type { Profile, ProfileUpdate } from "@moneyflow/shared";
import {
  COUNTRIES, LANGUAGES, TIMEZONES, DATE_FORMATS,
} from "@moneyflow/shared";

interface CloudProfile extends Profile {
  email?: string;
}

type Section = "general" | "personal" | "preferences" | "security" | "danger";

const sectionIcons: Record<Section, React.ElementType> = {
  general: User,
  personal: Globe,
  preferences: Bell,
  security: KeyRound,
  danger: AlertTriangle,
};

const ProfilePage = () => {
  const [profile, setProfile] = useState<CloudProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>("general");
  const [avatarHover, setAvatarHover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [country, setCountry] = useState("");
  const [currency, setCurrency] = useState("LKR");
  const [language, setLanguage] = useState("en");
  const [timezone, setTimezone] = useState("UTC");
  const [dateFormat, setDateFormat] = useState("YYYY-MM-DD");
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState(false);
  const [monthlyReport, setMonthlyReport] = useState(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const applyProfile = useCallback((data: Profile) => {
    setFullName(data.full_name || "");
    setUsername(data.username || "");
    setPhone(data.phone || "");
    setDateOfBirth(data.date_of_birth || "");
    setCountry(data.country || "");
    setCurrency(data.currency || "LKR");
    setLanguage(data.language || "en");
    setTimezone(data.timezone || "UTC");
    setDateFormat(data.date_format || "YYYY-MM-DD");
    setPushEnabled(data.notification_preferences?.push_enabled ?? true);
    setEmailNotifications(data.notification_preferences?.email_notifications ?? true);
    setWeeklySummary(data.notification_preferences?.weekly_summary ?? false);
    setMonthlyReport(data.notification_preferences?.monthly_report ?? true);
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error && error.code === "PGRST116") {
        const { data: newProfile, error: insertError } = await supabase
          .from("profiles")
          .insert([{
            id: user.id,
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
          }])
          .select()
          .single();
        if (insertError) throw insertError;
        setProfile({ ...newProfile, email: user.email });
        applyProfile(newProfile);
        return;
      }

      if (error) throw error;
      setProfile({ ...data, email: user.email });
      applyProfile(data);
    } catch (err: unknown) {
      console.error("Failed to load profile", err);
    } finally {
      setLoading(false);
    }
  }, [applyProfile]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProfile();
  }, [loadProfile]);

  async function handleSave() {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updates: ProfileUpdate = {
        full_name: fullName.trim() || undefined,
        username: username.trim() || null,
        phone: phone.trim() || null,
        date_of_birth: dateOfBirth.trim() || null,
        country: country || null,
        currency,
        language,
        timezone,
        date_format: dateFormat,
        notification_preferences: {
          push_enabled: pushEnabled,
          email_notifications: emailNotifications,
          weekly_summary: weeklySummary,
          monthly_report: monthlyReport,
        },
      };

      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, ...updates, updated_at: new Date().toISOString() });

      if (error) throw error;
      alert("Profile saved successfully");
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Image must be less than 2MB");
      return;
    }

    defineAvatarUpload(file);
  }

  async function defineAvatarUpload(file: File) {
    setAvatarUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

      const avatarUrl = urlData.publicUrl;

      await supabase
        .from("profiles")
        .upsert({ id: user.id, avatar_url: avatarUrl, updated_at: new Date().toISOString() });

      await loadProfile();
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message);
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemoveAvatar() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.storage.from("avatars").remove([`${user.id}/avatar.jpg`, `${user.id}/avatar.png`]);

      await supabase
        .from("profiles")
        .upsert({ id: user.id, avatar_url: null, updated_at: new Date().toISOString() });

      await loadProfile();
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message);
    }
  }

  async function handleChangePassword() {
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      alert("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleChangeEmail() {
    if (!newEmail.includes("@")) {
      alert("Please enter a valid email address");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      alert("Verification email sent. Check your inbox.");
      setNewEmail("");
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== "DELETE") {
      alert('Type "DELETE" to confirm');
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error: deleteError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", user.id);
      if (deleteError) throw deleteError;

      await supabase.auth.signOut();
      window.location.reload();
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  const sections: Section[] = ["general", "personal", "preferences", "security", "danger"];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-text-primary mb-6">Profile</h1>

      {/* Avatar */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-6 mb-6">
        <div className="flex items-center gap-6">
          <div
            className="relative"
            onMouseEnter={() => setAvatarHover(true)}
            onMouseLeave={() => setAvatarHover(false)}
          >
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="w-20 h-20 rounded-full object-cover border-2 border-border"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold">
                {fullName ? fullName.charAt(0).toUpperCase() : "?"}
              </div>
            )}
            {avatarHover && (
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                <Camera size={20} className="text-white" />
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              placeholder="Select an image"
              onChange={handleAvatarPick}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 rounded-full cursor-pointer"
              type="button"
              aria-label="Change avatar"
            />
          </div>
          <div>
            <h2 className="font-bold text-text-primary">
              {fullName || "Set your name"}
            </h2>
            <p className="text-sm text-text-secondary">{profile?.email}</p>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="text-xs bg-bg border border-border hover:bg-card text-text-primary px-3 py-1.5 rounded-lg transition-colors font-medium"
              >
                {avatarUploading ? "Uploading..." : "Change photo"}
              </button>
              {profile?.avatar_url && (
                <button
                  onClick={handleRemoveAvatar}
                  className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg transition-colors font-medium"
                >
                  <Trash2 size={12} className="inline mr-1" />
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {sections.map((sec) => {
          const Icon = sectionIcons[sec];
          return (
            <button
              key={sec}
              onClick={() => setActiveSection(sec)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors border ${
                activeSection === sec
                  ? "bg-primary text-white border-primary"
                  : "bg-card text-text-secondary border-border hover:border-text-secondary hover:text-text-primary"
              }`}
            >
              <Icon size={14} />
              {sec.charAt(0).toUpperCase() + sec.slice(1)}
            </button>
          );
        })}
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {/* General */}
        {activeSection === "general" && (
          <div className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Sanuja Perera"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-bg"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. sanuja"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-bg"
              />
            </div>
          </div>
        )}

        {/* Personal */}
        {activeSection === "personal" && (
          <div className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">
                Phone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+94 77 123 4567"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-bg"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">
                Date of Birth
              </label>
              <input
                type="text"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                placeholder="YYYY-MM-DD"
                className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-bg"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">
                Country
              </label>
              <select
                value={country}
                title="Select a country"
                onChange={(e) => setCountry(e.target.value)}
                className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-bg"
              >
                <option value="">Select a country</option>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Preferences */}
        {activeSection === "preferences" && (
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">
                  Currency
                </label>
                <select
                  value={currency}
                  title="Select a currency"
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-bg"
                >
                  {["LKR", "USD", "EUR", "GBP", "INR", "AUD", "JPY", "CAD"].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">
                  Language
                </label>
                <select
                  value={language}
                  title="Select a language"
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-bg"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>{l.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">
                  Timezone
                </label>
                <select
                  value={timezone}
                  title="Select a timezone"
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-bg"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-text-secondary mb-1.5 uppercase tracking-wide">
                  Date Format
                </label>
                <select
                  value={dateFormat}
                  title="Select a date format"
                  onChange={(e) => setDateFormat(e.target.value)}
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-bg"
                >
                  {DATE_FORMATS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border-t border-border pt-5">
              <h3 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
                <Bell size={14} />
                Notification Preferences
              </h3>
              <div className="space-y-3">
                {[
                  { key: "push", label: "Push Notifications", value: pushEnabled, set: setPushEnabled },
                  { key: "email", label: "Email Notifications", value: emailNotifications, set: setEmailNotifications },
                  { key: "weekly", label: "Weekly Summary", value: weeklySummary, set: setWeeklySummary },
                  { key: "monthly", label: "Monthly Report", value: monthlyReport, set: setMonthlyReport },
                ].map((item) => (
                  <label key={item.key} className="flex items-center justify-between py-2">
                    <span className="text-sm text-text-primary">{item.label}</span>
                    <button
                      type="button"
                      onClick={() => item.set(!item.value)}
                      className={`w-10 h-5 rounded-full transition-colors relative ${
                        item.value ? "bg-primary" : "bg-gray-300"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          item.value ? "translate-x-5" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Security */}
        {activeSection === "security" && (
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
                <KeyRound size={14} />
                Change Password
              </h3>
              <div className="space-y-3">
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Current password"
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-bg"
                />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password"
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-bg"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-bg"
                />
                <button
                  onClick={handleChangePassword}
                  disabled={saving}
                  className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Update Password"}
                </button>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <h3 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
                <Mail size={14} />
                Change Email
              </h3>
              <div className="space-y-3">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="New email address"
                  className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-bg"
                />
                <p className="text-xs text-text-secondary">
                  A verification email will be sent to the new address.
                </p>
                <button
                  onClick={handleChangeEmail}
                  disabled={saving}
                  className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving ? "Sending..." : "Send Verification"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Danger Zone */}
        {activeSection === "danger" && (
          <div className="p-6">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
              <h3 className="text-base font-bold text-red-600 mb-2 flex items-center gap-2">
                <AlertTriangle size={16} />
                Delete Account
              </h3>
              <p className="text-sm text-red-700 mb-4 leading-relaxed">
                This action is permanent and cannot be undone. All your data
                including transactions, analytics, and shared lists will be
                permanently deleted.
              </p>

              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="bg-red-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors"
                >
                  Delete My Account
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-red-600 font-medium">
                    Type <span className="font-mono bg-red-100 px-1.5 py-0.5 rounded">DELETE</span> to confirm
                  </p>
                  <input
                    type="text"
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder='Type "DELETE"'
                    className="w-full border border-red-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-500 bg-white"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={handleDeleteAccount}
                      disabled={saving || deleteConfirm !== "DELETE"}
                      className="bg-red-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      {saving ? "Deleting..." : "Confirm Delete"}
                    </button>
                    <button
                      onClick={() => { setShowDeleteConfirm(false); setDeleteConfirm(""); }}
                      className="bg-bg border border-border text-text-secondary hover:text-text-primary hover:bg-card px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Save button */}
        {activeSection !== "security" && activeSection !== "danger" && (
          <div className="px-6 pb-6">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-primary text-white w-full py-3 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;