import { describe, expect, test } from "bun:test";
import { CELLS, SHIFTS, applyShift, cellOf, createBoard, legalShiftOptions, reachable } from "../src/board";
import { type GameConfig, type GameState, newGame, playTurn } from "../src/game";
import {
  type Candidate,
  PERFECT_PLANNER,
  type Policy,
  chanceToFind,
  decide,
  evaluate,
  isSacrifice,
  optionsSeen,
  visionCount,
} from "../src/policy";
import { mulberry32, pick } from "../src/rng";

const planner: Policy = PERFECT_PLANNER;
const solo: Policy = { plans: false, vision: 1 };
const kid: Policy = { plans: false, vision: 0.15 };

/** A mid-game position reached by a few random legal turns. */
const randomState = (seed: number, config: GameConfig): GameState => {
  const rng = mulberry32(seed);
  let state = newGame(config, rng);
  const turns = 1 + Math.floor(rng() * 6);
  for (let t = 0; t < turns; t++) {
    const player = t % config.players;
    const option = pick(legalShiftOptions(state.board, state.lastShift), rng);
    const shifted = applyShift(state.board, state.pawns, option);
    const dest = pick(reachable(shifted.board, shifted.pawns[player] ?? 0), rng);
    state = playTurn(state, player, option, dest).state;
  }
  return state;
};

const configs: GameConfig[] = [
  { players: 2, treasures: 12, deck: { pile: "personal", reveal: 1 } },
  { players: 3, treasures: 12, deck: { pile: "shared", reveal: 1 } },
  { players: 4, treasures: 16, deck: { pile: "personal", reveal: Number.POSITIVE_INFINITY } },
];
const cases = configs.flatMap((config) => Array.from({ length: 40 }, (_, seed) => ({ config, seed })));
const seats = (players: number, seat: number, policy: Policy): Policy[] =>
  Array.from({ length: players }, (_, i) => (i === seat ? policy : planner));

describe("chanceToFind", () => {
  test("is the chance that a random look at some options includes a good one", () => {
    expect(chanceToFind(10, 0, 3)).toBe(0);
    expect(chanceToFind(10, 10, 3)).toBe(1);
    expect(chanceToFind(10, 1, 3)).toBeCloseTo(0.3);
    expect(chanceToFind(10, 2, 3)).toBeCloseTo(1 - (8 / 10) * (7 / 9) * (6 / 8));
    expect(chanceToFind(5, 1, 9)).toBe(1);
  });
});

describe("vision", () => {
  test("is the share of the possible pushes a player works out, whatever the spare's shape", () => {
    expect(visionCount({ plans: false, vision: 0.5 }, 44)).toBe(22);
    expect(visionCount({ plans: false, vision: 0.5 }, 22)).toBe(11);
    expect(visionCount({ plans: false, vision: 0.01 }, 22)).toBe(1);
    expect(visionCount(planner, 44)).toBe(44);
  });

  test("only works out that many pushes", () => {
    const options = legalShiftOptions(newGame(configs[0] ?? { players: 2, treasures: 2, deck: { pile: "shared", reveal: 1 } }, mulberry32(1)).board, null);
    expect(optionsSeen({ plans: true, vision: 0.25 }, options, mulberry32(2)).length).toBe(visionCount({ plans: true, vision: 0.25 }, options.length));
    expect(optionsSeen(planner, options, mulberry32(2)).length).toBe(options.length);
  });
});

