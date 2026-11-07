import { describe, expect, test } from "bun:test";
import { fullReport, parseRows, revealLabel, turnsTable } from "../src/report";

const raw = (players: number, p50: number | null) => ({
  id: players,
  config: { players, treasures: 12, deck: { pile: "shared", reveal: 1 }, composition: "kid", kidVision: 8, adultVision: 16 },
  summary: {
    games: 250,
    percentiles: { 25: 10, 50: p50, 75: 30, 90: null },
    winRate: { 20: 0.5 },
    kidShare: 0.3,
    kidRate: 0.2,
    sacrificesPerGame: 2.5,
    assistsPerGame: 1.5,
  },
});

describe("parseRows", () => {
  test("reads the worker output", () => {
    const [row] = parseRows([raw(2, 20)]);
    expect(row).toMatchObject({ players: 2, games: 250, pile: "shared", composition: "kid", p50: 20, p90: null, winRate: { 20: 0.5 } });
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
});

describe("fullReport", () => {
  test("states how many games each cell is based on", () => {
    expect(fullReport(parseRows([raw(2, 20)]))).toContain("250 games per cell");
  });
});

describe("revealLabel", () => {
  test("names the card modes", () => {
    expect(revealLabel(1)).toBe("face down");
    expect(revealLabel(3)).toBe("3 face up");
    expect(revealLabel(99)).toBe("face up");
  });
});
