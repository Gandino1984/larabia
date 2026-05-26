import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import es from './locales/es.json';
import en from './locales/en.json';
import eu from './locales/eu.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      es: { translation: es },
      en: { translation: en },
      eu: { translation: eu }
    },
    fallbackLng: 'es',
    lng: localStorage.getItem('userLanguage') || 'es',
    debug: true, // Enable debug mode to see what's happening

    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'userLanguage'
    },

    interpolation: {
      escapeValue: false // React already escapes
    },

    react: {
      useSuspense: false
    }
  });

// Log initialization for debugging
console.log('i18n initialized with languages:', Object.keys(i18n.options.resources));
console.log('Current language:', i18n.language);

export default i18n;
