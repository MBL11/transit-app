import { useState, useEffect, useCallback } from 'react';
import { useColorScheme as useNativeColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';

export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_KEY = '@transit_theme';

export function useColorScheme() {
  const systemScheme = useNativeColorScheme();
  const [mode, setMode] = useState<ThemeMode>('system');
  const [loaded, setLoaded] = useState(true);

  // Charge le thème sauvegardé
  useEffect(() => {
    logger.log('[useColorScheme] Loading theme from storage...');
    AsyncStorage.getItem(THEME_KEY)
      .then((saved) => {
        logger.log('[useColorScheme] Theme loaded:', saved);
        if (saved && ['light', 'dark', 'system'].includes(saved)) {
          setMode(saved as ThemeMode);
        }
        setLoaded(true);
        logger.log('[useColorScheme] Theme ready');
      })
      .catch((error) => {
        logger.error('[useColorScheme] Error loading theme:', error);
        setLoaded(true); // Set loaded anyway to prevent blocking
      });
  }, []);

  // Sauvegarde le thème quand il change
  const setThemeMode = useCallback(async (newMode: ThemeMode) => {
    setMode(newMode);
    await AsyncStorage.setItem(THEME_KEY, newMode);
  }, []);

  // Calcule le thème actif
  const activeTheme = mode === 'system' ? (systemScheme || 'light') : mode;
  const isDark = activeTheme === 'dark';

  return {
    mode,
    setThemeMode,
    activeTheme,
    isDark,
    loaded,
  };
}
