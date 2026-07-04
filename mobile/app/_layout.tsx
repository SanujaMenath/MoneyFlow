import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import '../lib/i18n';
import AuthScreen from './auth';
import { CurrencyProvider } from '../context/CurrencyContext';
import { SavingsGoalProvider } from '../context/SavingsGoalContext';

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsInitializing(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (isInitializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <CurrencyProvider>
      <SavingsGoalProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="add" options={{ presentation: 'modal', headerShown: true, title: 'New Transaction' }} />
          <Stack.Screen name="+not-found" />
        </Stack>
      </SavingsGoalProvider>
    </CurrencyProvider>
  );
}
