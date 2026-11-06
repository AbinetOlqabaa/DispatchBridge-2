import test from 'node:test';
import assert from 'node:assert/strict';
import {
  THEME_STORAGE_KEY,
  isThemeMode,
  resolveEffectiveTheme,
  getNextThemeMode,
  readStoredThemeMode,
} from './themeUtils';

test('resolveEffectiveTheme handles explicit light, explicit dark, and system device mode', () => {
  assert.equal(resolveEffectiveTheme('light', true), 'light');
  assert.equal(resolveEffectiveTheme('light', false), 'light');
  assert.equal(resolveEffectiveTheme('dark', false), 'dark');
  assert.equal(resolveEffectiveTheme('dark', true), 'dark');
  assert.equal(resolveEffectiveTheme('system', true), 'dark');
  assert.equal(resolveEffectiveTheme('system', false), 'light');
});

test('isThemeMode validates allowed theme modes', () => {
  assert.equal(isThemeMode('dark'), true);
  assert.equal(isThemeMode('light'), true);
  assert.equal(isThemeMode('system'), true);
  assert.equal(isThemeMode('auto'), false);
  assert.equal(isThemeMode(null), false);
});

test('getNextThemeMode cycles through dark, light, and system device mode', () => {
  assert.equal(getNextThemeMode('dark'), 'light');
  assert.equal(getNextThemeMode('light'), 'system');
  assert.equal(getNextThemeMode('system'), 'dark');
});

test('readStoredThemeMode reads persisted theme mode or falls back safely', () => {
  const store = new Map<string, string>();
  const mockStorage = {
    getItem: (key: string) => store.get(key) ?? null,
  };

  assert.equal(readStoredThemeMode(mockStorage), 'dark');
  store.set(THEME_STORAGE_KEY, 'light');
  assert.equal(readStoredThemeMode(mockStorage), 'light');
  store.set(THEME_STORAGE_KEY, 'system');
  assert.equal(readStoredThemeMode(mockStorage), 'system');
  store.set(THEME_STORAGE_KEY, 'invalid-mode');
  assert.equal(readStoredThemeMode(mockStorage), 'dark');
});
