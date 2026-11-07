import { describe, expect, test } from "bun:test";
import { legalShiftOptions } from "../../src/board";
import { playTurn } from "../../src/game";
import { PERFECT_PLANNER, evaluate, isSacrifice } from "../../src/policy";
import { mulberry32 } from "../../src/rng";
import { playLiveGame, describeTurn, SEATS } from "../../site/src/demos/live-game";
import { playOneTurn, oneTurnGame } from "../../site/src/demos/one-turn";
import { findSacrifice, playSacrifice, sacrificeGame } from "../../site/src/demos/sacrifice";
import { Hud } from "../../site/src/hud";
import { MazeView } from "../../site/src/maze-view";
import { instantMotion } from "../../site/src/motion";

const SVG_NS = "http://www.w3.org/2000/svg";
const now = () => Promise.resolve();

const hudElements = () => ({
  icon: document.createElementNS(SVG_NS, "svg"),
  name: document.createElement("strong"),
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
    const result = await playLiveGame({ svg, hud: new Hud(els, setup), motion: instantMotion, waitVisible: now }, setup);
    expect(result.turns).toBeLessThanOrEqual(26);
    expect(result.won).toBe(result.found === 12);
    expect(els.found.textContent).toBe(`${result.found} / 12`);
    expect(els.track.querySelectorAll(".on").length).toBe(result.turns);
    expect(svg.querySelectorAll(".found").length).toBe(result.found);
    expect(els.caption.textContent).toContain(result.won ? "Everyone wins" : "collapsed");
  });

  test("narrates collecting, setting up and searching turns differently", () => {
    const base = { option: { shift: 0, spareOpen: 5 }, dest: 0, setup: 0, distance: 3 };
    expect(describeTurn({ ...base, collects: true, sacrifice: false }, 0, 1, "Crown", 5)).toBe(`${SEATS[0]} can reach the Crown.`);
    expect(describeTurn({ ...base, collects: false, sacrifice: true, setup: 1 }, 1, 2, "Crown", 5)).toBe(
      `${SEATS[1]} can't reach the Crown, so pushes it toward ${SEATS[2]}.`,
    );
    expect(describeTurn({ ...base, collects: false, sacrifice: false }, 2, 0, "Crown", 5)).toBe(`${SEATS[2]} can't reach the Crown yet, so moves closer.`);
  });

  test("only says a player moves closer when they end up closer", () => {
    const base = { option: { shift: 0, spareOpen: 5 }, dest: 0, setup: 0, collects: false, sacrifice: false };
    expect(describeTurn({ ...base, distance: 4 }, 0, 1, "Crown", 4)).toBe(`${SEATS[0]} can't reach the Crown this turn.`);
    expect(describeTurn({ ...base, distance: 4 }, 0, 1, "Crown", null)).toBe(`${SEATS[0]} can't reach the Crown this turn.`);
  });
});

describe("one turn", () => {
  test("goes through push, walk, collect and the collapse marker in order", async () => {
    const svg = document.createElementNS(SVG_NS, "svg");
    const rng = mulberry32(2);
    const state = oneTurnGame(rng);
    const view = new MazeView(svg, state.board, state.pawns, instantMotion);
    const steps: number[] = [];
    const next = await playOneTurn({ view, motion: instantMotion, mark: (step) => steps.push(step) }, state, rng, 1);
    expect(steps).toEqual([0, 1, 2, 3]);
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
    await playSacrifice({ svg, motion: instantMotion, waitVisible: now, say: (step) => steps.push(step) }, found);
    expect(steps).toEqual([1, 2, 3, 4]);
    expect(svg.querySelectorAll(".found").length).toBe(1);
  });
});
