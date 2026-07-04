import { useTheme } from "./ThemeContext";
import Colors from "../constants/Colors";

export function useThemeColors() {
  const { resolvedTheme } = useTheme();
  return Colors[resolvedTheme];
}
