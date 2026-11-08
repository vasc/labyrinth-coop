import { describe, expect, test } from "bun:test";
import { SHIFTS, START_CELLS, type ShiftOption, applyShift, cellOf, legalShiftOptions, reachable, rotateCW, shiftLine } from "../../src/board";
import { newGame } from "../../src/game";
import { mulberry32, pick } from "../../src/rng";
import { MazeView } from "../../site/src/maze-view";
import { instantMotion } from "../../site/src/motion";
import { readBoard, readPawnCell } from "./read-board";

const SVG_NS = "http://www.w3.org/2000/svg";

const setup = () => {
  const svg = document.createElementNS(SVG_NS, "svg");
  document.body.appendChild(svg);
  const state = newGame({ players: 3, treasures: 12, deck: { pile: "shared", reveal: 1, preview: 0 } }, mulberry32(5));
  const view = new MazeView(svg, state.board, state.pawns, instantMotion);
  return { svg, state, view };
};

const asDrawn = (board: { open: ArrayLike<number>; treasure: ArrayLike<number>; spareOpen: number; spareTreasure: number }) => ({
  open: Array.from(board.open),
  treasure: Array.from(board.treasure),
  spareOpen: board.spareOpen,
  spareTreasure: board.spareTreasure,
});

const quarterTurns = (from: number, to: number): number => {
  let open = from;
  for (let k = 0; k < 4; k++) {
    if (open === to) return k;
    open = rotateCW(open);
  }
  return -1;
};

describe("MazeView", () => {
  test("draws the 49 board tiles plus the spare, every treasure, and one pawn per player", () => {
    const { svg } = setup();
    expect(svg.querySelectorAll("[data-tile]").length).toBe(50);
    expect(svg.querySelectorAll("[data-treasure]").length).toBe(24);
    expect(svg.querySelectorAll("[data-player]").length).toBe(3);
    expect(readPawnCell(svg, 2)).toBe(START_CELLS[2] ?? -1);
  });

  test("draws exactly the board it was given", () => {
    const { svg, state } = setup();
    expect(readBoard(svg)).toEqual(asDrawn(state.board));
  });

  test("each treasure is drawn with a real icon", () => {
    const { svg } = setup();
    for (const treasure of svg.querySelectorAll("[data-treasure]")) {
      expect(treasure.querySelectorAll(".icon path, .icon circle, .icon rect, .icon line, .icon polyline, .icon ellipse").length).toBeGreaterThan(0);
    }
  });

  test("marks only the face-up treasures as targets", () => {
    const { svg, view } = setup();
    view.setTargets([7]);
    expect([...svg.querySelectorAll(".target")].map((t) => t.getAttribute("data-treasure"))).toEqual(["7"]);
    view.setTargets([2]);
    expect([...svg.querySelectorAll(".target")].map((t) => t.getAttribute("data-treasure"))).toEqual(["2"]);
  });

  test("marks the look-ahead treasures apart from the targets, and drops the mark once found", async () => {
    const { svg, view } = setup();
    view.setTargets([7]);
    view.setLookAhead([2]);
    expect([...svg.querySelectorAll(".ahead")].map((t) => t.getAttribute("data-treasure"))).toEqual(["2"]);
    expect([...svg.querySelectorAll(".target")].map((t) => t.getAttribute("data-treasure"))).toEqual(["7"]);
    view.setLookAhead([]);
    expect(svg.querySelectorAll(".ahead").length).toBe(0);
    view.setLookAhead([2]);
    await view.markFound(2);
    expect(svg.querySelectorAll(".ahead").length).toBe(0);
  });

  test("after every push, with the spare turned each way, the drawing matches the rules", async () => {
    const { svg, state, view } = setup();
    const rng = mulberry32(9);
    let board = state.board;
    let pawns = state.pawns;
    let last: number | null = null;
    const turnsSeen = new Set<number>();
    for (let i = 0; i < 24; i++) {
      const options = legalShiftOptions(board, last);
      const wanted = options.filter((o) => quarterTurns(board.spareOpen, o.spareOpen) === i % 4);
      const option: ShiftOption = pick(wanted.length > 0 ? wanted : options, rng);
      turnsSeen.add(quarterTurns(board.spareOpen, option.spareOpen));
      await view.push(option);
      ({ board, pawns } = applyShift(board, pawns, option));
      last = option.shift;
      expect(readBoard(svg)).toEqual(asDrawn(board));
      pawns.forEach((cell, player) => expect(readPawnCell(svg, player)).toBe(cell));
    }
    expect(turnsSeen).toEqual(new Set([0, 1, 2, 3]));
  });

  test("a pawn pushed off the edge is drawn, fully visible, on the inserted tile", async () => {
    const { svg, view } = setup();
    const pushRightRow1 = SHIFTS.findIndex((s) => s.axis === "row" && s.line === 1 && s.dir === 1);
    const line = shiftLine(pushRightRow1);
    // Start corners never move, so put player 0 at the far end of row 1 before pushing it.
    view.placePawn(0, line[line.length - 1] ?? 0);
    await view.push({ shift: pushRightRow1, spareOpen: view.board.spareOpen });
    expect(view.pawns[0]).toBe(cellOf(1, 0));
    expect(readPawnCell(svg, 0)).toBe(cellOf(1, 0));
    expect(svg.querySelector('[data-player="0"]')?.getAttribute("opacity")).toBe("1");
  });

  test("walking moves the pawn to the destination", async () => {
    const { svg, state, view } = setup();
    const dest = reachable(state.board, state.pawns[0] ?? 0).at(-1) ?? 0;
    await view.walk(0, dest);
    expect(view.pawns[0]).toBe(dest);
    expect(readPawnCell(svg, 0)).toBe(dest);
  });

  test("walking somewhere out of reach is refused", async () => {
    const { state, view } = setup();
    const reach = reachable(state.board, state.pawns[0] ?? 0);
    const unreachable = [...Array(49).keys()].find((cell) => !reach.includes(cell)) ?? -1;
    expect(view.walk(0, unreachable)).rejects.toThrow();
    expect(view.walk(0, 49)).rejects.toThrow();
  });

  test("a found treasure stays on its tile, faded, and is no longer a target", async () => {
    const { svg, view } = setup();
    view.setTargets([4]);
    await view.markFound(4);
    const found = svg.querySelector('[data-treasure="4"]');
    expect(found?.classList.contains("found")).toBe(true);
    expect(found?.classList.contains("target")).toBe(false);
  });
});
