/**
 * Settings Screen
 * Configure language, theme, and other app settings
 */

import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { ScreenContainer } from '../components/ui/ScreenContainer';
import { useTheme } from '../contexts/ThemeContext';
import { useThemeColors } from '../hooks/useThemeColors';
import { useGTFSData } from '../hooks/useGTFSData';
import { useNetwork } from '../contexts/NetworkContext';
import { useNotificationPermissions } from '../hooks/useNotifications';
import { changeLanguage } from '../i18n';
import * as favoritesStorage from '../core/favorites';
import * as notificationService from '../services/notifications';
import { trackEvent, AnalyticsEvents } from '../services/analytics';
import type { ThemeMode } from '../hooks/useColorScheme';
import type { SettingsStackParamList } from '../navigation/SettingsStackNavigator';

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

type Props = NativeStackScreenProps<SettingsStackParamList, 'SettingsList'>;

export function SettingsScreen({ navigation }: Props) {
  const { t, i18n } = useTranslation();
  const { mode: themeMode, setThemeMode } = useTheme();
  const colors = useThemeColors();
  const { isLoaded, lastUpdate, source, needsUpdate } = useGTFSData();
  const { isOffline } = useNetwork();
  const { isGranted, requestPermissions } = useNotificationPermissions();

  const currentLanguage = i18n.language;
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);

  const styles = useMemo(() => createStyles(colors), [colors]);

  // Load notification settings on mount
  useEffect(() => {
    loadNotificationSettings();
  }, []);

  const loadNotificationSettings = async () => {
    const enabled = await notificationService.areNotificationsEnabled();
    setNotificationsEnabled(enabled);
  };

  const handleLanguageChange = async (languageCode: string) => {
    try {
      await changeLanguage(languageCode);
      trackEvent(AnalyticsEvents.LANGUAGE_CHANGED, { language: languageCode });
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

  const handleNotificationToggle = async (value: boolean) => {
    setIsLoadingNotifications(true);

    try {
      if (value) {
        // Enabling notifications
        if (!isGranted) {
          const granted = await requestPermissions();
          if (!granted) {
            Alert.alert(
              t('settings.notificationsPermissionDenied'),
              t('settings.notificationsPermissionDeniedMessage')
            );
            setIsLoadingNotifications(false);
            return;
          }
        }

        const success = await notificationService.enableNotifications();
        if (success) {
          setNotificationsEnabled(true);
          trackEvent(AnalyticsEvents.NOTIFICATIONS_TOGGLED, { enabled: true });
          Alert.alert(
            t('settings.notificationsEnabled'),
            t('settings.notificationsEnabledMessage')
          );
        } else {
          Alert.alert(t('common.error'), t('settings.notificationsEnableFailed'));
        }
      } else {
        // Disabling notifications
        await notificationService.disableNotifications();
        setNotificationsEnabled(false);
        trackEvent(AnalyticsEvents.NOTIFICATIONS_TOGGLED, { enabled: false });
        Alert.alert(
          t('settings.notificationsDisabled'),
          t('settings.notificationsDisabledMessage')
        );
      }
    } catch (error) {
      console.error('[Settings] Failed to toggle notifications:', error);
      Alert.alert(t('common.error'), t('common.error'));
    } finally {
      setIsLoadingNotifications(false);
    }
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
            onPress={() => {
              setThemeMode(theme.mode);
              trackEvent(AnalyticsEvents.THEME_CHANGED, { theme: theme.mode });
            }}
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

      {/* Notifications Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.notifications')}</Text>

        <View style={styles.notificationItem}>
          <View style={styles.notificationLeft}>
            <Text style={styles.flag}>🔔</Text>
            <View style={styles.notificationTextContainer}>
              <Text style={styles.notificationTitle}>
                {t('settings.enableNotifications')}
              </Text>
              <Text style={styles.notificationDescription}>
                {t('settings.notificationsDescription')}
              </Text>
            </View>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleNotificationToggle}
            disabled={isLoadingNotifications}
            trackColor={{ false: colors.borderLight, true: colors.primary }}
            thumbColor={notificationsEnabled ? colors.activeText : colors.textSecondary}
          />
        </View>

        {notificationsEnabled && (
          <View style={styles.notificationInfo}>
            <Text style={styles.notificationInfoText}>
              ℹ️ {t('settings.notificationsInfo')}
            </Text>
          </View>
        )}
      </View>

      {/* Data Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('settings.data')}</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('DataManagement')}
        >
          <Text style={styles.buttonText}>📊 {t('data.title')}</Text>
        </TouchableOpacity>

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
          <Text style={styles.infoValue}>{source || 'Sample Data'}</Text>
        </View>
        {lastUpdate && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('data.lastUpdate')}</Text>
            <Text style={styles.infoValue}>
              {lastUpdate.toLocaleDateString(i18n.language)}
            </Text>
          </View>
        )}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('common.status')}</Text>
          <Text style={[styles.infoValue, !isOffline && styles.statusOnline]}>
            {isOffline ? '📡 ' + t('common.offline') : '✅ ' + t('common.online')}
          </Text>
        </View>
        {needsUpdate && needsUpdate() && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              ⚠️ {t('data.outdated')}
            </Text>
          </View>
        )}
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
    statusOnline: {
      color: '#10B981',
      fontWeight: '600',
    },
    warningBox: {
      backgroundColor: colors.isDark ? '#92400E' : '#FEF3C7',
      padding: 12,
      marginHorizontal: 20,
      marginTop: 8,
      marginBottom: 8,
      borderRadius: 6,
    },
    warningText: {
      color: colors.isDark ? '#FCD34D' : '#92400E',
      fontSize: 14,
      textAlign: 'center',
    },
    notificationItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    notificationLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: 12,
    },
    notificationTextContainer: {
      flex: 1,
    },
    notificationTitle: {
      fontSize: 16,
      color: colors.text,
      fontWeight: '500',
    },
    notificationDescription: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 2,
    },
    notificationInfo: {
      backgroundColor: colors.isDark ? '#1E3A8A' : '#DBEAFE',
      padding: 12,
      marginHorizontal: 20,
      marginTop: 8,
      marginBottom: 8,
      borderRadius: 6,
    },
    notificationInfoText: {
      color: colors.isDark ? '#93C5FD' : '#1E40AF',
      fontSize: 13,
    },
  });
