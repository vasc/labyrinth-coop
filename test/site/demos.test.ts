import { describe, expect, test } from "bun:test";
import { legalShiftOptions } from "../../src/board";
import { newGame, playTurn, previewCards } from "../../src/game";
import { PERFECT_PLANNER, evaluate, isSacrifice } from "../../src/policy";
import { mulberry32 } from "../../src/rng";
import { LIVE_DECK, type TurnScene, describeTurn, playLiveGame } from "../../site/src/demos/live-game";
import { playOneTurn, oneTurnGame } from "../../site/src/demos/one-turn";
import { findSacrifice, playSacrifice, sacrificeGame } from "../../site/src/demos/sacrifice";
import { Hud, type HudState } from "../../site/src/hud";
import { en } from "../../site/src/i18n/en";
import { createI18n } from "../../site/src/i18n/i18n";
import { pt } from "../../site/src/i18n/pt";
import { MazeView } from "../../site/src/maze-view";
import { instantMotion } from "../../site/src/motion";

const SVG_NS = "http://www.w3.org/2000/svg";
const now = () => Promise.resolve();

const hudElements = () => ({
  icon: document.createElementNS(SVG_NS, "svg"),
  name: document.createElement("strong"),
  nextIcon: document.createElementNS(SVG_NS, "svg"),
  nextName: document.createElement("strong"),
  found: document.createElement("b"),
  left: document.createElement("b"),
  turn: document.createElement("p"),
  track: document.createElement("div"),
  caption: document.createElement("p"),
});

describe("live game", () => {
  test("plays a whole game through the view and keeps the HUD in step with the rules", async () => {
    const svg = document.createElementNS(SVG_NS, "svg");
    const els = hudElements();
    const setup = { players: 3, treasures: 12, collapseAfter: 26, seed: 21 };
    const result = await playLiveGame({ svg, hud: new Hud(els, setup, createI18n("en")), motion: instantMotion, waitVisible: now }, setup);
    expect(result.turns).toBeLessThanOrEqual(26);
    expect(result.won).toBe(result.found === 12);
    expect(els.found.textContent).toBe(`${result.found} / 12`);
    expect(els.track.querySelectorAll(".on").length).toBe(result.turns);
    expect(svg.querySelectorAll(".found").length).toBe(result.found);
    expect(els.caption.textContent).toContain(result.won ? "Everyone wins" : "collapsed");
  });

  test("plays with a look-ahead card: the HUD names it from the start, and it is marked on the board while cards remain", async () => {
    const svg = document.createElementNS(SVG_NS, "svg");
    const els = hudElements();
    const setup = { players: 3, treasures: 12, collapseAfter: 26, seed: 21 };
    const hud = new Hud(els, setup, createI18n("en"));
    const shown: HudState[] = [];
    const show = hud.show.bind(hud);
    hud.show = (state) => {
      shown.push(state);
      show(state);
    };
    const result = await playLiveGame({ svg, hud, motion: instantMotion, waitVisible: now }, setup);
    const opening = newGame({ players: 3, treasures: 12, deck: LIVE_DECK }, mulberry32(21));
    expect(shown[0]?.ahead).toBe(previewCards(opening, 0)[0] ?? -1);
    for (const state of shown) expect(state.ahead === null).toBe(state.found >= 11);
    expect(svg.querySelectorAll(".ahead").length).toBe(result.found >= 11 ? 0 : 1);
  });

  const scene = (over: Partial<TurnScene> = {}): TurnScene => ({
    player: 0,
    next: 1,
    target: 0,
    ahead: 13,
    headsFor: "target",
    before: 5,
    after: 3,
    ...over,
  });
  const base = { option: { shift: 0, spareOpen: 5 }, dest: 0, setup: 0, distance: 3, collects: false, sacrifice: false };

  test("narrates collecting, setting up and searching turns differently", () => {
    expect(describeTurn({ ...base, collects: true, distance: 0 }, scene())(en)).toBe("● The youngest can reach the Crown.");
    expect(describeTurn({ ...base, sacrifice: true, setup: 1 }, scene({ player: 1, next: 2 }))(en)).toBe(
      "■ Player 2 can't reach the Crown, so pushes it toward ▲ Player 3.",
    );
    expect(describeTurn(base, scene({ player: 2, next: 0 }))(en)).toBe("▲ Player 3 can't reach the Crown yet, so moves closer.");
    expect(describeTurn(base, scene({ player: 2, next: 0 }))(pt)).toBe("▲ Jogador 3 ainda não chega à Coroa, por isso aproxima-se.");
  });

  test("narrates the look-ahead: collecting while setting up the next one, heading for it, and waiting on it", () => {
    expect(describeTurn({ ...base, collects: true, distance: 0, setup: 0.6 }, scene())(en)).toBe(
      "● The youngest reaches the Crown and leaves ■ Player 2 a way to the Map.",
    );
    expect(describeTurn(base, scene({ headsFor: "ahead" }))(en)).toBe("● The youngest can't reach the Crown, so heads for the Map, which comes next.");
    expect(describeTurn(base, scene({ headsFor: "ahead", after: 0 }))(en)).toBe(
      "● The youngest can't reach the Crown, so waits on the Map, which comes next.",
    );
    expect(describeTurn(base, scene({ headsFor: "ahead", after: 0 }))(pt)).toBe(
      "● O mais novo não chega à Coroa, por isso espera em cima do Mapa, que vem a seguir.",
    );
    expect(describeTurn({ ...base, collects: true, distance: 0, setup: 0.6 }, scene())(pt)).toBe(
      "● O mais novo chega à Coroa e deixa ao ■ Jogador 2 um caminho até ao Mapa.",
    );
  });

  test("agrees with a plural treasure", () => {
    const coins = 21;
    expect(describeTurn(base, scene({ ahead: coins, headsFor: "ahead" }))(en)).toBe(
      "● The youngest can't reach the Crown, so heads for the Coins, which come next.",
    );
    expect(describeTurn(base, scene({ ahead: coins, headsFor: "ahead", after: 0 }))(pt)).toBe(
      "● O mais novo não chega à Coroa, por isso espera em cima das Moedas, que vêm a seguir.",
    );
    expect(describeTurn({ ...base, sacrifice: true, setup: 1 }, scene({ target: coins }))(en)).toBe(
      "● The youngest can't reach the Coins, so pushes them toward ■ Player 2.",
    );
  });

  test("only says a player moves closer when they end up closer to the treasure named", () => {
    expect(describeTurn(base, scene({ before: 4, after: 4 }))(en)).toBe("● The youngest can't reach the Crown this turn.");
    expect(describeTurn(base, scene({ before: null, after: 4 }))(en)).toBe("● The youngest can't reach the Crown this turn.");
    expect(describeTurn(base, scene({ before: 4, after: null }))(en)).toBe("● The youngest can't reach the Crown this turn.");
    expect(describeTurn(base, scene({ before: 4, after: 4, headsFor: "ahead" }))(en)).toBe("● The youngest can't reach the Crown this turn.");
  });
});

