import { describe, expect, test } from "bun:test";
import { CELLS, E, N, S, W, SHIFTS, cellOf, createBoard, reverseShift } from "../src/board";
import { type GameState, newGame, playTurn, previewCards, visibleTargets } from "../src/game";
import { mulberry32 } from "../src/rng";

const FACE_DOWN = 1;
const FACE_UP = Number.POSITIVE_INFINITY;

describe("dealing", () => {
  test("personal piles split the treasures as evenly as possible", () => {
    const state = newGame({ players: 3, treasures: 8, deck: { pile: "personal", reveal: FACE_DOWN, preview: 0 } }, mulberry32(4));
    expect(state.piles.map((p) => p.length).sort()).toEqual([2, 3, 3]);
    expect(new Set(state.piles.flat()).size).toBe(8);
  });

  test("the extra cards of an uneven deal do not always go to the same seats", () => {
    const shortSeats = new Set<number>();
    for (let seed = 0; seed < 30; seed++) {
      const state = newGame({ players: 3, treasures: 8, deck: { pile: "personal", reveal: FACE_DOWN, preview: 0 } }, mulberry32(seed));
      shortSeats.add(state.piles.findIndex((p) => p.length === 2));
    }
    expect(shortSeats).toEqual(new Set([0, 1, 2]));
  });

  test("a shared pile holds every treasure in one stack", () => {
    const state = newGame({ players: 4, treasures: 12, deck: { pile: "shared", reveal: FACE_DOWN, preview: 0 } }, mulberry32(4));
    expect(state.piles.length).toBe(1);
    expect(state.piles[0]?.length).toBe(12);
  });

  test("pawns start on their own corners", () => {
    const state = newGame({ players: 2, treasures: 4, deck: { pile: "shared", reveal: FACE_DOWN, preview: 0 } }, mulberry32(4));
    expect(state.pawns).toEqual([cellOf(0, 0), cellOf(0, 6)]);
  });
});

describe("visible targets", () => {
  const base = newGame({ players: 2, treasures: 6, deck: { pile: "personal", reveal: FACE_DOWN, preview: 0 } }, mulberry32(9));

  test("face down shows only the top card of your own pile", () => {
    expect(visibleTargets(base, 1)).toEqual([base.piles[1]?.[0] ?? -1]);
  });

  test("face up shows your whole pile", () => {
    const up: GameState = { ...base, deck: { pile: "personal", reveal: FACE_UP, preview: 0 } };
    expect(visibleTargets(up, 0)).toEqual(base.piles[0] ?? []);
  });

  test("a shared pile gives everyone the same targets", () => {
    const shared = newGame({ players: 3, treasures: 6, deck: { pile: "shared", reveal: 2, preview: 0 } }, mulberry32(9));
    expect(visibleTargets(shared, 0)).toEqual(visibleTargets(shared, 2));
    expect(visibleTargets(shared, 0).length).toBe(2);
  });
});

describe("playing a turn", () => {
  const pushDownCol1 = SHIFTS.findIndex((s) => s.axis === "col" && s.line === 1 && s.dir === 1);
  const corridor = () => {
    const open = new Array<number>(CELLS).fill(0);
    const treasure = new Array<number>(CELLS).fill(-1);
    open[cellOf(0, 2)] = E | W;
    open[cellOf(0, 3)] = E | W;
    open[cellOf(0, 4)] = W | S;
    open[cellOf(1, 4)] = N;
    treasure[cellOf(1, 4)] = 5;
    treasure[cellOf(0, 3)] = 6;
    return createBoard(open, treasure, N | S, -1);
  };
  const stateWith = (piles: number[][], pile: "shared" | "personal"): GameState => ({
    board: corridor(),
    pawns: [cellOf(0, 2), cellOf(6, 6)],
    piles,
    deck: { pile, reveal: FACE_DOWN, preview: 0 },
    lastShift: null,
    collected: 0,
    total: piles.flat().length,
  });

  test("ending on your target collects it and reveals the next card", () => {
    const result = playTurn(stateWith([[5, 6], [1]], "personal"), 0, { shift: pushDownCol1, spareOpen: N | S }, cellOf(1, 4));
    expect(result.collected).toBe(5);
    expect(result.state.piles[0]).toEqual([6]);
    expect(result.state.collected).toBe(1);
    expect(result.state.lastShift).toBe(pushDownCol1);
  });

  test("passing over a treasure that is not on top does not collect it", () => {
    const result = playTurn(stateWith([[5, 6], [1]], "personal"), 0, { shift: pushDownCol1, spareOpen: N | S }, cellOf(0, 3));
    expect(result.collected).toBeNull();
  });

  test("you cannot collect another player's personal treasure", () => {
    const result = playTurn(stateWith([[1], [5]], "personal"), 0, { shift: pushDownCol1, spareOpen: N | S }, cellOf(1, 4));
    expect(result.collected).toBeNull();
    expect(result.state.piles[1]).toEqual([5]);
  });

  test("anyone can collect from the shared pile", () => {
    const result = playTurn(stateWith([[5, 6]], "shared"), 0, { shift: pushDownCol1, spareOpen: N | S }, cellOf(1, 4));
    expect(result.collected).toBe(5);
    expect(result.state.piles[0]).toEqual([6]);
  });

  test("moving to an unreachable cell is rejected", () => {
    expect(() =>
      playTurn(stateWith([[5]], "shared"), 0, { shift: pushDownCol1, spareOpen: N | S }, cellOf(5, 5)),
    ).toThrow();
  });

  test("undoing the previous push is rejected", () => {
    const state = { ...stateWith([[5]], "shared"), lastShift: reverseShift(pushDownCol1) };
    expect(() => playTurn(state, 0, { shift: pushDownCol1, spareOpen: N | S }, cellOf(0, 2))).toThrow();
  });
});

