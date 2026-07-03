import { View, Text, TouchableOpacity, Alert, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { useCurrency } from '../../context/CurrencyContext';
import { useSavingsGoal } from '../../context/SavingsGoalContext';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currency, setCurrency, currencies, format } = useCurrency();
  const { savingsGoalPercent, setSavingsGoalPercent } = useSavingsGoal();

  async function handleSignOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: any) {
      Alert.alert("Sign Out Error", error.message);
    }
  }

  const adjustGoal = (delta: number) => {
    setSavingsGoalPercent(Math.max(0, Math.min(50, savingsGoalPercent + delta)));
  };

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.title}>Settings</Text>
      </View>

      {/* Savings Goal */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Savings Goal</Text>
        <Text style={styles.description}>Set a percentage of your income to save each month.</Text>
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
          Save {savingsGoalPercent}% of every paycheck to reach your goal.
        </Text>
      </View>

      {/* Currency */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Currency</Text>
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
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 20 },
  header: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '800', color: '#1e293b' },
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
