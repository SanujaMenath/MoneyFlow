import { View, Text, TouchableOpacity, Alert, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from "react-i18next";
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { useCurrency } from '../../context/CurrencyContext';
import { useSavingsGoal } from '../../context/SavingsGoalContext';
import { useTheme, type ThemeMode } from '../../context/ThemeContext';
import { useThemeColors } from '../../context/useThemeColors';
import { changeLanguage } from '../../lib/i18n';
import { Ionicons } from "@expo/vector-icons";

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currency, setCurrency, currencies } = useCurrency();
  const { savingsGoalPercent, setSavingsGoalPercent } = useSavingsGoal();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const colors = useThemeColors();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const s = makeStyles(colors, insets);

  async function handleSignOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: any) {
      Alert.alert(t("common.error"), error.message);
    }
  }

  const adjustGoal = (delta: number) => {
    setSavingsGoalPercent(Math.max(0, Math.min(50, savingsGoalPercent + delta)));
  };

  const themeOptions: { mode: ThemeMode; icon: string; label: string }[] = [
    { mode: "light", icon: "sunny", label: "Light" },
    { mode: "dark", icon: "moon", label: "Dark" },
    { mode: "system", icon: "phone-portrait", label: "System" },
  ];

  const languageOptions = [
    { code: "en", label: "English" },
    { code: "si", label: "සිංහල" },
  ];

  return (
    <ScrollView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>{t("settings.title")}</Text>
      </View>

      {/* Profile */}
      <TouchableOpacity style={s.profileCard} onPress={() => router.push("/profile")}>
        <View style={s.profileIcon}>
          <Ionicons name="person" size={20} color={colors.primary} />
        </View>
        <View style={s.profileInfo}>
          <Text style={s.profileName}>{t("settings.myProfile")}</Text>
          <Text style={s.profileDesc}>{t("settings.myProfileDesc")}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </TouchableOpacity>

      {/* Theme */}
      <View style={s.card}>
        <Text style={s.sectionTitle}>Theme</Text>
        <Text style={s.description}>Choose your preferred appearance</Text>
        <View style={s.themeRow}>
          {themeOptions.map((opt) => (
            <TouchableOpacity
              key={opt.mode}
              style={[s.themeBtn, theme === opt.mode && s.themeBtnActive]}
              onPress={() => setTheme(opt.mode)}
            >
              <Ionicons
                name={opt.icon as any}
                size={22}
                color={theme === opt.mode ? "#fff" : colors.textSecondary}
              />
              <Text style={[s.themeLabel, theme === opt.mode && s.themeLabelActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Language */}
      <View style={s.card}>
        <Text style={s.sectionTitle}>{t("profile.language")}</Text>
        <Text style={s.description}>Switch between available languages</Text>
        <View style={s.langRow}>
          {languageOptions.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[s.langBtn, i18n.language === lang.code && s.langBtnActive]}
              onPress={() => changeLanguage(lang.code)}
            >
              <Text style={[s.langLabel, i18n.language === lang.code && s.langLabelActive]}>
                {lang.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Savings Goal */}
      <View style={s.card}>
        <Text style={s.sectionTitle}>{t("settings.savingsGoal")}</Text>
        <Text style={s.description}>{t("settings.savingsGoalDesc")}</Text>
        <View style={s.goalRow}>
          <TouchableOpacity style={s.goalBtn} onPress={() => adjustGoal(-5)}>
            <Text style={s.goalBtnText}>-5%</Text>
          </TouchableOpacity>
          <View style={s.goalValueBox}>
            <Text style={s.goalValue}>{savingsGoalPercent}%</Text>
          </View>
          <TouchableOpacity style={s.goalBtn} onPress={() => adjustGoal(5)}>
            <Text style={s.goalBtnText}>+5%</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.hint}>
          {t("settings.savePercent", { percent: savingsGoalPercent })}
        </Text>
      </View>

      {/* Currency */}
      <View style={s.card}>
        <Text style={s.sectionTitle}>{t("settings.currency")}</Text>
        <View style={s.currencyGrid}>
          {currencies.map((c) => (
            <TouchableOpacity
              key={c.code}
              style={[s.currencyBtn, currency.code === c.code && s.currencyBtnActive]}
              onPress={() => setCurrency(c)}
            >
              <Text style={[s.currencyCode, currency.code === c.code && s.currencyCodeActive]}>
                {c.code}
              </Text>
              <Text style={[s.currencySymbol, currency.code === c.code && s.currencySymbolActive]}>
                {c.symbol}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Sign Out */}
      <TouchableOpacity onPress={handleSignOut} style={s.signOutBtn}>
        <Text style={s.signOutText}>{t("settings.signOut")}</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const makeStyles = (colors: any, insets: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20 },
  header: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text, paddingTop: insets.top + 20 },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, padding: 16, borderRadius: 16, marginTop: 16, borderWidth: 1, borderColor: colors.cardBorder },
  profileIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 15, fontWeight: '700', color: colors.text },
  profileDesc: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  card: { backgroundColor: colors.card, padding: 20, borderRadius: 20, marginTop: 16, borderWidth: 1, borderColor: colors.cardBorder },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 8 },
  description: { fontSize: 13, color: colors.textMuted, marginBottom: 16 },
  themeRow: { flexDirection: 'row', gap: 10 },
  themeBtn: { flex: 1, padding: 14, borderRadius: 14, alignItems: 'center', backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, gap: 6 },
  themeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  themeLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  themeLabelActive: { color: '#fff' },
  langRow: { flexDirection: 'row', gap: 10 },
  langBtn: { flex: 1, padding: 14, borderRadius: 14, alignItems: 'center', backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  langBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  langLabel: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  langLabelActive: { color: '#fff' },
  goalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  goalBtn: { backgroundColor: colors.surfaceAlt, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  goalBtnText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  goalValueBox: { backgroundColor: colors.primary, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16 },
  goalValue: { fontSize: 28, fontWeight: '900', color: '#fff' },
  hint: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 12 },
  currencyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  currencyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, minWidth: 80, justifyContent: 'center' },
  currencyBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  currencyCode: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  currencyCodeActive: { color: '#fff' },
  currencySymbol: { fontSize: 16, fontWeight: '600', color: colors.textMuted },
  currencySymbolActive: { color: '#bfdbfe' },
  signOutBtn: { backgroundColor: colors.expense, padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 24 },
  signOutText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
