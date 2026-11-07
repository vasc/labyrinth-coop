import { Check } from "lucide";
import { drawIcon, treasure } from "./icons";

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

/** How many of the last track spaces are drawn dashed, as a warning. */
const WARNING_SPACES = 3;

/** The live game's scoreboard: the hunted treasure, the count found and the collapse track. */
export class Hud {
  private readonly els: HudElements;
  private readonly setup: HudSetup;
  private readonly spaces: HTMLElement[];

  constructor(els: HudElements, setup: HudSetup) {
    this.els = els;
    this.setup = setup;
    this.spaces = Array.from({ length: setup.collapseAfter }, (_, i) => {
      const space = document.createElement("i");
      if (i >= setup.collapseAfter - WARNING_SPACES) space.className = "edge";
      return space;
    });
    els.track.replaceChildren(...this.spaces);
    els.icon.setAttribute("viewBox", "0 0 24 24");
  }

  /** `target` is the face-up treasure, or null once every treasure is found. */
  show({ target, found, turn }: { target: number | null; found: number; turn: number }): void {
    const { els, setup } = this;
    const hunted = target === null ? { name: "All found", icon: Check } : treasure(target);
    els.icon.replaceChildren();
    drawIcon(els.icon, hunted.icon, 24, 12, 12);
    els.name.textContent = hunted.name;
    els.found.textContent = `${found} / ${setup.treasures}`;
    els.left.textContent = String(setup.collapseAfter - turn);
    els.turn.textContent = `Turn ${turn} of ${setup.collapseAfter}`;
    this.spaces.forEach((space, i) => space.classList.toggle("on", i < turn));
  }

  say(text: string): void {
    this.els.caption.textContent = text;
  }
}
