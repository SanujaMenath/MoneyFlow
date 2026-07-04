import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, ScrollView, Platform, Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useRouter } from "expo-router";
import { supabase } from "../lib/supabase";
import {
  getProfile, updateProfile, uploadAvatar, deleteAvatar,
} from "../services/profileService";
import type { Profile, ProfileUpdate } from "@moneyflow/shared";
import {
  COUNTRIES, LANGUAGES, TIMEZONES, DATE_FORMATS,
} from "@moneyflow/shared";

type Section =
  | "general"
  | "personal"
  | "preferences"
  | "security"
  | "danger";

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>("general");

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [country, setCountry] = useState("");
  const [currency, setCurrency] = useState("LKR");
  const [language, setLanguage] = useState("en");
  const [timezone, setTimezone] = useState("UTC");
  const [dateFormat, setDateFormat] = useState("YYYY-MM-DD");
  const [dashboardView, setDashboardView] = useState("overview");
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState(false);
  const [monthlyReport, setMonthlyReport] = useState(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/auth");
        return;
      }
      const data = await getProfile(user.id);
      setProfile(data);
      setFullName(data.full_name || "");
      setUsername(data.username || "");
      setPhone(data.phone || "");
      setDateOfBirth(data.date_of_birth || "");
      setCountry(data.country || "");
      setCurrency(data.currency || "LKR");
      setLanguage(data.language || "en");
      setTimezone(data.timezone || "UTC");
      setDateFormat(data.date_format || "YYYY-MM-DD");
      setDashboardView(data.default_dashboard_view || "overview");
      setPushEnabled(data.notification_preferences?.push_enabled ?? true);
      setEmailNotifications(data.notification_preferences?.email_notifications ?? true);
      setWeeklySummary(data.notification_preferences?.weekly_summary ?? false);
      setMonthlyReport(data.notification_preferences?.monthly_report ?? true);
    } catch (error: any) {
      Alert.alert(t("common.error"), error.message);
    } finally {
      setLoading(false);
    }
  }

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
        default_dashboard_view: dashboardView,
        notification_preferences: {
          push_enabled: pushEnabled,
          email_notifications: emailNotifications,
          weekly_summary: weeklySummary,
          monthly_report: monthlyReport,
        },
      };

      await updateProfile(user.id, updates);
      Alert.alert(t("common.success"), t("profile.saved"));
    } catch (error: any) {
      Alert.alert(t("common.error"), error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarPick() {
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = async (e: any) => {
        const file = e.target?.files?.[0];
        if (!file) return;

        setAvatarUploading(true);
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
          await uploadAvatar(user.id, file, ext);
          await loadProfile();
        } catch (err: any) {
          Alert.alert(t("common.error"), err.message);
        } finally {
          setAvatarUploading(false);
        }
      };
      input.click();
    } else {
      Alert.alert(
        t("profile.avatar"),
        t("profile.avatarPickHint")
      );
    }
  }

  async function handleRemoveAvatar() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await deleteAvatar(user.id);
      await loadProfile();
    } catch (error: any) {
      Alert.alert(t("common.error"), error.message);
    }
  }

  async function handleChangePassword() {
    if (newPassword !== confirmPassword) {
      Alert.alert(t("common.error"), t("profile.passwordsDoNotMatch"));
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert(t("common.error"), t("auth.passwordTooShort"));
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      Alert.alert(t("common.success"), t("profile.passwordChanged"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      Alert.alert(t("common.error"), error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleChangeEmail() {
    if (!newEmail.includes("@")) {
      Alert.alert(t("common.error"), t("profile.invalidEmail"));
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      Alert.alert(t("common.success"), t("profile.emailSent"));
      setNewEmail("");
    } catch (error: any) {
      Alert.alert(t("common.error"), error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount() {
    if (deletePassword.length === 0) {
      Alert.alert(t("common.error"), t("profile.enterPassword"));
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: deletePassword,
      });
      if (signInError) throw new Error(t("profile.wrongPassword"));

      const { error: deleteError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", user.id);
      if (deleteError) throw deleteError;

      await supabase.auth.signOut();
      router.replace("/auth");
    } catch (error: any) {
      Alert.alert(t("common.error"), error.message);
    } finally {
      setSaving(false);
      setShowDeleteConfirm(false);
    }
  }

  const renderPicker = (
    label: string,
    value: string,
    options: { code?: string; value?: string; name?: string; label?: string }[],
    onChange: (v: string) => void
  ) => (
    <View style={styles.pickerGroup}>
      <Text style={styles.pickerLabel}>{label}</Text>
      <View style={styles.pickerOptions}>
        {options.map((opt) => {
          const val = opt.code || opt.value || "";
          const display = opt.name || opt.label || val;
          const isSelected = value === val;
          return (
            <TouchableOpacity
              key={val}
              style={[styles.pickerChip, isSelected && styles.pickerChipActive]}
              onPress={() => onChange(val)}
            >
              <Text style={[styles.pickerChipText, isSelected && styles.pickerChipTextActive]}>
                {display}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const sections: { key: Section; label: string; icon: string }[] = [
    { key: "general", label: t("profile.general"), icon: "person" },
    { key: "personal", label: t("profile.personal"), icon: "info" },
    { key: "preferences", label: t("profile.preferences"), icon: "settings" },
    { key: "security", label: t("profile.security"), icon: "lock" },
    { key: "danger", label: t("profile.dangerZone"), icon: "warning" },
  ];

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 60 }}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← {t("common.back")}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t("profile.title")}</Text>
      </View>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={handleAvatarPick} style={styles.avatarContainer}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarPlaceholderText}>
                {fullName ? fullName.charAt(0).toUpperCase() : "?"}
              </Text>
            </View>
          )}
          {avatarUploading && (
            <View style={styles.avatarOverlay}>
              <ActivityIndicator color="#fff" />
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.avatarHint}>{t("profile.tapToChange")}</Text>
        {profile?.avatar_url && (
          <TouchableOpacity onPress={handleRemoveAvatar}>
            <Text style={styles.removeAvatarText}>{t("profile.removePhoto")}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Section Tabs */}
      <View style={styles.sectionTabs}>
        {sections.map((sec) => (
          <TouchableOpacity
            key={sec.key}
            style={[styles.sectionTab, activeSection === sec.key && styles.sectionTabActive]}
            onPress={() => setActiveSection(sec.key)}
          >
            <Text style={[styles.sectionTabText, activeSection === sec.key && styles.sectionTabTextActive]}>
              {sec.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeSection === "general" && (
        <View style={styles.card}>
          <Text style={styles.inputLabel}>{t("profile.fullName")}</Text>
          <TextInput
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            placeholder={t("profile.fullNamePlaceholder")}
          />

          <Text style={styles.inputLabel}>{t("profile.username")}</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder={t("profile.usernamePlaceholder")}
            autoCapitalize="none"
          />
        </View>
      )}

      {activeSection === "personal" && (
        <View style={styles.card}>
          <Text style={styles.inputLabel}>{t("profile.phone")}</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+94 77 123 4567"
            keyboardType="phone-pad"
          />

          <Text style={styles.inputLabel}>{t("profile.dateOfBirth")}</Text>
          <TextInput
            style={styles.input}
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
            placeholder="YYYY-MM-DD"
          />

          <Text style={styles.inputLabel}>{t("profile.country")}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerScroll}>
            {COUNTRIES.map((c) => (
              <TouchableOpacity
                key={c.code}
                style={[styles.pickerChip, country === c.code && styles.pickerChipActive]}
                onPress={() => setCountry(c.code)}
              >
                <Text style={[styles.pickerChipText, country === c.code && styles.pickerChipTextActive]}>
                  {c.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {activeSection === "preferences" && (
        <View style={styles.card}>
          {renderPicker(t("profile.currency"), currency,
            ["LKR", "USD", "EUR", "GBP", "INR", "AUD", "JPY", "CAD"].map((c) => ({ code: c, name: c })),
            setCurrency
          )}
          {renderPicker(t("profile.language"), language, LANGUAGES, setLanguage)}
          {renderPicker(t("profile.timezone"), timezone,
            TIMEZONES.map((tz) => ({ code: tz, name: tz })),
            setTimezone
          )}
          {renderPicker(t("profile.dateFormat"), dateFormat,
            DATE_FORMATS.map((f) => ({ code: f.value, name: f.label })),
            setDateFormat
          )}

          <Text style={styles.sectionLabel}>{t("profile.notifications")}</Text>
          {[
            { key: "push", label: t("profile.pushNotifications"), value: pushEnabled, set: setPushEnabled },
            { key: "email", label: t("profile.emailNotifications"), value: emailNotifications, set: setEmailNotifications },
            { key: "weekly", label: t("profile.weeklySummary"), value: weeklySummary, set: setWeeklySummary },
            { key: "monthly", label: t("profile.monthlyReport"), value: monthlyReport, set: setMonthlyReport },
          ].map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.toggleRow}
              onPress={() => item.set(!item.value)}
            >
              <Text style={styles.toggleLabel}>{item.label}</Text>
              <View style={[styles.toggleSwitch, item.value && styles.toggleSwitchActive]}>
                <View style={[styles.toggleKnob, item.value && styles.toggleKnobActive]} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {activeSection === "security" && (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>{t("profile.changePassword")}</Text>
          <TextInput
            style={styles.input}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder={t("profile.currentPassword")}
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder={t("profile.newPassword")}
            secureTextEntry
          />
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder={t("profile.confirmPassword")}
            secureTextEntry
          />
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#2563eb" }]}
            onPress={handleChangePassword}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.actionBtnText}>{t("profile.updatePassword")}</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider} />

          <Text style={styles.sectionLabel}>{t("profile.changeEmail")}</Text>
          <TextInput
            style={styles.input}
            value={newEmail}
            onChangeText={setNewEmail}
            placeholder={t("profile.newEmail")}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#2563eb" }]}
            onPress={handleChangeEmail}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.actionBtnText}>{t("profile.sendVerification")}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {activeSection === "danger" && (
        <View style={styles.dangerCard}>
          <Text style={styles.dangerTitle}>{t("profile.deleteAccount")}</Text>
          <Text style={styles.dangerDesc}>{t("profile.deleteAccountDesc")}</Text>

          {!showDeleteConfirm ? (
            <TouchableOpacity
              style={styles.dangerBtn}
              onPress={() => setShowDeleteConfirm(true)}
            >
              <Text style={styles.dangerBtnText}>{t("profile.deleteAccount")}</Text>
            </TouchableOpacity>
          ) : (
            <View>
              <TextInput
                style={styles.input}
                value={deletePassword}
                onChangeText={setDeletePassword}
                placeholder={t("profile.enterPassword")}
                secureTextEntry
              />
              <View style={styles.dangerActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: "#ef4444", flex: 1 }]}
                  onPress={handleDeleteAccount}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.actionBtnText}>{t("profile.confirmDelete")}</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: "#64748b", flex: 1 }]}
                  onPress={() => setShowDeleteConfirm(false)}
                >
                  <Text style={styles.actionBtnText}>{t("common.cancel")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      {activeSection !== "security" && activeSection !== "danger" && (
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>{t("common.save")}</Text>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", paddingHorizontal: 20 },
  header: { marginBottom: 20 },
  backBtn: { marginBottom: 10 },
  backBtnText: { fontSize: 16, color: "#2563eb", fontWeight: "600" },
  title: { fontSize: 28, fontWeight: "800", color: "#1e293b" },

  avatarSection: { alignItems: "center", marginBottom: 24 },
  avatarContainer: { width: 100, height: 100, borderRadius: 50, overflow: "hidden", backgroundColor: "#e2e8f0", position: "relative" },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: "#2563eb", justifyContent: "center", alignItems: "center" },
  avatarPlaceholderText: { fontSize: 36, fontWeight: "800", color: "#fff" },
  avatarOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)", borderRadius: 50, justifyContent: "center", alignItems: "center" },
  avatarHint: { fontSize: 12, color: "#94a3b8", marginTop: 8 },
  removeAvatarText: { fontSize: 13, color: "#ef4444", fontWeight: "600", marginTop: 4 },

  sectionTabs: { flexDirection: "row", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  sectionTab: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: "#f1f5f9", borderWidth: 1, borderColor: "#e2e8f0" },
  sectionTabActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  sectionTabText: { fontSize: 13, fontWeight: "600", color: "#64748b" },
  sectionTabTextActive: { color: "#fff" },

  card: { backgroundColor: "#fff", padding: 20, borderRadius: 20, marginTop: 8, borderWidth: 1, borderColor: "#e2e8f0" },
  inputLabel: { fontSize: 13, fontWeight: "700", color: "#64748b", marginBottom: 6, marginTop: 14, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { borderWidth: 1, borderColor: "#e2e8f0", padding: 14, borderRadius: 12, fontSize: 15, backgroundColor: "#f8fafc", marginBottom: 4 },

  pickerGroup: { marginBottom: 16 },
  pickerLabel: { fontSize: 13, fontWeight: "700", color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  pickerScroll: { maxHeight: 80 },
  pickerOptions: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pickerChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, backgroundColor: "#f1f5f9", borderWidth: 1, borderColor: "#e2e8f0" },
  pickerChipActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  pickerChipText: { fontSize: 12, fontWeight: "600", color: "#475569" },
  pickerChipTextActive: { color: "#fff" },

  sectionLabel: { fontSize: 14, fontWeight: "700", color: "#1e293b", marginBottom: 12, marginTop: 8 },

  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  toggleLabel: { fontSize: 14, fontWeight: "500", color: "#334155" },
  toggleSwitch: { width: 44, height: 24, borderRadius: 12, backgroundColor: "#cbd5e1", justifyContent: "center", paddingHorizontal: 2 },
  toggleSwitchActive: { backgroundColor: "#2563eb" },
  toggleKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff" },
  toggleKnobActive: { alignSelf: "flex-end" },

  divider: { height: 1, backgroundColor: "#e2e8f0", marginVertical: 20 },

  actionBtn: { padding: 14, borderRadius: 12, alignItems: "center", marginTop: 12 },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  saveBtn: { backgroundColor: "#2563eb", padding: 16, borderRadius: 16, alignItems: "center", marginTop: 24 },
  saveBtnText: { color: "#fff", fontWeight: "800", fontSize: 17 },

  dangerCard: { backgroundColor: "#fff", padding: 20, borderRadius: 20, marginTop: 8, borderWidth: 1, borderColor: "#fecaca", borderLeftWidth: 4, borderLeftColor: "#ef4444" },
  dangerTitle: { fontSize: 16, fontWeight: "800", color: "#dc2626", marginBottom: 6 },
  dangerDesc: { fontSize: 13, color: "#64748b", marginBottom: 16, lineHeight: 20 },
  dangerBtn: { backgroundColor: "#ef4444", padding: 14, borderRadius: 12, alignItems: "center" },
  dangerBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  dangerActions: { flexDirection: "row", gap: 10, marginTop: 12 },
});
