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
import { useThemeColors } from "../context/useThemeColors";
import { changeLanguage } from "../lib/i18n";
import { useTheme } from "../context/ThemeContext";

type Section = "general" | "personal" | "preferences" | "security" | "danger";

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { resolvedTheme } = useTheme();

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

  const s = makeStyles(colors);

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
      const prefs = data.notification_preferences;
      setPushEnabled(prefs?.push_enabled ?? true);
      setEmailNotifications(prefs?.email_notifications ?? true);
      setWeeklySummary(prefs?.weekly_summary ?? false);
      setMonthlyReport(prefs?.monthly_report ?? true);
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
      if (language !== i18n.language) {
        changeLanguage(language);
      }
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
      Alert.alert(t("profile.avatar"), t("profile.avatarPickHint"));
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
        email: user.email!, password: deletePassword,
      });
      if (signInError) throw new Error(t("profile.wrongPassword"));
      await supabase.from("profiles").delete().eq("id", user.id);
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
    label: string, value: string,
    options: { code?: string; value?: string; name?: string; label?: string }[],
    onChange: (v: string) => void
  ) => (
    <View style={s.pickerGroup}>
      <Text style={s.pickerLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={s.pickerOptions}>
          {options.map((opt) => {
            const val = opt.code || opt.value || "";
            const display = opt.name || opt.label || val;
            const isSelected = value === val;
            return (
              <TouchableOpacity
                key={val}
                style={[s.pickerChip, isSelected && s.pickerChipActive]}
                onPress={() => onChange(val)}
              >
                <Text style={[s.pickerChipText, isSelected && s.pickerChipTextActive]}>
                  {display}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );

  const sections: { key: Section; label: string }[] = [
    { key: "general", label: t("profile.general") },
    { key: "personal", label: t("profile.personal") },
    { key: "preferences", label: t("profile.preferences") },
    { key: "security", label: t("profile.security") },
    { key: "danger", label: t("profile.dangerZone") },
  ];

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={{ paddingBottom: 60 }}>
      <View style={[s.header, { paddingTop: insets.top + 20 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backBtnText}>← {t("common.back")}</Text>
        </TouchableOpacity>
        <Text style={s.title}>{t("profile.title")}</Text>
      </View>

      <View style={s.avatarSection}>
        <TouchableOpacity onPress={handleAvatarPick} style={s.avatarContainer}>
          {profile?.avatar_url ? (
            <Image source={{ uri: profile.avatar_url }} style={s.avatar} />
          ) : (
            <View style={s.avatarPlaceholder}>
              <Text style={s.avatarPlaceholderText}>
                {fullName ? fullName.charAt(0).toUpperCase() : "?"}
              </Text>
            </View>
          )}
          {avatarUploading && (
            <View style={s.avatarOverlay}><ActivityIndicator color="#fff" /></View>
          )}
        </TouchableOpacity>
        <Text style={s.avatarHint}>{t("profile.tapToChange")}</Text>
        {profile?.avatar_url && (
          <TouchableOpacity onPress={handleRemoveAvatar}>
            <Text style={s.removeAvatarText}>{t("profile.removePhoto")}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={s.sectionTabs}>
        {sections.map((sec) => (
          <TouchableOpacity
            key={sec.key}
            style={[s.sectionTab, activeSection === sec.key && s.sectionTabActive]}
            onPress={() => setActiveSection(sec.key)}
          >
            <Text style={[s.sectionTabText, activeSection === sec.key && s.sectionTabTextActive]}>
              {sec.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeSection === "general" && (
        <View style={s.card}>
          <Text style={s.inputLabel}>{t("profile.fullName")}</Text>
          <TextInput style={s.input} value={fullName} onChangeText={setFullName} placeholder={t("profile.fullNamePlaceholder")} placeholderTextColor={colors.placeholder} />
          <Text style={s.inputLabel}>{t("profile.username")}</Text>
          <TextInput style={s.input} value={username} onChangeText={setUsername} placeholder={t("profile.usernamePlaceholder")} placeholderTextColor={colors.placeholder} autoCapitalize="none" />
        </View>
      )}

      {activeSection === "personal" && (
        <View style={s.card}>
          <Text style={s.inputLabel}>{t("profile.phone")}</Text>
          <TextInput style={s.input} value={phone} onChangeText={setPhone} placeholder="+94 77 123 4567" placeholderTextColor={colors.placeholder} keyboardType="phone-pad" />
          <Text style={s.inputLabel}>{t("profile.dateOfBirth")}</Text>
          <TextInput style={s.input} value={dateOfBirth} onChangeText={setDateOfBirth} placeholder="YYYY-MM-DD" placeholderTextColor={colors.placeholder} />
          <Text style={s.inputLabel}>{t("profile.country")}</Text>
          {renderPicker("", country, COUNTRIES.map((c) => ({ code: c.code, name: c.name })), setCountry)}
        </View>
      )}

      {activeSection === "preferences" && (
        <View style={s.card}>
          {renderPicker(t("profile.currency"), currency, ["LKR", "USD", "EUR", "GBP", "INR", "AUD", "JPY", "CAD"].map((c) => ({ code: c, name: c })), setCurrency)}
          {renderPicker(t("profile.language"), language, LANGUAGES, setLanguage)}
          {renderPicker(t("profile.timezone"), timezone, TIMEZONES.map((tz) => ({ code: tz, name: tz })), setTimezone)}
          {renderPicker(t("profile.dateFormat"), dateFormat, DATE_FORMATS.map((f) => ({ code: f.value, name: f.label })), setDateFormat)}

          <Text style={s.sectionLabel}>{t("profile.notifications")}</Text>
          {[
            { key: "push", label: t("profile.pushNotifications"), value: pushEnabled, set: setPushEnabled },
            { key: "email", label: t("profile.emailNotifications"), value: emailNotifications, set: setEmailNotifications },
            { key: "weekly", label: t("profile.weeklySummary"), value: weeklySummary, set: setWeeklySummary },
            { key: "monthly", label: t("profile.monthlyReport"), value: monthlyReport, set: setMonthlyReport },
          ].map((item) => (
            <TouchableOpacity key={item.key} style={s.toggleRow} onPress={() => item.set(!item.value)}>
              <Text style={s.toggleLabel}>{item.label}</Text>
              <View style={[s.toggleSwitch, item.value && s.toggleSwitchActive]}>
                <View style={[s.toggleKnob, item.value && s.toggleKnobActive]} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {activeSection === "security" && (
        <View style={s.card}>
          <Text style={s.sectionLabel}>{t("profile.changePassword")}</Text>
          <TextInput style={s.input} value={currentPassword} onChangeText={setCurrentPassword} placeholder={t("profile.currentPassword")} placeholderTextColor={colors.placeholder} secureTextEntry />
          <TextInput style={s.input} value={newPassword} onChangeText={setNewPassword} placeholder={t("profile.newPassword")} placeholderTextColor={colors.placeholder} secureTextEntry />
          <TextInput style={s.input} value={confirmPassword} onChangeText={setConfirmPassword} placeholder={t("profile.confirmPassword")} placeholderTextColor={colors.placeholder} secureTextEntry />
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.primary }]} onPress={handleChangePassword} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.actionBtnText}>{t("profile.updatePassword")}</Text>}
          </TouchableOpacity>

          <View style={s.divider} />

          <Text style={s.sectionLabel}>{t("profile.changeEmail")}</Text>
          <TextInput style={s.input} value={newEmail} onChangeText={setNewEmail} placeholder={t("profile.newEmail")} placeholderTextColor={colors.placeholder} keyboardType="email-address" autoCapitalize="none" />
          <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.primary }]} onPress={handleChangeEmail} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.actionBtnText}>{t("profile.sendVerification")}</Text>}
          </TouchableOpacity>
        </View>
      )}

      {activeSection === "danger" && (
        <View style={s.dangerCard}>
          <Text style={s.dangerTitle}>{t("profile.deleteAccount")}</Text>
          <Text style={s.dangerDesc}>{t("profile.deleteAccountDesc")}</Text>
          {!showDeleteConfirm ? (
            <TouchableOpacity style={s.dangerBtn} onPress={() => setShowDeleteConfirm(true)}>
              <Text style={s.dangerBtnText}>{t("profile.deleteAccount")}</Text>
            </TouchableOpacity>
          ) : (
            <View>
              <TextInput style={s.input} value={deletePassword} onChangeText={setDeletePassword} placeholder={t("profile.enterPassword")} placeholderTextColor={colors.placeholder} secureTextEntry />
              <View style={s.dangerActions}>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.expense, flex: 1 }]} onPress={handleDeleteAccount} disabled={saving}>
                  {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.actionBtnText}>{t("profile.confirmDelete")}</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={[s.actionBtn, { backgroundColor: colors.textMuted, flex: 1 }]} onPress={() => setShowDeleteConfirm(false)}>
                  <Text style={s.actionBtnText}>{t("common.cancel")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      {activeSection !== "security" && activeSection !== "danger" && (
        <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnText}>{t("common.save")}</Text>}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20 },
  header: { marginBottom: 20 },
  backBtn: { marginBottom: 10 },
  backBtnText: { fontSize: 16, color: colors.primary, fontWeight: "600" },
  title: { fontSize: 28, fontWeight: "800", color: colors.text },
  avatarSection: { alignItems: "center", marginBottom: 24 },
  avatarContainer: { width: 100, height: 100, borderRadius: 50, overflow: "hidden", backgroundColor: colors.surfaceAlt, position: "relative" },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.primary, justifyContent: "center", alignItems: "center" },
  avatarPlaceholderText: { fontSize: 36, fontWeight: "800", color: "#fff" },
  avatarOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)", borderRadius: 50, justifyContent: "center", alignItems: "center" },
  avatarHint: { fontSize: 12, color: colors.textMuted, marginTop: 8 },
  removeAvatarText: { fontSize: 13, color: colors.expense, fontWeight: "600", marginTop: 4 },
  sectionTabs: { flexDirection: "row", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  sectionTab: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  sectionTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  sectionTabText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  sectionTabTextActive: { color: "#fff" },
  card: { backgroundColor: colors.card, padding: 20, borderRadius: 20, marginTop: 8, borderWidth: 1, borderColor: colors.cardBorder },
  inputLabel: { fontSize: 13, fontWeight: "700", color: colors.textSecondary, marginBottom: 6, marginTop: 14, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { borderWidth: 1, borderColor: colors.inputBorder, padding: 14, borderRadius: 12, fontSize: 15, backgroundColor: colors.inputBg, color: colors.text, marginBottom: 4 },
  pickerGroup: { marginBottom: 16 },
  pickerLabel: { fontSize: 13, fontWeight: "700", color: colors.textSecondary, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  pickerOptions: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  pickerChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  pickerChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pickerChipText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
  pickerChipTextActive: { color: "#fff" },
  sectionLabel: { fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 12, marginTop: 8 },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  toggleLabel: { fontSize: 14, fontWeight: "500", color: colors.text },
  toggleSwitch: { width: 44, height: 24, borderRadius: 12, backgroundColor: colors.border, justifyContent: "center", paddingHorizontal: 2 },
  toggleSwitchActive: { backgroundColor: colors.primary },
  toggleKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff" },
  toggleKnobActive: { alignSelf: "flex-end" },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 20 },
  actionBtn: { padding: 14, borderRadius: 12, alignItems: "center", marginTop: 12 },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  saveBtn: { backgroundColor: colors.primary, padding: 16, borderRadius: 16, alignItems: "center", marginTop: 24 },
  saveBtnText: { color: "#fff", fontWeight: "800", fontSize: 17 },
  dangerCard: { backgroundColor: colors.card, padding: 20, borderRadius: 20, marginTop: 8, borderWidth: 1, borderColor: colors.expense, borderLeftWidth: 4, borderLeftColor: colors.expense },
  dangerTitle: { fontSize: 16, fontWeight: "800", color: colors.danger, marginBottom: 6 },
  dangerDesc: { fontSize: 13, color: colors.textSecondary, marginBottom: 16, lineHeight: 20 },
  dangerBtn: { backgroundColor: colors.expense, padding: 14, borderRadius: 12, alignItems: "center" },
  dangerBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  dangerActions: { flexDirection: "row", gap: 10, marginTop: 12 },
});
