import { type Rng, randInt, shuffle } from "./rng";

/** Tile openings are a bitmask of the sides a path leaves through. */
export const N = 1;
export const E = 2;
export const S = 4;
export const W = 8;

export const SIZE = 7;
export const CELLS = SIZE * SIZE;
export const TREASURES = 24;

export const cellOf = (row: number, col: number): number => row * SIZE + col;
export const rowOf = (cell: number): number => Math.floor(cell / SIZE);
export const colOf = (cell: number): number => cell % SIZE;
export const isFixedCell = (cell: number): boolean => rowOf(cell) % 2 === 0 && colOf(cell) % 2 === 0;

/** Player start corners, in seating order around the table. */
export const START_CELLS = [cellOf(0, 0), cellOf(0, 6), cellOf(6, 6), cellOf(6, 0)];

export const rotateCW = (open: number): number => ((open << 1) | (open >> 3)) & 15;

export type Shape = "straight" | "corner" | "tee";

export const shapeOf = (open: number): Shape => {
  const sides = [N, E, S, W].filter((side) => (open & side) !== 0).length;
  if (sides === 3) return "tee";
  return open === (N | S) || open === (E | W) ? "straight" : "corner";
};

export type Board = {
  open: Uint8Array;
  /** Treasure id on each cell, -1 for none. */
  treasure: Int8Array;
  spareOpen: number;
  spareTreasure: number;
};

export const createBoard = (
  open: ArrayLike<number>,
  treasure: ArrayLike<number>,
  spareOpen: number,
  spareTreasure: number,
): Board => ({ open: Uint8Array.from(open), treasure: Int8Array.from(treasure), spareOpen, spareTreasure });

/**
 * The 16 tiles glued to the board. Corners are the start squares; the 12 tees carry treasures 0-11.
 * Edge tees face inwards; the inner four are a rotationally symmetric approximation of the printed board.
 */
const FIXED: ReadonlyArray<{ cell: number; open: number }> = [
  { cell: cellOf(0, 0), open: E | S },
  { cell: cellOf(0, 6), open: S | W },
  { cell: cellOf(6, 6), open: N | W },
  { cell: cellOf(6, 0), open: N | E },
  { cell: cellOf(0, 2), open: E | S | W },
  { cell: cellOf(0, 4), open: E | S | W },
  { cell: cellOf(2, 6), open: N | S | W },
  { cell: cellOf(4, 6), open: N | S | W },
  { cell: cellOf(6, 2), open: N | E | W },
  { cell: cellOf(6, 4), open: N | E | W },
  { cell: cellOf(2, 0), open: N | E | S },
  { cell: cellOf(4, 0), open: N | E | S },
  { cell: cellOf(2, 2), open: E | S | W },
  { cell: cellOf(2, 4), open: N | S | W },
  { cell: cellOf(4, 4), open: N | E | W },
  { cell: cellOf(4, 2), open: N | E | S },
];

/** 34 loose tiles: 12 plain straights, 16 corners (6 with treasures 12-17), 6 tees (treasures 18-23). */
const LOOSE: ReadonlyArray<{ open: number; treasure: number }> = [
  ...Array.from({ length: 12 }, () => ({ open: N | S, treasure: -1 })),
  ...Array.from({ length: 16 }, (_, i) => ({ open: N | E, treasure: i < 6 ? 12 + i : -1 })),
  ...Array.from({ length: 6 }, (_, i) => ({ open: N | E | W, treasure: 18 + i })),
];

const rotateTimes = (open: number, times: number): number => {
  let out = open;
  for (let i = 0; i < times; i++) out = rotateCW(out);
  return out;
};

export const createStandardBoard = (rng: Rng): Board => {
  const open = new Uint8Array(CELLS);
  const treasure = new Int8Array(CELLS).fill(-1);
  let fixedTreasure = 0;
  for (const tile of FIXED) {
    open[tile.cell] = tile.open;
    if (!START_CELLS.includes(tile.cell)) treasure[tile.cell] = fixedTreasure++;
  }
  const loose = shuffle(LOOSE, rng).map((t) => ({ open: rotateTimes(t.open, randInt(rng, 4)), treasure: t.treasure }));
  let next = 0;
  for (let cell = 0; cell < CELLS; cell++) {
    if (isFixedCell(cell)) continue;
    const tile = loose[next++];
    if (tile === undefined) throw new Error("ran out of loose tiles");
    open[cell] = tile.open;
    treasure[cell] = tile.treasure;
  }
  const spare = loose[next];
  if (spare === undefined || next !== loose.length - 1) throw new Error("expected exactly one spare tile");
  return { open, treasure, spareOpen: spare.open, spareTreasure: spare.treasure };
};

/** A push of the spare tile into a movable row or column. dir 1 pushes from the top/left edge. */
export type Shift = { axis: "row" | "col"; line: number; dir: 1 | -1 };

