import { describe, expect, test } from "bun:test";
import { createI18n } from "../../site/src/i18n/i18n";
import type { Lang } from "../../site/src/i18n/types";
import { bindLanguageSwitcher } from "../../site/src/lang-switcher";

const buttons = () =>
  (["en", "pt"] as const).map((lang) => {
    const button = document.createElement("button");
    button.dataset.lang = lang;
    return button;
  });

describe("language switcher", () => {
  test("marks the current language as pressed", () => {
    const list = buttons();
    bindLanguageSwitcher(list, createI18n("pt"), () => {});
    expect(list.map((b) => b.getAttribute("aria-pressed"))).toEqual(["false", "true"]);
  });

  test("a click switches the page language and remembers the choice", () => {
    const list = buttons();
    const i18n = createI18n("en");
    const remembered: Lang[] = [];
    bindLanguageSwitcher(list, i18n, (lang) => remembered.push(lang));
    list[1]?.click();
    expect(i18n.lang).toBe("pt");
    expect(remembered).toEqual(["pt"]);
    expect(list.map((b) => b.getAttribute("aria-pressed"))).toEqual(["false", "true"]);
  });

  test("refuses a button for a language it doesn't have", () => {
    const odd = document.createElement("button");
    odd.dataset.lang = "de";
    expect(() => bindLanguageSwitcher([odd], createI18n("en"), () => {})).toThrow();
  });
});
