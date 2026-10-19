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
    debug: import.meta.env.DEV,

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

// The page says which language it's in (<html lang>): screen readers pronounce
// it right and the browser doesn't offer to translate it "from Spanish".
const setHtmlLang = (lng) => { document.documentElement.lang = String(lng || 'es').slice(0, 2); };
setHtmlLang(i18n.language);
i18n.on('languageChanged', setHtmlLang);

export default i18n;