export const SHIFTS: readonly Shift[] = [1, 3, 5].flatMap((line) => [
  { axis: "col" as const, line, dir: 1 as const },
  { axis: "col" as const, line, dir: -1 as const },
  { axis: "row" as const, line, dir: 1 as const },
  { axis: "row" as const, line, dir: -1 as const },
]);

export const reverseShift = (index: number): number => {
  const shift = SHIFTS[index];
  if (shift === undefined) throw new Error(`no shift ${index}`);
  return SHIFTS.findIndex((s) => s.axis === shift.axis && s.line === shift.line && s.dir === -shift.dir);
};

/** Which shift to make and how the spare tile is rotated when it goes in. */
export type ShiftOption = { shift: number; spareOpen: number };

const lineCells = (shift: Shift): number[] =>
  Array.from({ length: SIZE }, (_, i) => (shift.axis === "col" ? cellOf(i, shift.line) : cellOf(shift.line, i)));

const LINE_CELLS = SHIFTS.map((shift) => (shift.dir === 1 ? lineCells(shift) : lineCells(shift).reverse()));

/** The cells a push moves, from the edge the spare goes in to the edge a tile falls out. */
export const shiftLine = (shift: number): readonly number[] => {
  const line = LINE_CELLS[shift];
  if (line === undefined) throw new Error(`no shift ${shift}`);
  return line;
};

export type ShiftResult = { board: Board; pawns: number[] };

export const applyShift = (board: Board, pawns: readonly number[], option: ShiftOption): ShiftResult => {
  const line = shiftLine(option.shift);
  const open = board.open.slice();
  const treasure = board.treasure.slice();
  const ejected = line[SIZE - 1] ?? 0;
  for (let i = SIZE - 1; i > 0; i--) {
    const to = line[i] ?? 0;
    const from = line[i - 1] ?? 0;
    open[to] = board.open[from] ?? 0;
    treasure[to] = board.treasure[from] ?? -1;
  }
  const inserted = line[0] ?? 0;
  open[inserted] = option.spareOpen;
  treasure[inserted] = board.spareTreasure;
  const moved = pawns.map((pawn) => {
    const at = line.indexOf(pawn);
    if (at === -1) return pawn;
    return at === SIZE - 1 ? inserted : (line[at + 1] ?? pawn);
  });
  return {
    board: { open, treasure, spareOpen: board.open[ejected] ?? 0, spareTreasure: board.treasure[ejected] ?? -1 },
    pawns: moved,
  };
};

export const spareRotations = (spareOpen: number): number[] => {
  const out: number[] = [];
  let open = spareOpen;
  for (let i = 0; i < 4; i++) {
    if (!out.includes(open)) out.push(open);
    open = rotateCW(open);
  }
  return out;
};

export const legalShiftOptions = (board: Board, lastShift: number | null): ShiftOption[] => {
  const forbidden = lastShift === null ? -1 : reverseShift(lastShift);
  const rotations = spareRotations(board.spareOpen);
  const options: ShiftOption[] = [];
  for (let shift = 0; shift < SHIFTS.length; shift++) {
    if (shift === forbidden) continue;
    for (const spareOpen of rotations) options.push({ shift, spareOpen });
  }
  return options;
};

const STEPS: ReadonlyArray<{ side: number; opposite: number; dr: number; dc: number }> = [
  { side: N, opposite: S, dr: -1, dc: 0 },
  { side: E, opposite: W, dr: 0, dc: 1 },
  { side: S, opposite: N, dr: 1, dc: 0 },
  { side: W, opposite: E, dr: 0, dc: -1 },
];

/** Cell each reachable cell was first entered from, -1 for the start; -2 marks cells not reached. */
const parent = new Int8Array(CELLS);

/** Breadth-first walk from `from`, filling `parent`; returns cells in the order they were reached. */
const explore = (board: Board, from: number): number[] => {
  parent.fill(-2);
  const out = [from];
  parent[from] = -1;
  for (let i = 0; i < out.length; i++) {
    const cell = out[i] ?? 0;
    const open = board.open[cell] ?? 0;
    const row = rowOf(cell);
    const col = colOf(cell);
    for (const step of STEPS) {
      if ((open & step.side) === 0) continue;
      const r = row + step.dr;
      const c = col + step.dc;
      if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) continue;
      const next = cellOf(r, c);
      if (parent[next] !== -2 || ((board.open[next] ?? 0) & step.opposite) === 0) continue;
      parent[next] = cell;
      out.push(next);
    }
  }
  return out;
};

/** Every cell a pawn on `from` can walk to without shifting anything. */
export const reachable = (board: Board, from: number): number[] => explore(board, from);

/** The shortest walk from `from` to `to`, both included, or null when `to` is out of reach. */
export const pathTo = (board: Board, from: number, to: number): number[] | null => {
  if (!Number.isInteger(to) || to < 0 || to >= CELLS) return null;
  explore(board, from);
  if (parent[to] === -2) return null;
  const path = [to];
  for (let cell = parent[to] ?? -1; cell >= 0; cell = parent[cell] ?? -1) path.unshift(cell);
  return path;
};
