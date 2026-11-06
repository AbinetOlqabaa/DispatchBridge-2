export type ThemeMode = 'dark' | 'light' | 'system';
export type EffectiveTheme = 'dark' | 'light';

export const THEME_STORAGE_KEY = 'dispatchbridge_theme';

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'dark' || value === 'light' || value === 'system';
}

export function resolveEffectiveTheme(
  mode: ThemeMode,
  systemPrefersDark: boolean
): EffectiveTheme {
  if (mode === 'system') {
    return systemPrefersDark ? 'dark' : 'light';
  }
  return mode;
}

export function getNextThemeMode(current: ThemeMode): ThemeMode {
  if (current === 'dark') return 'light';
  if (current === 'light') return 'system';
  return 'dark';
}

export function readStoredThemeMode(
  storage: Pick<Storage, 'getItem'> | null | undefined
): ThemeMode {
  try {
    if (!storage) return 'dark';
    const raw = storage.getItem(THEME_STORAGE_KEY);
    if (isThemeMode(raw)) {
      return raw;
    }
  } catch {
    // Ignore storage security errors
  }
  return 'dark';
}
