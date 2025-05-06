import i18next from 'i18next';
import path from 'path';
import Backend from 'i18next-fs-backend';
import middleware from 'i18next-http-middleware';
// Initialize i18next
i18next
  .use(Backend) // Load translations from file system
  .use(middleware.LanguageDetector)
  .init({
    fallbackLng: 'en',
    preload: ['en', 'bn', 'fr'],
    backend: {
      loadPath: path.join(__dirname, '/locales/{{lng}}/translation.json'),
    },
    detection: {
      order: ['querystring', 'cookie', 'header', 'session'],
      caches: ['cookie'],
    },
  });

export default i18next;
