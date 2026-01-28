/**
 * i18n Configuration
 * Multi-language support with automatic language detection
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import translations
import fr from '../locales/fr.json';
import en from '../locales/en.json';
import es from '../locales/es.json';
import ru from '../locales/ru.json';
import tr from '../locales/tr.json';

const resources = {
  fr: { translation: fr },
  en: { translation: en },
  es: { translation: es },
  ru: { translation: ru },
  tr: { translation: tr },
};

// Supported languages
const supportedLanguages = ['fr', 'en', 'es', 'ru', 'tr'];

// Get device locale (first 2 chars: 'en-US' -> 'en')
const deviceLocale = Localization.getLocales()[0]?.languageCode || 'en';

// Fallback to 'tr' (Turkish) if device language not supported - İzmir-focused app
const fallbackLocale = supportedLanguages.includes(deviceLocale) ? deviceLocale : 'tr';

// Initialize i18n with async storage
const initI18n = async () => {
  // Load saved language from AsyncStorage
  const savedLanguage = await AsyncStorage.getItem('app_language');
  const initialLanguage = savedLanguage || fallbackLocale;

  await i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: initialLanguage,
      fallbackLng: 'tr', // İzmir-focused app defaults to Turkish
      interpolation: {
        escapeValue: false, // React already escapes
      },
    });
};

// Change language and save to storage
export const changeLanguage = async (languageCode: string) => {
  await AsyncStorage.setItem('app_language', languageCode);
  await i18n.changeLanguage(languageCode);
};

// Export initialization promise so app can wait for it
export const i18nInitPromise = initI18n();

export default i18n;
