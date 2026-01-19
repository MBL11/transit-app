/**
 * Theme Context
 * Provides theme mode and dark/light switching capabilities throughout the app
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useColorScheme, ThemeMode } from '../hooks/useColorScheme';

interface ThemeContextType {
  mode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  activeTheme: 'light' | 'dark';
  isDark: boolean;
  loaded: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const colorScheme = useColorScheme();

  return (
    <ThemeContext.Provider value={colorScheme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
