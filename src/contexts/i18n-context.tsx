'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'en' | 'id';

interface Translations {
  [key: string]: {
    en: string;
    id: string;
  };
}

const translations: Translations = {
  'profile.role': {
    en: 'Software & Game Developer',
    id: 'Pengembang Perangkat Lunak & Game',
  },
  'profile.description': {
    en: 'Software Developer by profession. Indie Game Developer by obsession.',
    id: 'Pengembang Perangkat Lunak secara profesi. Pengembang Game Indie secara obsesi.',
  },
  'actions.share': {
    en: 'Share Profile',
    id: 'Bagikan Profil',
  },
  'actions.copied': {
    en: 'Copied!',
    id: 'Tersalin!',
  },
  'footer.source': {
    en: 'View Source Code',
    id: 'Lihat Kode Sumber',
  }
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const saved = localStorage.getItem('language') as Language;
    if (saved && (saved === 'en' || saved === 'id')) {
      setLanguageState(saved);
    } else {
      // detect browser language
      const browserLang = navigator.language.startsWith('id') ? 'id' : 'en';
      setLanguageState(browserLang);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  const t = (key: keyof typeof translations): string => {
    return translations[key]?.[language] || String(key);
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within I18nProvider');
  return context;
}
