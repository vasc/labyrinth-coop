import type { HudElements } from "./hud";

/** Every element of site/template.html the script drives, looked up once and checked for the right kind. */
export type Page = {
  chart: HTMLElement;
  hero: { svg: SVGSVGElement; toggle: HTMLButtonElement; hud: HudElements };
  turn: { svg: SVGSVGElement; toggle: HTMLButtonElement; status: HTMLElement };
  sacrifice: { svg: SVGSVGElement; toggle: HTMLButtonElement; step: HTMLElement; caption: HTMLElement };
  /** The rules list items Fig. 2 lights up, in order. */
  steps: Element[];
  toggles: HTMLButtonElement[];
  /** The EN / PT switcher, in that order. */
  langButtons: HTMLButtonElement[];
};

export const readPage = (doc: Document): Page => {
  const html = (id: string): HTMLElement => {
    const node = doc.getElementById(id);
    if (!(node instanceof HTMLElement)) throw new Error(`missing #${id}`);
    return node;
  };
  const svg = (id: string): SVGSVGElement => {
    const node = doc.getElementById(id);
    if (!(node instanceof SVGSVGElement)) throw new Error(`#${id} is not an <svg>`);
    return node;
  };
  const button = (id: string): HTMLButtonElement => {
    const node = doc.getElementById(id);
    if (!(node instanceof HTMLButtonElement)) throw new Error(`#${id} is not a <button>`);
    return node;
  };
  const hero = {
    svg: svg("hero-board"),
    toggle: button("hero-toggle"),
    hud: {
      icon: svg("hud-icon"),
      name: html("hud-name"),
      nextIcon: svg("hud-next-icon"),
      nextName: html("hud-next-name"),
      found: html("hud-found"),
      left: html("hud-left"),
      turn: html("hud-turn"),
      track: html("hud-track"),
      caption: html("hud-caption"),
    },
  };
  const turn = { svg: svg("turn-board"), toggle: button("turn-toggle"), status: html("turn-status") };
  const sacrifice = { svg: svg("sac-board"), toggle: button("sac-toggle"), step: html("sac-step"), caption: html("sac-caption") };
  const steps = [...doc.querySelectorAll("#turn-steps > li")];
  if (steps.length !== 4) throw new Error(`expected 4 turn steps, found ${steps.length}`);
  const langButtons = [...doc.querySelectorAll("[data-lang]")].map((node) => {
    if (!(node instanceof HTMLButtonElement)) throw new Error("a [data-lang] element is not a <button>");
    return node;
  });
  if (langButtons.length !== 2) throw new Error(`expected 2 language buttons, found ${langButtons.length}`);
  return { chart: html("chart"), hero, turn, sacrifice, steps, toggles: [hero.toggle, turn.toggle, sacrifice.toggle], langButtons };
};
