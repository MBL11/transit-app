/**
 * useThemeColors hook
 * Provides theme-aware colors for StyleSheet-based components
 */

import { useTheme } from '../contexts/ThemeContext';

export function useThemeColors() {
  const { isDark } = useTheme();

  return {
    // Theme state
    isDark,

    // Color values
    // Background colors
    background: isDark ? '#121212' : '#FFFFFF',
    backgroundSecondary: isDark ? '#1E1E1E' : '#F5F5F5',
    card: isDark ? '#1E1E1E' : '#F5F5F5',

    // Text colors
    text: isDark ? '#FAFAFA' : '#000000',
    textSecondary: isDark ? '#A3A3A3' : '#737373',
    textMuted: isDark ? '#737373' : '#A3A3A3',

    // Border colors
    border: isDark ? '#323232' : '#E5E5E5',
    borderLight: isDark ? '#282828' : '#F0F0F0',

    // Status colors (same in light/dark)
    primary: '#0066CC',
    success: '#00AA55',
    warning: '#FF6600',
    error: '#DC143C',

    // Transit colors (same in light/dark)
    metro: '#003366',
    bus: '#00AA55',
    tram: '#CC0000',
    rer: '#7B68EE',

    // UI element colors
    inputBackground: isDark ? '#1E1E1E' : '#FFFFFF',
    buttonBackground: isDark ? '#282828' : '#F9F9F9',
    activeBackground: isDark ? '#1A3A5C' : '#E6F2FF',
    activeText: '#0066CC',
  };
}
