import { describe, expect, test } from "bun:test";
import { LIMITS, sweepConfigs } from "../src/sweep";

describe("sweepConfigs", () => {
  const entries = sweepConfigs();

  test("covers 960 setups with stable ids", () => {
    expect(entries.length).toBe(960);
    expect(entries.map((e) => e.id)).toEqual([...entries.keys()]);
    expect(sweepConfigs()).toEqual(entries);
  });

  test("tries the look-ahead card only with face-down decks", () => {
    const withLookAhead = entries.filter((e) => e.config.deck.preview > 0);
    expect(withLookAhead.length).toBe(240);
    expect(withLookAhead.every((e) => e.config.deck.reveal === 1 && e.config.deck.preview === 1)).toBe(true);
  });

  test("reads win rates at every collapse turn, odd ones included", () => {
    expect(LIMITS).toContain(23);
    expect(LIMITS).toContain(24);
    expect(LIMITS.every((limit, i) => i === 0 || limit === (LIMITS[i - 1] ?? 0) + 1)).toBe(true);
  });
});
