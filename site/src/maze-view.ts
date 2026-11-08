import {
  type Board,
  CELLS,
  E,
  N,
  S,
  SHIFTS,
  SIZE,
  type ShiftOption,
  W,
  applyShift,
  colOf,
  isFixedCell,
  pathTo,
  rotateCW,
  rowOf,
  shiftLine,
} from "../../src/board";
import { drawIcon, treasureIcon } from "./icons";
import { type Motion, lerp } from "./motion";
import { svgEl } from "./svg";

/** Tile size in SVG units; the board sits inside a one-tile margin where the spare waits. */
const T = 60;
const CORRIDOR = T * 0.36;
const SHAPES = [N | S, N | E, N | E | W];

type TileView = { g: SVGGElement; turn: SVGGElement; x: number; y: number; angle: number };
type PawnView = { el: SVGPathElement; x: number; y: number };

const quarterTurns = (from: number, to: number): number => {
  let open = from;
  for (let k = 0; k < 4; k++) {
    if (open === to) return k;
    open = rotateCW(open);
  }
  throw new Error("the spare can only be rotated, not reshaped");
};

/** The printed shape a tile is drawn from, and how far it is turned. */
const shapeOf = (open: number): { base: number; turns: number } => {
  for (const base of SHAPES) {
    let rotated = base;
    for (let turns = 0; turns < 4; turns++) {
      if (rotated === open) return { base, turns };
      rotated = rotateCW(rotated);
    }
  }
  throw new Error(`not a tile shape: ${open}`);
};

const corridor = (base: number): string => {
  const c = T / 2;
  const mid: Record<number, string> = { [N]: `${c},0`, [E]: `${T},${c}`, [S]: `${c},${T}`, [W]: `0,${c}` };
  const sides = [N, E, S, W].filter((side) => (base & side) !== 0);
  if (sides.length === 2) return `M${mid[sides[0] ?? N]}L${c},${c}L${mid[sides[1] ?? S]}`;
  const [a, b] = (base & N) !== 0 && (base & S) !== 0 ? [N, S] : [E, W];
  const stub = sides.find((side) => side !== a && side !== b) ?? N;
  return `M${mid[a]}L${mid[b]}M${c},${c}L${mid[stub]}`;
};

/** Pawns are told apart by shape: ● ■ ▲ ◆, in seat order. */
const pawnShape = (player: number, s: number): string => {
  switch (player) {
    case 0:
      return `M${-s},0a${s},${s} 0 1,0 ${2 * s},0a${s},${s} 0 1,0 ${-2 * s},0Z`;
    case 1:
      return `M${-s * 0.9},${-s * 0.9}h${1.8 * s}v${1.8 * s}h${-1.8 * s}Z`;
    case 2:
      return `M0,${-s * 1.1}L${s * 1.05},${s * 0.85}L${-s * 1.05},${s * 0.85}Z`;
    default:
      return `M0,${-s * 1.15}L${s},0L0,${s * 1.15}L${-s},0Z`;
  }
};
const PAWN_OFFSETS: ReadonlyArray<readonly [number, number]> = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
const FIX_MARKS: ReadonlyArray<readonly [number, number]> = [[6, 6], [T - 6, 6], [6, T - 6], [T - 6, T - 6]];

let patterns = 0;

/** Draws a board on an <svg> and animates pushes, walks and finds. It follows the simulator's rules exactly. */
export class MazeView {
  board: Board;
  pawns: number[];
  private readonly svg: SVGSVGElement;
  private readonly motion: Motion;
  private readonly tiles: TileView[] = [];
  private spare: TileView;
  private readonly pawnViews: PawnView[] = [];
  private readonly treasures = new Map<number, SVGGElement>();
  private readonly arrows: SVGPolygonElement[] = [];
  private readonly tileLayer: SVGGElement;
  private readonly hatch: string;

