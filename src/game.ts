import {
  type Board,
  type ShiftOption,
  START_CELLS,
  TREASURES,
  applyShift,
  createStandardBoard,
  reachable,
  reverseShift,
  spareRotations,
} from "./board";
import { type Rng, randInt, shuffle } from "./rng";

export type DeckMode = {
  /** One stack for the whole team, or one stack per player that only its owner can collect from. */
  pile: "shared" | "personal";
  /**
   * How many cards from the top of each stack are face up for the whole table. 1 is face-down play where only the
   * top card is turned over (and, this being co-op, shown to everyone); a number at least the pile size shows them all.
   */
  reveal: number;
};

export type GameConfig = { players: number; treasures: number; deck: DeckMode };

export type GameState = {
  board: Board;
  pawns: number[];
  piles: number[][];
  deck: DeckMode;
  lastShift: number | null;
  collected: number;
  total: number;
};

export const newGame = (config: GameConfig, rng: Rng): GameState => {
  const board = createStandardBoard(rng);
  const cards = shuffle([...Array(TREASURES).keys()], rng).slice(0, config.treasures);
  // Uneven deals start at a random seat so the extra cards don't always land on the same players.
  const firstSeat = config.deck.pile === "shared" ? 0 : randInt(rng, config.players);
  const piles =
    config.deck.pile === "shared"
      ? [cards]
      : Array.from({ length: config.players }, (_, p) => cards.filter((_, i) => (i + firstSeat) % config.players === p));
  return {
    board,
    pawns: START_CELLS.slice(0, config.players),
    piles,
    deck: config.deck,
    lastShift: null,
    collected: 0,
    total: cards.length,
  };
};

export const pileIndex = (state: GameState, player: number): number => (state.deck.pile === "shared" ? 0 : player);

/** Treasures this player may collect right now: the face-up cards of the pile they draw from. */
export const visibleTargets = (state: GameState, player: number): number[] =>
  (state.piles[pileIndex(state, player)] ?? []).slice(0, state.deck.reveal);

export const isOver = (state: GameState): boolean => state.collected === state.total;

export type TurnResult = { state: GameState; collected: number | null };

export const playTurn = (state: GameState, player: number, option: ShiftOption, dest: number): TurnResult => {
  if (state.lastShift !== null && option.shift === reverseShift(state.lastShift)) {
    throw new Error("cannot undo the previous push");
  }
  if (!spareRotations(state.board.spareOpen).includes(option.spareOpen)) {
    throw new Error("spare tile was reshaped, not rotated");
  }
  const shifted = applyShift(state.board, state.pawns, option);
  const from = shifted.pawns[player];
  if (from === undefined) throw new Error(`no player ${player}`);
  if (!reachable(shifted.board, from).includes(dest)) throw new Error("destination is not reachable");
  const pawns = shifted.pawns.map((pawn, p) => (p === player ? dest : pawn));
  const treasure = shifted.board.treasure[dest] ?? -1;
  const next: GameState = { ...state, board: shifted.board, pawns, lastShift: option.shift };
  if (treasure < 0 || !visibleTargets(state, player).includes(treasure)) return { state: next, collected: null };
  const index = pileIndex(state, player);
  const piles = state.piles.map((pile, i) => (i === index ? pile.filter((card) => card !== treasure) : pile));
  return { state: { ...next, piles, collected: state.collected + 1 }, collected: treasure };
};
