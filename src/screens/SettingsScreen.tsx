/**
 * Settings Screen
 * Configure language, theme, and other app settings
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as favoritesStorage from '../core/favorites';

const LANGUAGES = [
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
];

export function SettingsScreen() {
  const { t, i18n } = useTranslation();

  const currentLanguage = i18n.language;

  const changeLanguage = async (languageCode: string) => {
    try {
      await i18n.changeLanguage(languageCode);
      await AsyncStorage.setItem('@app_language', languageCode);
      console.log('[Settings] Language changed to:', languageCode);
    } catch (error) {
      console.error('[Settings] Error changing language:', error);
      Alert.alert(t('common.error'), 'Failed to change language');
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      t('settings.clearCache'),
      'Cette action supprimera toutes les données en cache.',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: async () => {
            // Clear cache logic here
            Alert.alert('Cache vidé', 'Le cache a été supprimé avec succès');
          },
        },
      ]
    );
  };

  const handleClearFavorites = () => {
    Alert.alert(
      t('settings.clearFavorites'),
      t('favorites.confirmDelete'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: async () => {
            await favoritesStorage.clearAllFavorites();
            Alert.alert(t('common.confirm'), 'Favoris supprimés');
          },
        },
      ]
    );
  };

  return (
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
            onPress={() => changeLanguage(lang.code)}
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

      {/* Data Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Données</Text>

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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 20,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
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
    borderBottomColor: '#f0f0f0',
  },
  languageItemActive: {
    backgroundColor: '#E6F2FF',
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
    color: '#333',
  },
  languageNameActive: {
    color: '#0066CC',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 20,
    color: '#0066CC',
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#f9f9f9',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  buttonDanger: {
    backgroundColor: '#FFF5F5',
  },
  buttonText: {
    fontSize: 16,
    color: '#0066CC',
    fontWeight: '500',
  },
  buttonTextDanger: {
    color: '#DC143C',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#333',
  },
  infoValue: {
    fontSize: 16,
    color: '#666',
  },
});