describe("planner", () => {
  test("always collects when any shift lets it collect", () => {
    for (const { config, seed } of cases) {
      const state = randomState(seed, config);
      const player = seed % config.players;
      const policies = seats(config.players, -1, planner);
      const options = legalShiftOptions(state.board, state.lastShift);
      const canCollect = evaluate(state, player, policies, options, mulberry32(seed)).some((c) => c.collects);
      expect(decide(state, player, policies, mulberry32(seed)).collects).toBe(canCollect);
    }
  });

  test("sets up the next player when it cannot collect itself", () => {
    let sacrifices = 0;
    for (const { config, seed } of cases) {
      const state = randomState(seed, config);
      const player = seed % config.players;
      const policies = seats(config.players, -1, planner);
      const all = evaluate(state, player, policies, legalShiftOptions(state.board, state.lastShift), mulberry32(seed));
      if (all.some((c) => c.collects)) continue;
      const bestSetup = Math.max(...all.map((c) => c.setup));
      const choice = decide(state, player, policies, mulberry32(seed));
      expect(choice.setup).toBe(bestSetup);
      if (bestSetup > 0) sacrifices++;
    }
    expect(sacrifices).toBeGreaterThan(0);
  });

  test("values setting up a limited-vision player by how likely they are to spot the move", () => {
    for (const { config, seed } of cases.slice(0, 40)) {
      const state = randomState(seed, config);
      const player = seed % config.players;
      const next = (player + 1) % config.players;
      const options = legalShiftOptions(state.board, state.lastShift);
      const withPlanner = evaluate(state, player, seats(config.players, next, planner), options, mulberry32(seed));
      const withKid = evaluate(state, player, seats(config.players, next, kid), options, mulberry32(seed));
      withPlanner.forEach((c, i) => {
        const k = withKid[i];
        expect(k?.setup ?? 0).toBeLessThanOrEqual(c.setup);
        if (c.setup === 0) expect(k?.setup).toBe(0);
      });
    }
  });

  test("with limited vision, only spots setups that exist and misses some of them", () => {
    const limited: Policy = { plans: true, vision: 0.2 };
    let perfectSetups = 0;
    let limitedSetups = 0;
    for (const { config, seed } of cases) {
      const state = randomState(seed, config);
      const player = seed % config.players;
      const options = legalShiftOptions(state.board, state.lastShift);
      const perfect = evaluate(state, player, seats(config.players, -1, planner), options, mulberry32(seed));
      const partial = evaluate(state, player, seats(config.players, player, limited), options, mulberry32(seed));
      partial.forEach((c, i) => {
        if (c.setup > 0) expect(perfect[i]?.setup ?? 0).toBeGreaterThan(0);
      });
      perfectSetups += perfect.filter((c) => c.setup > 0).length;
      limitedSetups += partial.filter((c) => c.setup > 0).length;
    }
    expect(limitedSetups).toBeLessThan(perfectSetups);
    expect(limitedSetups).toBeGreaterThan(0);
  });
});

describe("pushing your own target off the board", () => {
  // Closed board: the pawn on (0,0) cannot move. Its target sits at the bottom of column 1,
  // so pushing column 1 down ejects it onto the spare tile.
  const pushDownCol1 = SHIFTS.findIndex((s) => s.axis === "col" && s.line === 1 && s.dir === 1);
  const treasure = new Array<number>(CELLS).fill(-1);
  treasure[cellOf(6, 1)] = 4;
  const state: GameState = {
    board: createBoard(new Array<number>(CELLS).fill(0), treasure, 0, -1),
    pawns: [cellOf(0, 0), cellOf(6, 6)],
    piles: [[4], [9]],
    deck: { pile: "personal", reveal: 1 },
    lastShift: null,
    collected: 0,
    total: 2,
  };

  test("is never mistaken for getting closer to it", () => {
    for (let seed = 0; seed < 30; seed++) {
      expect(decide(state, 0, [solo, solo], mulberry32(seed)).option.shift).not.toBe(pushDownCol1);
    }
  });
});

describe("sacrifice", () => {
  const candidate = (setup: number, distance: number, collects = false): Candidate => ({
    option: { shift: 0, spareOpen: 5 },
    dest: 0,
    collects,
    setup,
    distance,
  });

  test("is a turn where the player gave up their own best move to set up the next player", () => {
    const selfish = candidate(0, 1);
    const generous = candidate(0.8, 4);
    expect(isSacrifice(generous, [selfish, generous])).toBe(true);
  });

  test("is not counted when playing for yourself already sets up the next player", () => {
    const both = candidate(0.8, 1);
    expect(isSacrifice(both, [both, candidate(0.8, 4)])).toBe(false);
  });

  test("is not counted on a turn that collects", () => {
    const collect = candidate(0.8, 0, true);
    expect(isSacrifice(collect, [collect, candidate(0, 1)])).toBe(false);
  });
});

describe("solo", () => {
  test("never plans for the next player", () => {
    const config = configs[1] ?? { players: 2, treasures: 2, deck: { pile: "shared", reveal: 1 } };
    for (let seed = 0; seed < 20; seed++) {
      const state = randomState(seed, config);
      const policies = Array.from({ length: config.players }, () => solo);
      const options = legalShiftOptions(state.board, state.lastShift);
      expect(evaluate(state, 0, policies, options, mulberry32(seed)).every((c) => c.setup === 0)).toBe(true);
    }
  });
});
