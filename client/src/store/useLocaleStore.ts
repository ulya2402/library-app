import { create } from 'zustand';
import en from '../locales/en.json';
import id from '../locales/id.json';

type Language = 'en' | 'id';

const dictionaries: Record<Language, Record<string, string>> = { en, id };

interface LocaleState {
  lang: Language;
  t: (key: string) => string;
  setLanguage: (lang: Language) => void;
}

export const useLocaleStore = create<LocaleState>((set, get) => ({
  lang: 'id',
  t: (key) => dictionaries[get().lang][key] || key,
  setLanguage: (lang) => set({ lang }),
}));