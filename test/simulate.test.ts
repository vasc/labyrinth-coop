import { describe, expect, test } from "bun:test";
import { type SimConfig, policiesFor, runGame, summarize } from "../src/simulate";

const config: SimConfig = {
  players: 3,
  treasures: 6,
  deck: { pile: "personal", reveal: 1 },
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

  test("nobody sacrifices at a table where nobody plans", () => {
    expect(runGame({ ...config, composition: "solo" }, 11, 400).sacrifices).toBe(0);
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
    const summary = summarize([10, 20, 30, null].map((turnsNeeded) => ({ turnsNeeded, turnsPlayed: 0, collectionsBySeat: [1, 1], sacrifices: 2, assists: 1, kidTurns: 2 })), [20, 30]);
    expect(summary.games).toBe(4);
    expect(summary.winRate).toEqual({ 20: 0.5, 30: 0.75 });
    expect(summary.percentiles).toEqual({ 25: 10, 50: 20, 75: 30, 90: null });
    expect(summary.kidShare).toBe(0.5);
    expect(summary.assistsPerGame).toBe(1);
    expect(summary.sacrificesPerGame).toBe(2);
  });
});
