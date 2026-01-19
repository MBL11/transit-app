/**
 * Settings Screen
 * Configure language, theme, and other app settings
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { useTheme } from '../contexts/ThemeContext';
import { useThemeColors } from '../hooks/useThemeColors';
import { changeLanguage } from '../i18n';
import * as favoritesStorage from '../core/favorites';
import type { ThemeMode } from '../hooks/useColorScheme';

const LANGUAGES = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
];

const THEMES: Array<{ mode: ThemeMode; icon: string }> = [
  { mode: 'light', icon: '☀️' },
  { mode: 'dark', icon: '🌙' },
  { mode: 'system', icon: '⚙️' },
];

export function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { mode: themeMode, setThemeMode } = useTheme();
  const colors = useThemeColors();

  const currentLanguage = i18n.language;

  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleLanguageChange = async (languageCode: string) => {
    try {
      await changeLanguage(languageCode);
      console.log('[Settings] Language changed to:', languageCode);
    } catch (error) {
      console.error('[Settings] Error changing language:', error);
      Alert.alert(t('common.error'), t('common.error'));
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      t('settings.clearCache'),
      t('settings.clearCacheConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: async () => {
            // Clear cache logic here
            Alert.alert(t('common.confirm'), t('settings.cacheCleared'));
          },
        },
      ]
    );
  };

  const handleClearFavorites = () => {
    Alert.alert(
      t('settings.clearFavorites'),
      t('settings.clearFavoritesConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: async () => {
            await favoritesStorage.clearAllFavorites();
            Alert.alert(t('common.confirm'), t('settings.favoritesCleared'));
          },
        },
      ]
    );
  };

  return (
    <ScreenContainer>
      <ScreenHeader title={t('settings.title')} />
      <ScrollView style={styles.container}>
      {/* Language Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
        {LANGUAGES.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[
              styles.languageItem,
              currentLanguage === lang.code && styles.languageItemActive,
            ]}
            onPress={() => handleLanguageChange(lang.code)}
          >
            <View style={styles.languageLeft}>
              <Text style={styles.flag}>{lang.flag}</Text>
              <Text
                style={[
                  styles.languageName,
                  currentLanguage === lang.code && styles.languageNameActive,
                ]}
              >
                {lang.name}
              </Text>
            </View>
            {currentLanguage === lang.code && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Theme Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.theme')}</Text>
        {THEMES.map((theme) => (
          <TouchableOpacity
            key={theme.mode}
            style={[
              styles.languageItem,
              themeMode === theme.mode && styles.languageItemActive,
            ]}
            onPress={() => setThemeMode(theme.mode)}
          >
            <View style={styles.languageLeft}>
              <Text style={styles.flag}>{theme.icon}</Text>
              <Text
                style={[
                  styles.languageName,
                  themeMode === theme.mode && styles.languageNameActive,
                ]}
              >
                {t(`settings.${theme.mode}Mode`)}
              </Text>
            </View>
            {themeMode === theme.mode && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Data Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.data')}</Text>

        <TouchableOpacity style={styles.button} onPress={handleClearCache}>
          <Text style={styles.buttonText}>{t('settings.clearCache')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.buttonDanger]}
          onPress={handleClearFavorites}
        >
          <Text style={[styles.buttonText, styles.buttonTextDanger]}>
            {t('settings.clearFavorites')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* About Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.about')}</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('settings.version')}</Text>
          <Text style={styles.infoValue}>1.0.0</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('settings.dataSource')}</Text>
          <Text style={styles.infoValue}>Île-de-France Mobilités</Text>
        </View>
      </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.backgroundSecondary,
    },
    section: {
      backgroundColor: colors.card,
      marginTop: 20,
      paddingVertical: 12,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      paddingHorizontal: 20,
      paddingBottom: 8,
    },
    languageItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    languageItemActive: {
      backgroundColor: colors.activeBackground,
    },
    languageLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    flag: {
      fontSize: 24,
      marginRight: 12,
    },
    languageName: {
      fontSize: 16,
      color: colors.text,
    },
    languageNameActive: {
      color: colors.activeText,
      fontWeight: '600',
    },
    checkmark: {
      fontSize: 20,
      color: colors.activeText,
      fontWeight: 'bold',
    },
    button: {
      backgroundColor: colors.buttonBackground,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    buttonDanger: {
      backgroundColor: colors.isDark ? '#3D1A1A' : '#FFF5F5',
    },
    buttonText: {
      fontSize: 16,
      color: colors.primary,
      fontWeight: '500',
    },
    buttonTextDanger: {
      color: colors.error,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    infoLabel: {
      fontSize: 16,
      color: colors.text,
    },
    infoValue: {
      fontSize: 16,
      color: colors.textSecondary,
    },
  });
