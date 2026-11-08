import { type Lang, isLang } from "./types";

export type LangHints = {
  /** `?lang=` from the address, so a link can open the page in a given language. */
  query: string | null;
  /** What this viewer picked last time, if their browser kept it. */
  stored: string | null;
  /** The browser's preferred languages, most preferred first (`navigator.languages`). */
  preferred: readonly string[];
};

/** The address, then the viewer's last choice, then Portuguese for any browser that asks for it, else English. */
export const chooseLang = ({ query, stored, preferred }: LangHints): Lang => {
  if (isLang(query)) return query;
  if (isLang(stored)) return stored;
  return preferred.some((tag) => tag.toLowerCase().split("-")[0] === "pt") ? "pt" : "en";
};

const STORAGE_KEY = "lang";

/** Browser storage can be missing or throw (private windows, blocked site data); the page works without it. */
export const readStoredLang = (): string | null => {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

export const storeLang = (lang: Lang): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Not remembering the choice is fine.
  }
};
