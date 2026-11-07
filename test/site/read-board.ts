import { CELLS, SIZE, cellOf, rotateCW } from "../../src/board";

/** Tile size the view draws at. */
const T = 60;

const numbers = (attr: string | null, fn: string): number[] => {
  const match = new RegExp(`${fn}\\(([^)]*)\\)`).exec(attr ?? "");
  if (match === null) throw new Error(`no ${fn}() in "${attr}"`);
  return (match[1] ?? "").split(/[ ,]+/).map(Number);
};

/** Board cell under an SVG point, or null when it is in the margin around the board. */
const cellAt = (x: number, y: number): number | null => {
  const col = Math.floor(x / T) - 1;
  const row = Math.floor(y / T) - 1;
  return row >= 0 && row < SIZE && col >= 0 && col < SIZE ? cellOf(row, col) : null;
};

export type DrawnBoard = { open: number[]; treasure: number[]; spareOpen: number; spareTreasure: number };

/**
 * Reads the board back from what is drawn: where each tile sits, how far its corridors are turned and which
 * treasure it carries. The tile drawn outside the board is the spare.
 */
export const readBoard = (svg: Element): DrawnBoard => {
  const drawn: DrawnBoard = { open: new Array<number>(CELLS).fill(-1), treasure: new Array<number>(CELLS).fill(-1), spareOpen: -1, spareTreasure: -1 };
  for (const tile of svg.querySelectorAll("[data-tile]")) {
    const [x = 0, y = 0] = numbers(tile.getAttribute("transform"), "translate");
    const [angle = 0] = numbers(tile.querySelector("[data-turn]")?.getAttribute("transform") ?? null, "rotate");
    let open = Number(tile.getAttribute("data-shape"));
    for (let k = 0; k < ((Math.round(angle / 90) % 4) + 4) % 4; k++) open = rotateCW(open);
    const treasure = Number(tile.querySelector("[data-treasure]")?.getAttribute("data-treasure") ?? -1);
    const cell = cellAt(x + T / 2, y + T / 2);
    if (cell === null) {
      drawn.spareOpen = open;
      drawn.spareTreasure = treasure;
    } else {
      drawn.open[cell] = open;
      drawn.treasure[cell] = treasure;
    }
  }
  return drawn;
};

/** The cell a pawn is drawn on, read from its position. */
export const readPawnCell = (svg: Element, player: number): number | null => {
  const [x = 0, y = 0] = numbers(svg.querySelector(`[data-player="${player}"]`)?.getAttribute("transform") ?? null, "translate");
  return cellAt(x, y);
};
