import { View, Text, TouchableOpacity, Alert, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from "react-i18next";
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { useCurrency } from '../../context/CurrencyContext';
import { useSavingsGoal } from '../../context/SavingsGoalContext';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currency, setCurrency, currencies, format } = useCurrency();
  const { savingsGoalPercent, setSavingsGoalPercent } = useSavingsGoal();

  async function handleSignOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: any) {
      Alert.alert(t("settings.signOut"), error.message);
    }
  }

  const adjustGoal = (delta: number) => {
    setSavingsGoalPercent(Math.max(0, Math.min(50, savingsGoalPercent + delta)));
  };

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.title}>{t("settings.title")}</Text>
      </View>

      {/* Profile */}
      <TouchableOpacity style={styles.profileCard} onPress={() => router.push("/profile")}>
        <View style={styles.profileIcon}>
          <Text style={styles.profileIconText}>👤</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{t("settings.myProfile")}</Text>
          <Text style={styles.profileDesc}>{t("settings.myProfileDesc")}</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>

      {/* Savings Goal */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t("settings.savingsGoal")}</Text>
        <Text style={styles.description}>{t("settings.savingsGoalDesc")}</Text>
        <View style={styles.goalRow}>
          <TouchableOpacity style={styles.goalBtn} onPress={() => adjustGoal(-5)}>
            <Text style={styles.goalBtnText}>-5%</Text>
          </TouchableOpacity>
          <View style={styles.goalValueBox}>
            <Text style={styles.goalValue}>{savingsGoalPercent}%</Text>
          </View>
          <TouchableOpacity style={styles.goalBtn} onPress={() => adjustGoal(5)}>
            <Text style={styles.goalBtnText}>+5%</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.hint}>
          {t("settings.savePercent", { percent: savingsGoalPercent })}
        </Text>
      </View>

      {/* Currency */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t("settings.currency")}</Text>
        <View style={styles.currencyGrid}>
          {currencies.map((c) => (
            <TouchableOpacity
              key={c.code}
              style={[styles.currencyBtn, currency.code === c.code && styles.currencyBtnActive]}
              onPress={() => setCurrency(c)}
            >
              <Text style={[styles.currencyCode, currency.code === c.code && styles.currencyCodeActive]}>
                {c.code}
              </Text>
              <Text style={[styles.currencySymbol, currency.code === c.code && styles.currencySymbolActive]}>
                {c.symbol}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Sign Out */}
      <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
        <Text style={styles.signOutText}>{t("settings.signOut")}</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 20 },
  header: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '800', color: '#1e293b' },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, marginTop: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  profileIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  profileIconText: { fontSize: 20 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  profileDesc: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  chevron: { fontSize: 24, color: '#94a3b8', fontWeight: '300' },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 20, marginTop: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 8 },
  description: { fontSize: 13, color: '#94a3b8', marginBottom: 16 },
  goalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  goalBtn: { backgroundColor: '#f1f5f9', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  goalBtnText: { fontSize: 14, fontWeight: '700', color: '#2563eb' },
  goalValueBox: { backgroundColor: '#2563eb', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16 },
  goalValue: { fontSize: 28, fontWeight: '900', color: '#fff' },
  hint: { fontSize: 12, color: '#94a3b8', textAlign: 'center', marginTop: 12 },
  currencyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  currencyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0', minWidth: 80, justifyContent: 'center' },
  currencyBtnActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  currencyCode: { fontSize: 14, fontWeight: '700', color: '#475569' },
  currencyCodeActive: { color: '#fff' },
  currencySymbol: { fontSize: 16, fontWeight: '600', color: '#94a3b8' },
  currencySymbolActive: { color: '#bfdbfe' },
  signOutBtn: { backgroundColor: '#ef4444', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 24 },
  signOutText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
