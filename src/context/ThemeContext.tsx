import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

type ThemeMode = 'light' | 'dark';
type UiLanguage = 'ar' | 'en';
type AiLanguage = 'ar_eg' | 'ar_msa' | 'en';

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  uiLang: UiLanguage;
  setUiLang: (lang: UiLanguage) => void;
  aiLang: AiLanguage;
  setAiLang: (lang: AiLanguage) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, updatePreferences } = useAuth();
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('rel_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [uiLang, setUiLangState] = useState<UiLanguage>(() => {
    const saved = localStorage.getItem('rel_ui_lang');
    return saved === 'en' ? 'en' : 'ar';
  });

  const [aiLang, setAiLangState] = useState<AiLanguage>(() => {
    const saved = localStorage.getItem('rel_ai_lang');
    return (saved as AiLanguage) || 'ar_eg';
  });

  // Sync with profile if loaded
  useEffect(() => {
    if (profile?.themePreference && (profile.themePreference === 'light' || profile.themePreference === 'dark')) {
      setTheme(profile.themePreference);
    }
    if (profile?.languagePreference) {
      setUiLangState(profile.languagePreference);
    }
    if (profile?.aiResponseLanguage) {
      setAiLangState(profile.aiResponseLanguage);
    }
  }, [profile]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('rel_theme', theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('lang', uiLang);
    root.setAttribute('dir', uiLang === 'ar' ? 'rtl' : 'ltr');
    localStorage.setItem('rel_ui_lang', uiLang);
  }, [uiLang]);

  const toggleTheme = () => {
    const nextTheme: ThemeMode = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    updatePreferences({ themePreference: nextTheme }).catch(() => {});
  };

  const setUiLang = (lang: UiLanguage) => {
    setUiLangState(lang);
    localStorage.setItem('rel_ui_lang', lang);
    updatePreferences({ languagePreference: lang }).catch(() => {});
  };

  const setAiLang = (lang: AiLanguage) => {
    setAiLangState(lang);
    localStorage.setItem('rel_ai_lang', lang);
    updatePreferences({ aiResponseLanguage: lang }).catch(() => {});
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, uiLang, setUiLang, aiLang, setAiLang }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