  constructor(svg: SVGSVGElement, board: Board, pawns: readonly number[], motion: Motion) {
    this.svg = svg;
    this.motion = motion;
    this.board = board;
    this.pawns = [...pawns];
    this.hatch = `hatch-${++patterns}`;
    svg.replaceChildren();
    const size = (SIZE + 2) * T;
    svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
    const pattern = svgEl("pattern", { id: this.hatch, width: 7, height: 7, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, svgEl("defs", {}, svg));
    svgEl("line", { x1: 0, y1: 0, x2: 0, y2: 7, class: "hatch-line" }, pattern);
    const arrowLayer = svgEl("g", {}, svg);
    SHIFTS.forEach((_, shift) => this.arrows.push(this.drawArrow(arrowLayer, shift)));
    this.tileLayer = svgEl("g", {}, svg);
    svgEl("rect", { x: T, y: T, width: SIZE * T, height: SIZE * T, class: "frame" }, svg);
    const pawnLayer = svgEl("g", {}, svg);
    for (let cell = 0; cell < CELLS; cell++) {
      const view = this.drawTile(board.open[cell] ?? 0, board.treasure[cell] ?? -1, isFixedCell(cell));
      this.place(view, ...this.cellXY(cell));
      this.tiles.push(view);
    }
    this.spare = this.drawTile(board.spareOpen, board.spareTreasure, false);
    this.place(this.spare, ...this.slotIn(2).at);
    this.pawns.forEach((cell, player) => {
      const el = svgEl("path", { class: "pawn", d: pawnShape(player, T * 0.1), "data-player": player }, pawnLayer);
      this.pawnViews.push({ el, x: 0, y: 0 });
      this.setPawn(player, cell);
    });
  }

  /** Highlights the face-up treasures everyone is hunting. */
  setTargets(ids: readonly number[]): void {
    for (const [id, g] of this.treasures) g.classList.toggle("target", ids.includes(id));
  }

  /** Marks the look-ahead treasures: shown to everyone, next in line, not yet collectable. */
  setLookAhead(ids: readonly number[]): void {
    for (const [id, g] of this.treasures) g.classList.toggle("ahead", ids.includes(id));
  }

  /** Puts a pawn on a cell without walking there; for setting up a scene. */
  placePawn(player: number, cell: number): void {
    this.pawns[player] = cell;
    this.setPawn(player, cell);
  }

  async push(option: ShiftOption): Promise<void> {
    const line = shiftLine(option.shift);
    const last = line.length - 1;
    const { at, d } = this.slotIn(option.shift);
    const spare = this.spare;
    const delta = [0, 90, 180, -90][quarterTurns(this.board.spareOpen, option.spareOpen)] ?? 0;
    this.tileLayer.appendChild(spare.g);
    this.arrows.forEach((arrow, i) => arrow.classList.toggle("active", i === option.shift));
    const from = { x: spare.x, y: spare.y, angle: spare.angle };
    await this.motion.tween(560, (t) => {
      this.place(spare, lerp(from.x, at[0], t), lerp(from.y, at[1], t));
      this.turn(spare, lerp(from.angle, from.angle + delta, t));
    });
    const moving = [...line.map((cell) => this.tileAt(cell)), spare].map((view) => ({ view, x: view.x, y: view.y }));
    const riders = this.pawns.flatMap((cell, player) => {
      const pawn = this.pawnViews[player];
      return pawn !== undefined && line.includes(cell) ? [{ player, pawn, x: pawn.x, y: pawn.y, wraps: cell === line[last] }] : [];
    });
    await this.motion.tween(620, (t) => {
      for (const m of moving) this.place(m.view, m.x + d[0] * t, m.y + d[1] * t);
      for (const r of riders) this.movePawn(r.pawn, r.x + d[0] * t, r.y + d[1] * t);
    });
    const next = applyShift(this.board, this.pawns, option);
    const ejected = this.tileAt(line[last] ?? 0);
    for (let i = last; i > 0; i--) this.tiles[line[i] ?? 0] = this.tileAt(line[i - 1] ?? 0);
    this.tiles[line[0] ?? 0] = spare;
    this.spare = ejected;
    this.board = next.board;
    this.pawns = next.pawns;
    const wrapped = riders.filter((r) => r.wraps);
    await this.motion.tween(200, (t) => wrapped.forEach((r) => r.pawn.el.setAttribute("opacity", String(1 - t))));
    for (const r of riders) this.setPawn(r.player, this.pawns[r.player] ?? 0);
    await this.motion.tween(240, (t) => wrapped.forEach((r) => r.pawn.el.setAttribute("opacity", String(t))));
    this.arrows[option.shift]?.classList.remove("active");
  }

  async walk(player: number, dest: number): Promise<void> {
    const pawn = this.pawnViews[player];
    const from = this.pawns[player];
    if (pawn === undefined || from === undefined) throw new Error(`no player ${player}`);
    const path = pathTo(this.board, from, dest);
    if (path === null) throw new Error(`player ${player} cannot reach cell ${dest}`);
    for (const cell of path.slice(1)) {
      const start = { x: pawn.x, y: pawn.y };
      const [x, y] = this.pawnXY(cell, player);
      await this.motion.tween(150, (t) => this.movePawn(pawn, lerp(start.x, x, t), lerp(start.y, y, t)));
    }
    this.pawns[player] = dest;
    this.setPawn(player, dest);
  }

  /** Treasures are printed on their tiles, so a found one stays on the board, faded. */
  async markFound(id: number): Promise<void> {
    const g = this.treasures.get(id);
    if (g === undefined) return;
    const c = T / 2;
    await this.motion.tween(480, (t) => g.setAttribute("transform", `translate(${c},${c}) scale(${1 + Math.sin(t * Math.PI) * 0.6})`));
    g.setAttribute("transform", `translate(${c},${c})`);
    g.classList.remove("target", "ahead");
    g.classList.add("found");
  }

  /** The maze shakes once per turn as the collapse gets closer. */
  shake(): void {
    this.svg.classList.remove("shake");
    void this.svg.getBoundingClientRect();
    this.svg.classList.add("shake");
  }

  private tileAt(cell: number): TileView {
    const view = this.tiles[cell];
    if (view === undefined) throw new Error(`no tile at ${cell}`);
    return view;
  }

  private cellXY(cell: number): [number, number] {
    return [(colOf(cell) + 1) * T, (rowOf(cell) + 1) * T];
  }

  private slotIn(shift: number): { at: [number, number]; d: [number, number] } {
    const line = shiftLine(shift);
    const [ax, ay] = this.cellXY(line[0] ?? 0);
    const [bx, by] = this.cellXY(line[1] ?? 0);
    const d: [number, number] = [bx - ax, by - ay];
    return { at: [ax - d[0], ay - d[1]], d };
  }

  private drawArrow(layer: SVGGElement, shift: number): SVGPolygonElement {
    const { at, d } = this.slotIn(shift);
    const [ux, uy] = [d[0] / T, d[1] / T];
    const [tipX, tipY] = [at[0] + T / 2 + ux * (T / 2 - 5), at[1] + T / 2 + uy * (T / 2 - 5)];
    const [backX, backY] = [tipX - ux * 11, tipY - uy * 11];
    const [px, py] = [-uy * 6, ux * 6];
    const points = `${tipX},${tipY} ${backX + px},${backY + py} ${backX - px},${backY - py}`;
    return svgEl("polygon", { class: "arrow", points }, layer);
  }

  private drawTile(open: number, treasureId: number, fixed: boolean): TileView {
    const { base, turns } = shapeOf(open);
    const g = svgEl("g", { "data-tile": fixed ? "fixed" : "loose", "data-shape": base }, this.tileLayer);
    svgEl("rect", { x: 0, y: 0, width: T, height: T, class: "tile-paper" }, g);
    svgEl("rect", { x: 0, y: 0, width: T, height: T, fill: `url(#${this.hatch})` }, g);
    svgEl("rect", { x: 0.5, y: 0.5, width: T - 1, height: T - 1, class: "tile-edge" }, g);
    const turn = svgEl("g", { "data-turn": "" }, g);
    const d = corridor(base);
    svgEl("path", { d, class: "wall", "stroke-width": CORRIDOR + 2.6 }, turn);
    svgEl("path", { d, class: "floor", "stroke-width": CORRIDOR }, turn);
    if (fixed) {
      for (const [x, y] of FIX_MARKS) svgEl("path", { class: "fix", d: `M${x - 4},${y}h8M${x},${y - 4}v8` }, g);
    }
    if (treasureId >= 0) {
      const tg = svgEl("g", { class: "treasure", "data-treasure": treasureId, transform: `translate(${T / 2},${T / 2})` }, g);
      svgEl("circle", { class: "ring", r: T * 0.36 }, tg);
      svgEl("circle", { class: "disc", r: T * 0.25 }, tg);
      drawIcon(tg, treasureIcon(treasureId), T * 0.34, 0, 0);
      this.treasures.set(treasureId, tg);
    }
    const view = { g, turn, x: 0, y: 0, angle: 0 };
    this.turn(view, turns * 90);
    return view;
  }

  private place(view: TileView, x: number, y: number): void {
    view.x = x;
    view.y = y;
    view.g.setAttribute("transform", `translate(${x},${y})`);
  }

  private turn(view: TileView, angle: number): void {
    view.angle = angle;
    view.turn.setAttribute("transform", `rotate(${angle} ${T / 2} ${T / 2})`);
  }

  private pawnXY(cell: number, player: number): [number, number] {
    const [x, y] = this.cellXY(cell);
    const [ox, oy] = PAWN_OFFSETS[player] ?? [0, 0];
    return [x + T / 2 + ox * T * 0.11, y + T / 2 + oy * T * 0.11];
  }

  private movePawn(pawn: PawnView, x: number, y: number): void {
    pawn.x = x;
    pawn.y = y;
    pawn.el.setAttribute("transform", `translate(${x},${y})`);
  }

  private setPawn(player: number, cell: number): void {
    const pawn = this.pawnViews[player];
    if (pawn === undefined) return;
    this.movePawn(pawn, ...this.pawnXY(cell, player));
    pawn.el.setAttribute("data-cell", String(cell));
  }
}
