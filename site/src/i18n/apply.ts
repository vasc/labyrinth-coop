import { type Messages, isStaticKey } from "./types";

/** Writes one language's fixed text into every marked element of the page, and its title and `lang`. */
export const applyStatic = (doc: Document, m: Messages): void => {
  doc.documentElement.lang = m.htmlLang;
  doc.title = m.title;
  for (const el of doc.querySelectorAll("[data-i18n]")) {
    const key = el.getAttribute("data-i18n") ?? "";
    if (!isStaticKey(key)) throw new Error(`unknown text key ${key}`);
    el.textContent = m.text[key];
  }
  for (const el of doc.querySelectorAll("[data-i18n-aria]")) {
    const key = el.getAttribute("data-i18n-aria") ?? "";
    if (!isStaticKey(key)) throw new Error(`unknown aria key ${key}`);
    el.setAttribute("aria-label", m.text[key]);
  }
  for (const el of doc.querySelectorAll("[data-turns]")) {
    el.textContent = m.turns(Number(el.getAttribute("data-turns")));
  }
};
