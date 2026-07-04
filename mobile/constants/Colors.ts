export interface ColorPalette {
  background: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderLight: string;
  primary: string;
  primaryLight: string;
  income: string;
  expense: string;
  danger: string;
  dangerLight: string;
  success: string;
  tabBar: string;
  tabBarBorder: string;
  tabIconDefault: string;
  tabIconSelected: string;
  card: string;
  cardBorder: string;
  inputBg: string;
  inputBorder: string;
  placeholder: string;
  headerBg: string;
  overlay: string;
  skeleton: string;
}

const light: ColorPalette = {
  background: "#f8fafc",
  surface: "#ffffff",
  surfaceAlt: "#f1f5f9",
  text: "#1e293b",
  textSecondary: "#64748b",
  textMuted: "#94a3b8",
  border: "#e2e8f0",
  borderLight: "#f1f5f9",
  primary: "#2563eb",
  primaryLight: "#eff6ff",
  income: "#10b981",
  expense: "#ef4444",
  danger: "#dc2626",
  dangerLight: "#fef2f2",
  success: "#16a34a",
  tabBar: "#ffffff",
  tabBarBorder: "#e2e8f0",
  tabIconDefault: "#94a3b8",
  tabIconSelected: "#2563eb",
  card: "#ffffff",
  cardBorder: "#e2e8f0",
  inputBg: "#f8fafc",
  inputBorder: "#e2e8f0",
  placeholder: "#94a3b8",
  headerBg: "#ffffff",
  overlay: "rgba(0,0,0,0.5)",
  skeleton: "#e2e8f0",
};

const dark: ColorPalette = {
  background: "#0f172a",
  surface: "#1e293b",
  surfaceAlt: "#334155",
  text: "#f1f5f9",
  textSecondary: "#94a3b8",
  textMuted: "#64748b",
  border: "#334155",
  borderLight: "#1e293b",
  primary: "#3b82f6",
  primaryLight: "#1e3a5f",
  income: "#34d399",
  expense: "#f87171",
  danger: "#ef4444",
  dangerLight: "#3b1a1a",
  success: "#22c55e",
  tabBar: "#1e293b",
  tabBarBorder: "#334155",
  tabIconDefault: "#64748b",
  tabIconSelected: "#3b82f6",
  card: "#1e293b",
  cardBorder: "#334155",
  inputBg: "#334155",
  inputBorder: "#475569",
  placeholder: "#64748b",
  headerBg: "#1e293b",
  overlay: "rgba(0,0,0,0.7)",
  skeleton: "#334155",
};

const palette = { light, dark };

export default palette;
export type ThemeColors = typeof light;
