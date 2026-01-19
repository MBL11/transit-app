/**
 * i18n Configuration
 * Multi-language support with automatic language detection
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

// Import translations
import fr from '../locales/fr.json';
import en from '../locales/en.json';
import es from '../locales/es.json';
import ru from '../locales/ru.json';

const resources = {
  fr: { translation: fr },
  en: { translation: en },
  es: { translation: es },
  ru: { translation: ru },
};

// Get device locale (first 2 chars: 'en-US' -> 'en')
const deviceLocale = Localization.getLocales()[0]?.languageCode || 'en';

// Supported languages
const supportedLanguages = ['fr', 'en', 'es', 'ru'];

// Fallback to 'en' if device language not supported
const fallbackLocale = supportedLanguages.includes(deviceLocale) ? deviceLocale : 'en';

i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    resources,
    lng: fallbackLocale,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes
    },
    pluralSeparator: '_',
  });

export default i18n;
