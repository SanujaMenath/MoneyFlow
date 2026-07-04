import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { supabase } from "../lib/supabase";
import { useThemeColors } from "../context/useThemeColors";

export default function AuthScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const s = makeStyles(colors, insets);

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAuth() {
    if (!email || !password) {
      Alert.alert(t("common.error"), t("auth.fillAllFields"));
      return;
    }
    if (password.length < 6) {
      Alert.alert(t("common.error"), t("auth.passwordTooShort"));
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        Alert.alert(t("common.success"), t("auth.checkEmail"));
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error: any) {
      Alert.alert(t("common.error"), error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}>
        <View style={s.headerSection}>
          <Text style={s.appName}>{t("auth.moneyFlow")}</Text>
          <Text style={s.subtitle}>
            {isSignUp ? t("auth.signUpTitle") : t("auth.signInTitle")}
          </Text>
        </View>

        <View style={s.formSection}>
          <Text style={s.label}>{t("auth.emailLabel")}</Text>
          <TextInput
            style={s.input}
            placeholder={t("auth.emailPlaceholder")}
            placeholderTextColor={colors.placeholder}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={s.label}>{t("auth.passwordLabel")}</Text>
          <TextInput
            style={s.input}
            placeholder={t("auth.passwordPlaceholder")}
            placeholderTextColor={colors.placeholder}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={s.authBtn}
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.authBtnText}>
                {isSignUp ? t("auth.signUp") : t("auth.signIn")}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={s.switchBtn}>
            <Text style={s.switchText}>
              {isSignUp ? t("auth.goToSignIn") : t("auth.goToSignUp")}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: any, insets: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerSection: { alignItems: "center", marginBottom: 40 },
  appName: { fontSize: 36, fontWeight: "900", color: colors.primary },
  subtitle: { fontSize: 15, color: colors.textMuted, marginTop: 8, textAlign: "center" },
  formSection: { width: "100%", maxWidth: 400, alignSelf: "center" },
  label: { fontSize: 13, fontWeight: "700", color: colors.textSecondary, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { borderWidth: 1, borderColor: colors.inputBorder, padding: 16, borderRadius: 14, fontSize: 16, backgroundColor: colors.inputBg, color: colors.text, marginBottom: 16 },
  authBtn: { backgroundColor: colors.primary, padding: 16, borderRadius: 16, alignItems: "center", marginTop: 8 },
  authBtnText: { color: "#fff", fontWeight: "800", fontSize: 17 },
  switchBtn: { alignItems: "center", marginTop: 20 },
  switchText: { color: colors.primary, fontWeight: "600", fontSize: 14 },
});
