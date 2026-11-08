import { describe, expect, test } from "bun:test";
import { fullReport, parseRows, revealLabel, teamworkTable, turnsTable } from "../src/report";

const raw = (players: number, p50: number | null) => ({
  id: players,
  config: { players, treasures: 12, deck: { pile: "shared", reveal: 1, preview: 0 }, composition: "kid", kidVision: 8, adultVision: 16 },
  summary: {
    games: 250,
    percentiles: { 25: 10, 50: p50, 75: 30, 90: null },
    winRate: { 20: 0.5 },
    kidShare: 0.3,
    kidRate: 0.2,
    sacrificesPerGame: 2.5,
    assistsPerGame: 1.5,
    idleTurnsPerGame: 4.25,
    collectSetupsPerGame: 1.5,
  },
});
const withPreview = (players: number, p50: number) => {
  const row = raw(players, p50);
  return { ...row, config: { ...row.config, deck: { pile: "shared", reveal: 1, preview: 1 } } };
};

describe("parseRows", () => {
  test("reads the worker output", () => {
    const [row] = parseRows([raw(2, 20)]);
    expect(row).toMatchObject({ players: 2, games: 250, pile: "shared", preview: 0, composition: "kid", p50: 20, p90: null, winRate: { 20: 0.5 }, idleTurnsPerGame: 4.25 });
  });

  test("rejects malformed rows", () => {
    expect(() => parseRows([{ ...raw(2, 20), config: { ...raw(2, 20).config, composition: "alone" } }])).toThrow();
    expect(() => parseRows({})).toThrow();
  });
});

describe("turnsTable", () => {
  test("puts each player count in its own column", () => {
    const table = turnsTable(parseRows([raw(2, 20), raw(4, null)]), () => true);
    expect(table.split("\n")[2]).toBe("| shared | face down | 12 | 20 / 30 / — |  | — / 30 / — |");
  });

  test("keeps games with a look-ahead card on their own row", () => {
    const table = turnsTable(parseRows([raw(2, 20), withPreview(2, 16)]), () => true).split("\n");
    expect(table[2]).toBe("| shared | face down | 12 | 20 / 30 / — |  |  |");
    expect(table[3]).toBe("| shared | face down + look-ahead | 12 | 16 / 30 / — |  |  |");
  });
});

describe("teamworkTable", () => {
  test("shows idle turns per game", () => {
    const table = teamworkTable(parseRows([withPreview(3, 16)]), () => true).split("\n");
    expect(table[0]).toContain("idle turns / game");
    expect(table[0]).toContain("collect-and-setups / game");
    expect(table[2]).toBe("| shared | face down + look-ahead | 12 | 3 | 30% (fair: 33%) | 2.5 | 1.5 | 1.5 | 4.3 |");
  });
});

describe("fullReport", () => {
  test("states how many games each cell is based on", () => {
    expect(fullReport(parseRows([raw(2, 20)]))).toContain("250 games per cell");
  });
});

describe("revealLabel", () => {
  test("names the card modes", () => {
    expect(revealLabel(1, 0)).toBe("face down");
    expect(revealLabel(1, 1)).toBe("face down + look-ahead");
    expect(revealLabel(1, 2)).toBe("face down + 2 look-ahead");
    expect(revealLabel(3, 0)).toBe("3 face up");
    expect(revealLabel(99, 0)).toBe("face up");
  });
});
