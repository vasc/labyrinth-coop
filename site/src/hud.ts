import { Check } from "lucide";
import { type I18n, liveText } from "./i18n/i18n";
import type { Text } from "./i18n/types";
import { drawIcon, treasureIcon } from "./icons";

export type HudElements = {
  icon: SVGSVGElement;
  name: HTMLElement;
  found: HTMLElement;
  left: HTMLElement;
  turn: HTMLElement;
  track: HTMLElement;
  caption: HTMLElement;
};

export type HudSetup = { collapseAfter: number; treasures: number };
export type HudState = { target: number | null; found: number; turn: number };

/** How many of the last track spaces are drawn dashed, as a warning. */
const WARNING_SPACES = 3;

/** The live game's scoreboard: the hunted treasure, the count found and the collapse track. */
export class Hud {
  private readonly els: HudElements;
  private readonly setup: HudSetup;
  private readonly i18n: I18n;
  private readonly spaces: HTMLElement[];
  private readonly caption: (text: Text) => void;
  private last: HudState | null = null;

  constructor(els: HudElements, setup: HudSetup, i18n: I18n) {
    this.els = els;
    this.setup = setup;
    this.i18n = i18n;
    this.spaces = Array.from({ length: setup.collapseAfter }, (_, i) => {
      const space = document.createElement("i");
      if (i >= setup.collapseAfter - WARNING_SPACES) space.className = "edge";
      return space;
    });
    els.track.replaceChildren(...this.spaces);
    els.icon.setAttribute("viewBox", "0 0 24 24");
    this.caption = liveText(els.caption, i18n);
    i18n.onChange(() => {
      if (this.last !== null) this.render(this.last);
    });
  }

  /** `target` is the face-up treasure, or null once every treasure is found. */
  show(state: HudState): void {
    this.last = state;
    this.render(state);
  }

  say(text: Text): void {
    this.caption(text);
  }

  private render({ target, found, turn }: HudState): void {
    const { els, setup } = this;
    const m = this.i18n.m;
    els.icon.replaceChildren();
    drawIcon(els.icon, target === null ? Check : treasureIcon(target), 24, 12, 12);
    els.name.textContent = target === null ? m.hud.allFound : m.treasure(target);
    els.found.textContent = `${found} / ${setup.treasures}`;
    els.left.textContent = String(setup.collapseAfter - turn);
    els.turn.textContent = m.hud.turnOf(turn, setup.collapseAfter);
    this.spaces.forEach((space, i) => space.classList.toggle("on", i < turn));
  }
}
