import { describe, expect, test } from "bun:test";
import { Hud } from "../../site/src/hud";
import { en } from "../../site/src/i18n/en";
import { createI18n } from "../../site/src/i18n/i18n";
import { pt } from "../../site/src/i18n/pt";

const SVG_NS = "http://www.w3.org/2000/svg";

const setup = () => {
  const els = {
    icon: document.createElementNS(SVG_NS, "svg"),
    name: document.createElement("strong"),
    found: document.createElement("b"),
    left: document.createElement("b"),
    turn: document.createElement("p"),
    track: document.createElement("div"),
    caption: document.createElement("p"),
  };
  const i18n = createI18n("en");
  return { els, i18n, hud: new Hud(els, { collapseAfter: 26, treasures: 12 }, i18n) };
};

describe("Hud", () => {
  test("draws one track space per turn, the last few dashed", () => {
    const { els } = setup();
    expect(els.track.children.length).toBe(26);
    expect(els.track.querySelectorAll(".edge").length).toBe(3);
  });

  test("shows the hunted treasure, the count found and the turns left", () => {
    const { els, hud } = setup();
    hud.show({ target: 3, found: 4, turn: 9 });
    expect(els.name.textContent).toBe(en.treasure(3));
    expect(els.icon.querySelector(".icon")).not.toBeNull();
    expect(els.found.textContent).toBe("4 / 12");
    expect(els.left.textContent).toBe("17");
    expect(els.turn.textContent).toBe("Turn 9 of 26");
    expect(els.track.querySelectorAll(".on").length).toBe(9);
  });

  test("redraws the icon instead of stacking icons", () => {
    const { els, hud } = setup();
    hud.show({ target: 3, found: 0, turn: 0 });
    hud.show({ target: 5, found: 1, turn: 1 });
    expect(els.icon.querySelectorAll(".icon").length).toBe(1);
  });

  test("shows that everything is found once the pile is empty", () => {
    const { els, hud } = setup();
    hud.show({ target: null, found: 12, turn: 20 });
    expect(els.name.textContent).toBe(en.hud.allFound);
    expect(els.found.textContent).toBe("12 / 12");
    expect(els.icon.querySelectorAll(".icon").length).toBe(1);
  });

  test("narrates into the caption", () => {
    const { els, hud } = setup();
    hud.say((m) => m.live.found(0, 1, 12));
    expect(els.caption.textContent).toBe("Found the Crown. 1 of 12.");
  });

  test("redraws the card, turn count and caption in the new language when it changes", () => {
    const { els, hud, i18n } = setup();
    hud.show({ target: 0, found: 4, turn: 9 });
    hud.say((m) => m.live.found(0, 4, 12));
    i18n.set("pt");
    expect(els.name.textContent).toBe(pt.treasure(0));
    expect(els.turn.textContent).toBe("Jogada 9 de 26");
    expect(els.caption.textContent).toBe("Encontraram a Coroa. 4 de 12.");
    expect(els.found.textContent).toBe("4 / 12");
  });
});
