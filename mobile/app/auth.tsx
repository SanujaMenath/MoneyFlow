import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  ActivityIndicator,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

const buttonShadow = Platform.select({
  web: { boxShadow: "0 4px 8px rgba(37,99,235,0.2)" },
  default: { elevation: 4, shadowColor: '#2563eb', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
});

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  async function handleAuth() {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: Platform.select({
            web: window.location.origin,
            default: 'moneyflowmobile://',
          }),
        }
      });
      if (error) Alert.alert("Sign Up Error", error.message);
      else Alert.alert("Success", "Check your email for the confirmation link!");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) Alert.alert("Login Error", error.message);
    }
    
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>MoneyFlow</Text>
          <Text style={styles.subtitle}>
            {isSignUp ? 'Create an account to start tracking' : 'Welcome back, let’s manage your flow'}
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Email Address</Text>
          <TextInput 
            placeholder="e.g. sanuja@example.com" 
            style={styles.input} 
            value={email}
            onChangeText={setEmail} 
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.passwordContainer}>
            <TextInput 
              placeholder="Your secure password" 
              style={styles.passwordInput}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword} 
            />
            <TouchableOpacity 
              style={styles.eyeButton}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons 
                name={showPassword ? "eye-off" : "eye"} 
                size={22} 
                color="#64748b" 
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled, buttonShadow]} 
            onPress={handleAuth} 
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{isSignUp ? 'Sign Up' : 'Sign In'}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setIsSignUp(!isSignUp)} 
            style={styles.toggleContainer}
          >
            <Text style={styles.toggleText}>
              {isSignUp 
                ? 'Already have an account? Sign In' 
                : "Don't have an account? Sign Up"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 25 },
  header: { marginBottom: 40 },
  title: { fontSize: 36, fontWeight: '900', color: '#2563eb', letterSpacing: -1 },
  subtitle: { fontSize: 16, color: '#64748b', marginTop: 8 },
  form: { width: '100%' },
  label: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginBottom: 8, marginLeft: 4 },
  input: { 
    backgroundColor: '#f8fafc',
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    padding: 16, 
    borderRadius: 16, 
    marginBottom: 20,
    fontSize: 16,
    color: '#1e293b'
  },
  passwordContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  passwordInput: { 
    backgroundColor: '#f8fafc',
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    padding: 16, 
    borderRadius: 16, 
    fontSize: 16,
    color: '#1e293b',
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingLeft: 8,
  },
  button: { 
    backgroundColor: '#2563eb', 
    padding: 18, 
    borderRadius: 16, 
    alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: '#94a3b8' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  toggleContainer: { marginTop: 25, alignItems: 'center' },
  toggleText: { color: '#64748b', fontSize: 14, fontWeight: '500' }
});