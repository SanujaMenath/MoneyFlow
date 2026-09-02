import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { View, ActivityIndicator, StatusBar } from 'react-native';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import '../lib/i18n';
import AuthScreen from './auth';
import { CurrencyProvider } from '../context/CurrencyContext';
import { SavingsGoalProvider } from '../context/SavingsGoalContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import Colors from '../constants/Colors';

function RootLayoutInner() {
  const [session, setSession] = useState<Session | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const { resolvedTheme } = useTheme();
  const colors = Colors[resolvedTheme];

  useEffect(() => {
    const initSession = async () => {
      try {
        // Restore persisted session
        const { data: { session: restored } } = await supabase.auth.getSession();

        if (restored) {
          // H-07: Validate the JWT with the server so that an expired/revoked
          // token does not silently pass the session guard.  getUser() makes a
          // network round-trip to the Supabase Auth server; if the token is
          // invalid it returns an error and we sign the user out immediately.
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
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
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
