import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../lib/supabase';

const MIN_AUTH_INTERVAL_MS = 2000;
let lastAuthAttempt = 0;

export const Auth = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 6) {
      alert(t("auth.passwordTooShort", "Password must be at least 6 characters long."));
      return;
    }

    const now = Date.now();
    if (now - lastAuthAttempt < MIN_AUTH_INTERVAL_MS) {
      alert("Please wait a moment before trying again.");
      return;
    }
    lastAuthAttempt = now;

    setLoading(true);
    
    const { error } = isSignUp 
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (error) alert(error.message);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg p-4">
      <div className="max-w-md w-full space-y-8 bg-card p-8 rounded-2xl border border-border shadow-sm">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-text-primary">MoneyFlow Cloud</h2>
          <p className="text-text-secondary mt-2">
            {isSignUp ? "Create your account to start syncing" : "Sign in to access your data"}
          </p>
        </div>
        <form className="mt-8 space-y-4" onSubmit={handleAuth}>
          <input
            type="email"
            placeholder={t("auth.emailLabel")}
            className="w-full px-4 py-3 rounded-xl border border-border outline-none focus:ring-2 focus:ring-primary/20 bg-card text-text-primary"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder={t("auth.passwordLabel")}
            className="w-full px-4 py-3 rounded-xl border border-border outline-none focus:ring-2 focus:ring-primary/20 bg-card text-text-primary"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Please wait...</span>
              </>
            ) : (
              isSignUp ? t("auth.signUp") : t("auth.signIn")
            )}
          </button>
        </form>
        <button 
          onClick={() => setIsSignUp(!isSignUp)}
          disabled={loading}
          className="w-full text-xs text-text-secondary hover:text-primary transition-colors disabled:opacity-50"
        >
          {isSignUp ? "Already have an account? Sign In" : "Need an account? Sign Up"}
        </button>
      </div>
    </div>
  );
};
