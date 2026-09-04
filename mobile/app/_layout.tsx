import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { View, StatusBar } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import '../lib/i18n';
import AuthScreen from './auth';
import { CurrencyProvider } from '../context/CurrencyContext';
import { SavingsGoalProvider } from '../context/SavingsGoalContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import Colors from '../constants/Colors';

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootLayoutInner() {
  const [session, setSession] = useState<Session | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const { resolvedTheme } = useTheme();
  const colors = Colors[resolvedTheme];

  useEffect(() => {
    const initSession = async () => {
      try {
        const { data: { session: restored } } = await supabase.auth.getSession();

        if (restored) {
          const { error } = await supabase.auth.getUser();
          if (error) {
            console.warn("Session validation failed, signing out:", error.message);
            await supabase.auth.signOut();
            setSession(null);
          } else {
            setSession(restored);
          }
        } else {
          setSession(null);
        }
      } catch (err) {
        console.error("Session init error:", err);
        setSession(null);
      } finally {
        setIsInitializing(false);
        // Dismiss the native splash screen cleanly
        await SplashScreen.hideAsync().catch(() => {});
      }
    };

    initSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (isInitializing) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <CurrencyProvider>
      <SavingsGoalProvider>
        <StatusBar barStyle={resolvedTheme === "dark" ? "light-content" : "dark-content"} backgroundColor={colors.background} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            headerTitleStyle: { color: colors.text, fontWeight: "700" },
            headerShadowVisible: false,
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="add"
            options={{
              presentation: "modal",
              headerShown: true,
              title: "New Transaction",
              headerTitleAlign: "center",
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.text,
              headerTitleStyle: { color: colors.text, fontWeight: "700", fontSize: 18 },
              headerShadowVisible: false,
            }}
          />
          <Stack.Screen name="profile" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
      </SavingsGoalProvider>
    </CurrencyProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutInner />
    </ThemeProvider>
  );
}