describe("one turn", () => {
  test("goes through push, walk, collect and the collapse marker in order", async () => {
    const svg = document.createElementNS(SVG_NS, "svg");
    const rng = mulberry32(2);
    const state = oneTurnGame(rng);
    const view = new MazeView(svg, state.board, state.pawns, instantMotion);
    const steps: number[] = [];
    const labels: string[] = [];
    const mark = (step: number, label: (m: typeof en) => string) => {
      steps.push(step);
      labels.push(label(en));
    };
    const next = await playOneTurn({ view, motion: instantMotion, mark }, state, rng, 1);
    expect(steps).toEqual([0, 1, 2, 3]);
    expect(labels[0]).toBe("1 · Push");
    expect(labels[3]).toBe("4 · Marker moves: 22 left");
    expect(view.board).toEqual(next.board);
    expect(view.pawns).toEqual(next.pawns);
  });
});

describe("sacrifice", () => {
  const found = findSacrifice(1, 4000);

  test("finds a position where the first player cannot collect but can set up the second", () => {
    expect(found).not.toBeNull();
    if (found === null) return;
    const rng = mulberry32(found.seed);
    const state = sacrificeGame(found.seed);
    const policies = [PERFECT_PLANNER, PERFECT_PLANNER];
    const own = evaluate(state, 0, policies, legalShiftOptions(state.board, null), rng);
    expect(own.some((c) => c.collects)).toBe(false);
    expect(isSacrifice(found.setup, own)).toBe(true);
    // Without ●'s help, ■ could not have collected straight away.
    expect(evaluate(state, 1, policies, legalShiftOptions(state.board, null), rng).some((c) => c.collects)).toBe(false);
    const afterSetup = playTurn(state, 0, found.setup.option, found.setup.dest);
    expect(afterSetup.collected).toBeNull();
    const finish = playTurn(afterSetup.state, 1, found.finish.option, found.finish.dest);
    expect(finish.collected).not.toBeNull();
  });

  test("plays out in four captioned steps ending with the treasure found", async () => {
    if (found === null) throw new Error("no sacrifice found");
    const svg = document.createElementNS(SVG_NS, "svg");
    const steps: number[] = [];
    const captions: string[] = [];
    const say = (step: number, text: (m: typeof en) => string) => {
      steps.push(step);
      captions.push(text(pt));
    };
    await playSacrifice({ svg, motion: instantMotion, waitVisible: now, say }, found);
    expect(steps).toEqual([1, 2, 3, 4]);
    expect(captions[2]).toBe("Vez do ■. Um empurrão abre o caminho.");
    expect(svg.querySelectorAll(".found").length).toBe(1);
  });
});