describe("the look-ahead card", () => {
  const pushDownCol1 = SHIFTS.findIndex((s) => s.axis === "col" && s.line === 1 && s.dir === 1);
  const pushDownCol5 = SHIFTS.findIndex((s) => s.axis === "col" && s.line === 5 && s.dir === 1);
  // Row 0 is a corridor from (0,2) to (0,4), which turns down to (1,4). The target (5) is at (1,4); the
  // look-ahead (6) is at (0,3). Player 0 camps on the look-ahead, player 1 starts at (0,2).
  const camping = (): GameState => {
    const open = new Array<number>(CELLS).fill(0);
    const treasure = new Array<number>(CELLS).fill(-1);
    open[cellOf(0, 2)] = E | W;
    open[cellOf(0, 3)] = E | W;
    open[cellOf(0, 4)] = W | S;
    open[cellOf(1, 4)] = N;
    treasure[cellOf(1, 4)] = 5;
    treasure[cellOf(0, 3)] = 6;
    return {
      board: createBoard(open, treasure, N | S, -1),
      pawns: [cellOf(0, 3), cellOf(0, 2)],
      piles: [[5, 6, 7]],
      deck: { pile: "shared", reveal: FACE_DOWN, preview: 1 },
      lastShift: null,
      collected: 0,
      total: 3,
    };
  };

  test("is shown to the table but is not a target", () => {
    expect(visibleTargets(camping(), 0)).toEqual([5]);
    expect(previewCards(camping(), 0)).toEqual([6]);
    expect(previewCards({ ...camping(), deck: { pile: "shared", reveal: FACE_DOWN, preview: 0 } }, 0)).toEqual([]);
  });

  test("ending on it collects nothing", () => {
    const result = playTurn(camping(), 0, { shift: pushDownCol1, spareOpen: N | S }, cellOf(0, 3));
    expect(result.collected).toBeNull();
    expect(result.state.piles[0]).toEqual([5, 6, 7]);
  });

  test("becomes the target once the target is collected, and the next card becomes the look-ahead", () => {
    const result = playTurn(camping(), 1, { shift: pushDownCol1, spareOpen: N | S }, cellOf(1, 4));
    expect(result.collected).toBe(5);
    expect(visibleTargets(result.state, 0)).toEqual([6]);
    expect(previewCards(result.state, 0)).toEqual([7]);
  });

  test("a camper is not paid at once: they push on their next turn, stay, and collect then", () => {
    const afterOther = playTurn(camping(), 1, { shift: pushDownCol1, spareOpen: N | S }, cellOf(1, 4)).state;
    expect(afterOther.collected).toBe(1);
    expect(afterOther.pawns[0]).toBe(cellOf(0, 3));
    const result = playTurn(afterOther, 0, { shift: pushDownCol5, spareOpen: afterOther.board.spareOpen }, cellOf(0, 3));
    expect(result.collected).toBe(6);
    expect(result.state.collected).toBe(2);
  });
});
