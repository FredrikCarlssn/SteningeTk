import { createContext, useContext, useState, ReactNode } from 'react';
import { translations } from '../locales';

// Define types for translation parameters
type TranslationParams = Record<string, string | number>;

interface TranslationContextType {
  t: (key: string, params?: TranslationParams) => string;
  switchLanguage: (lang: 'sv' | 'en') => void;
  language: 'sv' | 'en';
}

const TranslationContext = createContext<TranslationContextType>({
  t: (key: string) => key,
  switchLanguage: () => {},
  language: 'sv'
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

  const t = (key: string, params?: TranslationParams): string => {
    const keys = key.split('.');
    let value: any = translations[language];
    
    // Navigate through nested objects to find the translation
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }
    
    // If no translation found, return the key
    if (!value || typeof value !== 'string') {
      console.warn(`No translation string found for key: ${key}`);
      return key;
    }
    
    // Replace parameters in the translation string if provided
    if (params) {
      return Object.entries(params).reduce((str, [paramKey, paramValue]) => {
        return str.replace(new RegExp(`{${paramKey}}`, 'g'), String(paramValue));
      }, value);
    }
    
    return value;
  };

  const switchLanguage = (newLanguage: 'sv' | 'en'): void => {
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