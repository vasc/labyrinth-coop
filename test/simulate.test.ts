import { describe, expect, test } from "bun:test";
import { CELLS, E, W, cellOf, createBoard } from "../src/board";
import type { GameState } from "../src/game";
import { mulberry32 } from "../src/rng";
import { type SimConfig, policiesFor, runGame, summarize, takeTurn } from "../src/simulate";

const config: SimConfig = {
  players: 3,
  treasures: 6,
  deck: { pile: "personal", reveal: 1, preview: 0 },
  composition: "kid",
  kidVision: 0.2,
  adultVision: 1,
};

describe("runGame", () => {
  test("plays until every treasure is collected, one at most per turn", () => {
    const result = runGame(config, 11, 400);
    expect(result.turnsNeeded).not.toBeNull();
    expect(result.turnsNeeded ?? 0).toBeGreaterThanOrEqual(6);
    expect(result.collectionsBySeat.reduce((a, b) => a + b, 0)).toBe(6);
  });

  test("is reproducible from its seed", () => {
    expect(runGame(config, 5, 400)).toEqual(runGame(config, 5, 400));
  });

  test("gives up at the turn cap", () => {
    const result = runGame({ ...config, treasures: 24 }, 3, 2);
    expect(result.turnsNeeded).toBeNull();
    expect(result.turnsPlayed).toBe(2);
  });

  test("assists are sacrifices that the next player cashed in", () => {
    let sacrifices = 0;
    for (let seed = 1; seed <= 10; seed++) {
      const result = runGame(config, seed, 400);
      expect(result.assists).toBeLessThanOrEqual(result.sacrifices);
      sacrifices += result.sacrifices;
    }
    expect(sacrifices).toBeGreaterThan(0);
  });

  test("counts idle turns among the turns played", () => {
    let idle = 0;
    for (let seed = 1; seed <= 10; seed++) {
      const result = runGame(config, seed, 400);
      expect(result.idleTurns).toBeLessThanOrEqual(result.turnsPlayed);
      idle += result.idleTurns;
    }
    expect(idle).toBeGreaterThan(0);
  });

  test("plays a shared game with a look-ahead card to the end", () => {
    const result = runGame({ ...config, deck: { pile: "shared", reveal: 1, preview: 1 } }, 11, 400);
    expect(result.collectionsBySeat.reduce((a, b) => a + b, 0)).toBe(6);
  });

  test("nobody sacrifices at a table where nobody plans", () => {
    expect(runGame({ ...config, composition: "solo" }, 11, 400).sacrifices).toBe(0);
  });
});

describe("takeTurn", () => {
  // Closed board but for a corridor on fixed tiles from (0,2) to (0,4). The target is at (0,6), out of reach.
  const corridor = (piles: number[][], pile: "shared" | "personal"): GameState => {
    const open = new Array<number>(CELLS).fill(0);
    const treasure = new Array<number>(CELLS).fill(-1);
    open[cellOf(0, 2)] = E;
    open[cellOf(0, 3)] = E | W;
    open[cellOf(0, 4)] = W;
    treasure[cellOf(0, 6)] = 5;
    return {
      board: createBoard(open, treasure, 0, -1),
      pawns: [cellOf(0, 2), cellOf(6, 6)],
      piles,
      deck: { pile, reveal: 1, preview: 0 },
      lastShift: null,
      collected: 0,
      total: piles.flat().length,
    };
  };
  const solo = [{ plans: false, vision: 1 }, { plans: false, vision: 1 }];

  test("a turn that ends closer to the target is not idle", () => {
    const turn = takeTurn(corridor([[5]], "shared"), 0, solo, mulberry32(1));
    expect(turn.choice.dest).toBe(cellOf(0, 4));
    expect(turn.idle).toBe(false);
  });

  test("a turn with nothing to chase and nobody set up is idle", () => {
    expect(takeTurn(corridor([[], [5]], "personal"), 0, solo, mulberry32(1)).idle).toBe(true);
  });

  test("a turn that collects and leaves the next player a chance is a collect-and-setup", () => {
    let both = 0;
    const config: SimConfig = { players: 3, treasures: 12, deck: { pile: "shared", reveal: 1, preview: 1 }, composition: "team", kidVision: 0.2, adultVision: 1 };
    for (let seed = 1; seed <= 5; seed++) both += runGame(config, seed, 200).collectSetups;
    expect(both).toBeGreaterThan(0);
    expect(runGame({ ...config, deck: { pile: "shared", reveal: 1, preview: 0 } }, 1, 200).collectSetups).toBe(0);
  });
});

describe("policiesFor", () => {
  const adult = { plans: true, vision: 0.4 };
  test("seats an unaided kid first and planning adults elsewhere", () => {
    expect(policiesFor("kid", 3, 0.2, 0.4)).toEqual([{ plans: false, vision: 0.2 }, adult, adult]);
  });
  test("a team talks every turn through, the kid's included", () => {
    expect(policiesFor("team", 2, 0.2, 0.4)).toEqual([adult, adult]);
  });
  test("solo tables never plan for each other", () => {
    expect(policiesFor("solo", 2, 0.2, 0.4)).toEqual([{ plans: false, vision: 0.4 }, { plans: false, vision: 0.4 }]);
  });
});

describe("summarize", () => {
  test("reports percentiles and win rate by collapse turn, counting unfinished games as losses", () => {
    const summary = summarize([10, 20, 30, null].map((turnsNeeded) => ({ turnsNeeded, turnsPlayed: 0, collectionsBySeat: [1, 1], sacrifices: 2, assists: 1, idleTurns: 3, collectSetups: 5, kidTurns: 2 })), [20, 30]);
    expect(summary.idleTurnsPerGame).toBe(3);
    expect(summary.collectSetupsPerGame).toBe(5);
    expect(summary.games).toBe(4);
    expect(summary.winRate).toEqual({ 20: 0.5, 30: 0.75 });
    expect(summary.percentiles).toEqual({ 25: 10, 50: 20, 75: 30, 90: null });
    expect(summary.kidShare).toBe(0.5);
    expect(summary.assistsPerGame).toBe(1);
    expect(summary.sacrificesPerGame).toBe(2);
  });
});
