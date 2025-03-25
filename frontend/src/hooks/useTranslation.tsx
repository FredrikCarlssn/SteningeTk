import { createContext, useContext, useState } from 'react';
import { translations } from '../locales';

const TranslationContext = createContext({
  t: (key: string) => '',
  switchLanguage: (lang: 'sv' | 'en') => {}
});

export function TranslationProvider({ children }) {
  const [language, setLanguage] = useState<'sv' | 'en'>('sv');

  const t = (key: string) => {
    const keys = key.split('.');
    let value = translations[language];
    for (const k of keys) {
      value = value[k];
    }
    return value || key;
  };

  return (
    <TranslationContext.Provider value={{ t, switchLanguage: setLanguage }}>
      {children}
    </TranslationContext.Provider>
  );
}

export const useTranslation = () => useContext(TranslationContext); 