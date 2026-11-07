import { describe, expect, test } from "bun:test";
import {
  CELLS,
  E,
  N,
  S,
  W,
  SHIFTS,
  START_CELLS,
  applyShift,
  cellOf,
  createBoard,
  createStandardBoard,
  isFixedCell,
  legalShiftOptions,
  pathTo,
  reachable,
  reverseShift,
  rotateCW,
  shapeOf,
  shiftLine,
} from "../src/board";
import { mulberry32 } from "../src/rng";

const closedBoard = () => createBoard(new Array<number>(CELLS).fill(0), new Array<number>(CELLS).fill(-1), N | S, -1);

describe("tiles", () => {
  test("rotating clockwise moves each opening one side over", () => {
    expect(rotateCW(N)).toBe(E);
    expect(rotateCW(W)).toBe(N);
    expect(rotateCW(N | E)).toBe(E | S);
    expect(rotateCW(rotateCW(N | S))).toBe(N | S);
  });

  test("shapes are recognised in any rotation", () => {
    expect(shapeOf(E | W)).toBe("straight");
    expect(shapeOf(S | W)).toBe("corner");
    expect(shapeOf(N | E | W)).toBe("tee");
  });
});

describe("standard board", () => {
  const board = createStandardBoard(mulberry32(1));
  const loose = [...Array(CELLS).keys()].filter((i) => !isFixedCell(i)).map((i) => board.open[i] ?? 0);
  loose.push(board.spareOpen);

  test("has 34 loose tiles: 12 straight, 16 corners, 6 tees", () => {
    expect(loose.length).toBe(34);
    expect(loose.filter((o) => shapeOf(o) === "straight").length).toBe(12);
    expect(loose.filter((o) => shapeOf(o) === "corner").length).toBe(16);
    expect(loose.filter((o) => shapeOf(o) === "tee").length).toBe(6);
  });

  test("carries each of the 24 treasures exactly once, 12 of them on fixed tiles", () => {
    const all = [...board.treasure, board.spareTreasure].filter((t) => t >= 0).sort((a, b) => a - b);
    expect(all).toEqual([...Array(24).keys()]);
    const onFixed = [...Array(CELLS).keys()].filter((i) => isFixedCell(i) && (board.treasure[i] ?? -1) >= 0);
    expect(onFixed.length).toBe(12);
  });

  test("start corners open towards the inside of the board", () => {
    expect(board.open[START_CELLS[0] ?? 0]).toBe(E | S);
    expect(board.open[START_CELLS[2] ?? 0]).toBe(N | W);
  });
});

describe("shifting", () => {
  const pushDownCol1 = SHIFTS.findIndex((s) => s.axis === "col" && s.line === 1 && s.dir === 1);
  const pushLeftRow3 = SHIFTS.findIndex((s) => s.axis === "row" && s.line === 3 && s.dir === -1);

  test("there are 12 insertion points, each with a reverse", () => {
    expect(SHIFTS.length).toBe(12);
    expect(reverseShift(reverseShift(pushDownCol1))).toBe(pushDownCol1);
    expect(SHIFTS[reverseShift(pushDownCol1)]).toEqual({ axis: "col", line: 1, dir: -1 });
  });

  test("pushing a column slides it and ejects the far tile as the new spare", () => {
    const open = new Array<number>(CELLS).fill(0);
    const treasure = new Array<number>(CELLS).fill(-1);
    open[cellOf(0, 1)] = E | W;
    treasure[cellOf(6, 1)] = 7;
    const board = createBoard(open, treasure, N | E, 3);
    const after = applyShift(board, [cellOf(2, 1)], { shift: pushDownCol1, spareOpen: N | E });
    expect(after.board.open[cellOf(0, 1)]).toBe(N | E);
    expect(after.board.treasure[cellOf(0, 1)]).toBe(3);
    expect(after.board.open[cellOf(1, 1)]).toBe(E | W);
    expect(after.board.spareTreasure).toBe(7);
    expect(after.pawns).toEqual([cellOf(3, 1)]);
  });

  test("a pawn pushed off the board lands on the inserted tile", () => {
    const after = applyShift(closedBoard(), [cellOf(3, 0), cellOf(3, 6)], { shift: pushLeftRow3, spareOpen: E | W });
    expect(after.pawns).toEqual([cellOf(3, 6), cellOf(3, 5)]);
  });

  test("the previous push cannot be undone straight away", () => {
    const options = legalShiftOptions(closedBoard(), pushDownCol1);
    expect(options.some((o) => o.shift === reverseShift(pushDownCol1))).toBe(false);
    expect(new Set(options.map((o) => o.shift)).size).toBe(11);
  });

  test("symmetric spare rotations are only offered once", () => {
    expect(legalShiftOptions(closedBoard(), null).length).toBe(24);
  });
});

describe("shiftLine", () => {
  test("lists the moved cells from the insertion edge to the ejection edge", () => {
    const pushLeftRow3 = SHIFTS.findIndex((s) => s.axis === "row" && s.line === 3 && s.dir === -1);
    expect(shiftLine(pushLeftRow3)).toEqual([6, 5, 4, 3, 2, 1, 0].map((c) => cellOf(3, c)));
  });
});

describe("pathTo", () => {
  const open = new Array<number>(CELLS).fill(0);
  open[cellOf(1, 1)] = E;
  open[cellOf(1, 2)] = W | S;
  open[cellOf(2, 2)] = N | E;
  open[cellOf(2, 3)] = W;
  const board = createBoard(open, new Array<number>(CELLS).fill(-1), 0, -1);

  test("walks the corridor one cell at a time", () => {
    expect(pathTo(board, cellOf(1, 1), cellOf(2, 3))).toEqual([cellOf(1, 1), cellOf(1, 2), cellOf(2, 2), cellOf(2, 3)]);
  });

  test("is just the start when staying put", () => {
    expect(pathTo(board, cellOf(1, 1), cellOf(1, 1))).toEqual([cellOf(1, 1)]);
  });

  test("is null when the cell cannot be reached", () => {
    expect(pathTo(board, cellOf(1, 1), cellOf(5, 5))).toBeNull();
  });

  test("is null for cells that are not on the board", () => {
    expect(pathTo(board, cellOf(1, 1), -1)).toBeNull();
    expect(pathTo(board, cellOf(1, 1), CELLS)).toBeNull();
    expect(pathTo(board, cellOf(1, 1), 1.5)).toBeNull();
  });
});

describe("reachability", () => {
  test("follows only paths open on both sides", () => {
    const open = new Array<number>(CELLS).fill(0);
    open[cellOf(1, 1)] = E;
    open[cellOf(1, 2)] = W | E | S;
    open[cellOf(1, 3)] = W;
    open[cellOf(2, 2)] = E;
    open[cellOf(0, 2)] = S;
    const board = createBoard(open, new Array<number>(CELLS).fill(-1), 0, -1);
    expect([...reachable(board, cellOf(1, 1))].sort((a, b) => a - b)).toEqual(
      [cellOf(1, 1), cellOf(1, 2), cellOf(1, 3)].sort((a, b) => a - b),
    );
  });
});
