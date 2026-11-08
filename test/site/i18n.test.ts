import { beforeEach, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { applyStatic } from "../../site/src/i18n/apply";
import { chooseLang } from "../../site/src/i18n/choose";
import { en } from "../../site/src/i18n/en";
import { MESSAGES, createI18n, liveText } from "../../site/src/i18n/i18n";
import { pt } from "../../site/src/i18n/pt";
import { type Messages, STATIC_KEYS, TREASURE_COUNT, isStaticKey } from "../../site/src/i18n/types";

const template = await Bun.file(join(import.meta.dir, "..", "..", "site", "template.html")).text();

const keyOf = (el: Element, attr: string): string => el.getAttribute(attr) ?? "";
/** The dictionary text for a key read from the page, or a marker that fails the comparison if the dictionary lacks it. */
const textOf = (m: Messages, key: string): string => (isStaticKey(key) ? m.text[key] : `(no text for key ${key})`);

describe("choosing the language", () => {
  test("a ?lang= in the address wins", () => {
    expect(chooseLang({ query: "pt", stored: "en", preferred: ["en-GB"] })).toBe("pt");
    expect(chooseLang({ query: "en", stored: "pt", preferred: ["pt-PT"] })).toBe("en");
  });

  test("then the language this viewer picked before", () => {
    expect(chooseLang({ query: null, stored: "pt", preferred: ["en-US"] })).toBe("pt");
  });

  test("then the browser: any Portuguese means Portuguese", () => {
    expect(chooseLang({ query: null, stored: null, preferred: ["fr-FR", "pt-PT"] })).toBe("pt");
    expect(chooseLang({ query: null, stored: null, preferred: ["pt"] })).toBe("pt");
  });

  test("otherwise English, ignoring values it doesn't know", () => {
    expect(chooseLang({ query: "de", stored: "xx", preferred: ["de-DE"] })).toBe("en");
    expect(chooseLang({ query: null, stored: null, preferred: [] })).toBe("en");
  });
});

describe("i18n state", () => {
  test("switching tells every listener, and switching to the current language tells nobody", () => {
    const i18n = createI18n("en");
    let calls = 0;
    i18n.onChange(() => calls++);
    i18n.set("en");
    expect(calls).toBe(0);
    i18n.set("pt");
    expect(calls).toBe(1);
    expect(i18n.lang).toBe("pt");
    expect(i18n.m).toBe(MESSAGES.pt);
  });

  test("live text re-renders the last thing said in the new language", () => {
    const i18n = createI18n("en");
    const el = document.createElement("p");
    const say = liveText(el, i18n);
    say((m) => m.oneTurn.walk);
    expect(el.textContent).toBe(en.oneTurn.walk);
    i18n.set("pt");
    expect(el.textContent).toBe(pt.oneTurn.walk);
  });
});

describe("the page template and the dictionaries", () => {
  beforeEach(() => {
    document.body.innerHTML = template;
  });

  test("every translatable element uses a known key, and every key is used", () => {
    const used = [
      ...[...document.querySelectorAll("[data-i18n]")].map((el) => keyOf(el, "data-i18n")),
      ...[...document.querySelectorAll("[data-i18n-aria]")].map((el) => keyOf(el, "data-i18n-aria")),
    ];
    expect(new Set(used).size).toBe(used.length);
    expect([...used].sort()).toEqual([...STATIC_KEYS].sort());
  });

  test("the English in the template is exactly the English dictionary, so the page reads the same without JavaScript", () => {
    for (const el of document.querySelectorAll("[data-i18n]")) {
      const key = keyOf(el, "data-i18n");
      expect({ key, text: el.textContent }).toEqual({ key, text: textOf(en, key) });
    }
    for (const el of document.querySelectorAll("[data-i18n-aria]")) {
      const key = keyOf(el, "data-i18n-aria");
      expect({ key, aria: el.getAttribute("aria-label") }).toEqual({ key, aria: textOf(en, key) });
    }
    for (const el of document.querySelectorAll("[data-turns]")) {
      expect(el.textContent).toBe(en.turns(Number(el.getAttribute("data-turns"))));
    }
  });

  test("Portuguese fills every element and attribute, and English puts the template back", () => {
    applyStatic(document, pt);
    expect(document.documentElement.lang).toBe("pt-PT");
    expect(document.title).toBe(pt.title);
    for (const el of document.querySelectorAll("[data-i18n]")) {
      expect(el.textContent).toBe(textOf(pt, keyOf(el, "data-i18n")));
    }
    for (const el of document.querySelectorAll("[data-i18n-aria]")) {
      expect(el.getAttribute("aria-label")).toBe(textOf(pt, keyOf(el, "data-i18n-aria")));
    }
    expect([...document.querySelectorAll("[data-turns]")].map((el) => el.textContent)).toContain("18 jogadas");

    applyStatic(document, en);
    const fresh = document.createElement("div");
    fresh.innerHTML = template;
    expect(document.body.textContent).toBe(fresh.textContent);
    expect(document.documentElement.lang).toBe("en");
  });

  test("no Portuguese text is empty or left in English by accident", () => {
    for (const key of STATIC_KEYS) {
      expect({ key, empty: pt.text[key].trim() === "" }).toEqual({ key, empty: false });
    }
  });
});

describe("treasure names and grammar", () => {
  test("both languages name all 24 treasures", () => {
    for (const m of [en, pt]) {
      const names = Array.from({ length: TREASURE_COUNT }, (_, id) => m.treasure(id));
      expect(new Set(names).size).toBe(TREASURE_COUNT);
    }
  });

  test("Portuguese contracts the article with the treasure's gender and number", () => {
    expect(pt.live.reach(0, 0)).toBe("● O mais novo consegue chegar à Coroa.");
    expect(pt.live.reach(1, 13)).toBe("■ Jogador 2 consegue chegar ao Mapa.");
    expect(pt.live.reach(2, 21)).toBe("▲ Jogador 3 consegue chegar às Moedas.");
    expect(pt.live.push(1, 4, 0)).toBe("■ Jogador 2 não chega ao Escudo, por isso empurra-o para ● o mais novo.");
    expect(pt.live.push(2, 0, 0)).toBe("▲ Jogador 3 não chega à Coroa, por isso empurra-a para ● o mais novo.");
    expect(pt.sacrifice.needs(21)).toBe("● precisa das Moedas, mas nenhum empurrão lhe abre caminho até lá.");
  });

  test("counts agree with their number in both languages", () => {
    expect(en.live.won(12, 1)).toBe("All 12 treasures found with 1 turn to spare. Everyone wins.");
    expect(en.live.won(12, 0)).toBe("All 12 treasures found on the very last turn. Everyone wins.");
    expect(en.live.lost(1)).toBe("The maze collapsed with 1 treasure left.");
    expect(en.live.lost(3)).toBe("The maze collapsed with 3 treasures left.");
    expect(pt.live.lost(1)).toBe("O labirinto desabou com 1 tesouro por encontrar.");
    expect(pt.live.lost(3)).toBe("O labirinto desabou com 3 tesouros por encontrar.");
    expect(pt.oneTurn.marker(1)).toBe("4 · O marcador avança: falta 1");
    expect(pt.oneTurn.marker(5)).toBe("4 · O marcador avança: faltam 5");
  });

  test("Portuguese writes decimals with a comma", () => {
    expect(pt.chart.figures(24, 30, 3.1)).toBe("típico 24 · mau 30 · 3,1 sacrifícios/jogo");
    expect(en.chart.figures(24, 30, 3.1)).toBe("typical 24 · bad 30 · 3.1 sacrifices/game");
  });
});
