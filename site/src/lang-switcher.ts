import type { I18n } from "./i18n/i18n";
import { type Lang, isLang } from "./i18n/types";

/** EN / PT buttons, each with `data-lang`. The current language's button is pressed. */
export const bindLanguageSwitcher = (buttons: readonly HTMLButtonElement[], i18n: I18n, remember: (lang: Lang) => void): void => {
  const bound = buttons.map((button) => {
    const lang = button.dataset.lang;
    if (!isLang(lang)) throw new Error(`language button for unknown language ${lang ?? "(none)"}`);
    button.addEventListener("click", () => {
      i18n.set(lang);
      remember(lang);
    });
    return { button, lang };
  });
  const render = () => {
    for (const { button, lang } of bound) button.setAttribute("aria-pressed", String(lang === i18n.lang));
  };
  i18n.onChange(render);
  render();
};
