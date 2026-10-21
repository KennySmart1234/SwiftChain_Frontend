'use client';
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type Locale = 'en' | 'pcm' | 'ha' | 'yo' | 'ig';

export interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const LANGUAGE_LABELS: Record<Locale, string> = {
  en: 'English',
  pcm: 'Pidgin',
  ha: 'Hausa',
  yo: 'Yoruba',
  ig: 'Igbo', 
};

export const LanguageContext = createContext<LanguageContextValue>({
  locale: 'en',
  setLocale: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
  }, []);

  return (
    <LanguageContext.Provider value={{ locale, setLocale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguageContext() {
  return useContext(LanguageContext);
}