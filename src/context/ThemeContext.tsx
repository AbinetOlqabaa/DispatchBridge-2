import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  ThemeMode,
  EffectiveTheme,
  THEME_STORAGE_KEY,
  isThemeMode,
  resolveEffectiveTheme,
  getNextThemeMode,
  readStoredThemeMode,
} from '../utils/themeUtils.js';

export type { ThemeMode, EffectiveTheme };

interface ThemeContextType {
  themeMode: ThemeMode;
  effectiveTheme: EffectiveTheme;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  cycleThemeMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return true;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyDocumentTheme(resolved: EffectiveTheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.remove('light');
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
    root.setAttribute('data-theme', 'light');
    root.style.colorScheme = 'light';
  }

  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', resolved === 'dark' ? '#020617' : '#f8fafc');
  }
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() =>
    readStoredThemeMode(typeof window !== 'undefined' ? window.localStorage : null)
  );

  const [effectiveTheme, setEffectiveTheme] = useState<EffectiveTheme>(() =>
    resolveEffectiveTheme(
      readStoredThemeMode(typeof window !== 'undefined' ? window.localStorage : null),
      getSystemPrefersDark()
    )
  );

  const syncTheme = useCallback((mode: ThemeMode) => {
    const resolved = resolveEffectiveTheme(mode, getSystemPrefersDark());
    setEffectiveTheme(resolved);
    applyDocumentTheme(resolved);
  }, []);

  const setThemeMode = useCallback(
    (mode: ThemeMode) => {
      setThemeModeState(mode);
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, mode);
      } catch {
        // Ignore storage write errors
      }
      syncTheme(mode);
    },
    [syncTheme]
  );

  const toggleTheme = useCallback(() => {
    const nextMode: ThemeMode = effectiveTheme === 'dark' ? 'light' : 'dark';
    setThemeMode(nextMode);
  }, [effectiveTheme, setThemeMode]);

  const cycleThemeMode = useCallback(() => {
    setThemeMode(getNextThemeMode(themeMode));
  }, [themeMode, setThemeMode]);

  useEffect(() => {
    syncTheme(themeMode);

    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        if (themeMode === 'system') {
          syncTheme('system');
        }
      };

      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
      } else if (typeof mediaQuery.addListener === 'function') {
        mediaQuery.addListener(handleChange);
        return () => mediaQuery.removeListener(handleChange);
      }
    }
  }, [themeMode, syncTheme]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY && isThemeMode(event.newValue)) {
        setThemeModeState(event.newValue);
        syncTheme(event.newValue);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [syncTheme]);

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        effectiveTheme,
        setThemeMode,
        toggleTheme,
        cycleThemeMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
