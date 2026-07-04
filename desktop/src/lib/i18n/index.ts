import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import si from "./locales/si.json";

const STORAGE_KEY = "mf_language";

function getSavedLanguage(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "si") return saved;
  } catch {}
  return "en";
}

const savedLng = getSavedLanguage();

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    si: { translation: si },
  },
  lng: savedLng,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
  returnNull: false,
  returnEmptyString: false,
});

export function changeLanguage(lng: string) {
  i18n.changeLanguage(lng);
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch {}
}

export default i18n;
