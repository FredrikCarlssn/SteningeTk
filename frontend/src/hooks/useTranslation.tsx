import { createContext, useContext, useState, ReactNode } from 'react';
import { translations } from '../locales';

const TranslationContext = createContext({
  t: (key: string) => '',
  switchLanguage: (lang: 'sv' | 'en') => {},
  language: 'sv' as 'sv' | 'en'
});

interface TranslationProviderProps {
  children: ReactNode;
}

export function TranslationProvider({ children }: TranslationProviderProps) {
  const [language, setLanguage] = useState<'sv' | 'en'>(() => {
    // Check localStorage for saved language preference
    const savedLanguage = localStorage.getItem('preferredLanguage');
    return (savedLanguage === 'en' || savedLanguage === 'sv') ? savedLanguage : 'sv';
  });

  const t = (key: string) => {
    const keys = key.split('.');
    let value: any = translations[language];
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key;
      }
    }
    return value || key;
  };

  const switchLanguage = (newLanguage: 'sv' | 'en') => {
    localStorage.setItem('preferredLanguage', newLanguage);
    setLanguage(newLanguage);
  };

  return (
    <TranslationContext.Provider value={{ t, switchLanguage, language }}>
      {children}
    </TranslationContext.Provider>
  );
}

export const useTranslation = () => useContext(TranslationContext); 