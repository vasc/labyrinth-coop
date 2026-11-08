import { en } from "./en";
import { pt } from "./pt";
import type { Lang, Messages, Text } from "./types";

export const MESSAGES: Readonly<Record<Lang, Messages>> = { en, pt };

/** The page's current language. Everything that shows text listens for changes and redraws itself. */
export type I18n = {
  readonly lang: Lang;
  readonly m: Messages;
  set: (lang: Lang) => void;
  onChange: (listener: () => void) => void;
};

export const createI18n = (initial: Lang): I18n => {
  let lang = initial;
  const listeners: Array<() => void> = [];
  return {
    get lang() {
      return lang;
    },
    get m() {
      return MESSAGES[lang];
    },
    set: (next) => {
      if (next === lang) return;
      lang = next;
      for (const listener of listeners) listener();
    },
    onChange: (listener) => {
      listeners.push(listener);
    },
  };
};

/** Shows a `Text` in `el`, and says the last one again whenever the language changes. */
export const liveText = (el: HTMLElement, i18n: I18n): ((text: Text) => void) => {
  let current: Text | null = null;
  i18n.onChange(() => {
    if (current !== null) el.textContent = current(i18n.m);
  });
  return (text) => {
    current = text;
    el.textContent = text(i18n.m);
  };
};
