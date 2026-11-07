import { type Board, type ShiftOption, applyShift, colOf, legalShiftOptions, reachable, rowOf } from "./board";
import { type GameState, pileIndex, visibleTargets } from "./game";
import { type Rng, shuffle } from "./rng";

/**
 * How a seat chooses its turn.
 * - plans: when it cannot collect, it spends its turn setting up the next player instead of only playing for itself.
 * - vision: the share (0-1) of the possible pushes (insertion point and spare rotation) it actually works out,
 *   picked at random. Once a push is worked out, the resulting board is read perfectly. A planner sizing up the
 *   next player's turn works out the same share of that player's pushes.
 */
export type Policy = { plans: boolean; vision: number };

export const PERFECT_PLANNER: Policy = { plans: true, vision: 1 };

export type Candidate = {
  option: ShiftOption;
  dest: number;
  collects: boolean;
  /** Chance the next player collects next turn because of this shift, as judged by a planner. */
  setup: number;
  /** Grid distance from where the pawn ends to the nearest treasure it is after. */
  distance: number;
};

export type Decision = Candidate & {
  /** The player passed up their own best move to set up the next player. */
  sacrifice: boolean;
};

const SETUP_WEIGHT = 0.9;
const DISTANCE_WEIGHT = 0.01;
/** Distance charged when a push carries your own target off the board: worse than anywhere on it (max 12). */
const OFF_BOARD_DISTANCE = 13;

/** Chance that looking at `looked` of `total` options at random includes at least one of the `good` ones. */
export const chanceToFind = (total: number, good: number, looked: number): number => {
  if (good <= 0) return 0;
  if (looked >= total) return 1;
  let miss = 1;
  for (let i = 0; i < looked; i++) miss *= (total - good - i) / (total - i);
  return 1 - Math.max(0, miss);
};

export const visionCount = (policy: Policy, total: number): number =>
  Math.min(total, Math.max(1, Math.round(policy.vision * total)));

export const optionsSeen = (policy: Policy, options: ShiftOption[], rng: Rng): ShiftOption[] => {
  const count = visionCount(policy, options.length);
  return count >= options.length ? options : shuffle(options, rng).slice(0, count);
};

const targetCells = (board: Board, targets: readonly number[]): number[] => {
  const cells: number[] = [];
  board.treasure.forEach((t, cell) => {
    if (targets.includes(t)) cells.push(cell);
  });
  return cells;
};

/** Grid distance to the closest target on the board; 0 with nothing to chase, a penalty if every target is off the board. */
const nearest = (cell: number, cells: readonly number[], targets: readonly number[]): number => {
  if (targets.length === 0) return 0;
  if (cells.length === 0) return OFF_BOARD_DISTANCE;
  return cells.reduce((best, c) => Math.min(best, Math.abs(rowOf(c) - rowOf(cell)) + Math.abs(colOf(c) - colOf(cell))), Number.POSITIVE_INFINITY);
};

/** The treasures anyone at the table can see right now. Cards revealed by this turn are unknown while planning it. */
const knownCards = (state: GameState): Set<number> =>
  new Set(state.pawns.flatMap((_, p) => visibleTargets(state, p)));

/**
 * How likely `next` is to collect on their turn from this position, as judged by `planner`: the planner works out
 * its share of the next player's pushes, estimates from those how many pushes would work, and discounts by how
 * likely the next player is to spot one of them.
 */
const nextPlayerChance = (after: GameState, next: number, nextPolicy: Policy, planner: Policy, known: Set<number>, rng: Rng): number => {
  const targets = visibleTargets(after, next).filter((t) => known.has(t));
  if (targets.length === 0) return 0;
  const options = legalShiftOptions(after.board, after.lastShift);
  const inspected = optionsSeen(planner, options, rng);
  const nextSeesAll = visionCount(nextPolicy, options.length) >= options.length;
  let good = 0;
  for (const option of inspected) {
    const shifted = applyShift(after.board, after.pawns, option);
    const pawn = shifted.pawns[next] ?? 0;
    if (reachable(shifted.board, pawn).some((cell) => targets.includes(shifted.board.treasure[cell] ?? -1))) {
      if (nextSeesAll) return 1;
      good++;
    }
  }
  const estimated = Math.round((good * options.length) / inspected.length);
  return chanceToFind(options.length, Math.max(estimated, good > 0 ? 1 : 0), visionCount(nextPolicy, options.length));
};

const withoutCard = (state: GameState, player: number, card: number): number[][] => {
  const index = pileIndex(state, player);
  return state.piles.map((pile, i) => (i === index ? pile.filter((c) => c !== card) : pile));
};

/** The best way to play each shift option for `player`, scored the way their policy would. */
export const evaluate = (state: GameState, player: number, policies: readonly Policy[], options: ShiftOption[], rng: Rng): Candidate[] => {
  const policy = policies[player] ?? PERFECT_PLANNER;
  const next = (player + 1) % state.pawns.length;
  const nextPolicy = policies[next] ?? PERFECT_PLANNER;
  const plans = policy.plans && next !== player;
  const targets = visibleTargets(state, player);
  const known = plans ? knownCards(state) : new Set<number>();
  return options.map((option) => {
    const shifted = applyShift(state.board, state.pawns, option);
    const reach = reachable(shifted.board, shifted.pawns[player] ?? 0);
    const after = (dest: number, piles: number[][]): GameState => ({
      ...state,
      board: shifted.board,
      pawns: shifted.pawns.map((p, i) => (i === player ? dest : p)),
      piles,
      lastShift: option.shift,
    });
    const setupFrom = (position: GameState): number =>
      plans ? nextPlayerChance(position, next, nextPolicy, policy, known, rng) : 0;
    const collectCells = reach.filter((cell) => targets.includes(shifted.board.treasure[cell] ?? -1));
    if (collectCells.length > 0) {
      const scored = collectCells.map((dest) => {
        const setup = setupFrom(after(dest, withoutCard(state, player, shifted.board.treasure[dest] ?? -1)));
        return { option, dest, collects: true, setup, distance: 0 };
      });
      return scored.reduce((best, c) => (c.setup > best.setup ? c : best));
    }
    const cells = targetCells(shifted.board, targets);
    const dest = reach.reduce((best, cell) => (nearest(cell, cells, targets) < nearest(best, cells, targets) ? cell : best));
    return { option, dest, collects: false, setup: setupFrom(after(dest, state.piles)), distance: nearest(dest, cells, targets) };
  });
};

export const score = (c: Candidate): number =>
  (c.collects ? 1 : 0) + SETUP_WEIGHT * c.setup - DISTANCE_WEIGHT * c.distance;

const selfishScore = (c: Candidate): number => (c.collects ? 1 : 0) - DISTANCE_WEIGHT * c.distance;

const EPSILON = 1e-9;

/**
 * A sacrifice is a non-collecting turn whose setup beats every move the player would have made playing only
 * for itself, so the help came at the cost of its own position.
 */
export const isSacrifice = (chosen: Candidate, candidates: readonly Candidate[]): boolean => {
  if (chosen.collects) return false;
  const bestSelfish = Math.max(...candidates.map(selfishScore));
  const selfishSetup = Math.max(...candidates.filter((c) => selfishScore(c) >= bestSelfish - EPSILON).map((c) => c.setup));
  return chosen.setup > selfishSetup + EPSILON;
};

export const decide = (state: GameState, player: number, policies: readonly Policy[], rng: Rng): Decision => {
  const policy = policies[player] ?? PERFECT_PLANNER;
  const seen = optionsSeen(policy, legalShiftOptions(state.board, state.lastShift), rng);
  const candidates = evaluate(state, player, policies, seen, rng);
  const top = Math.max(...candidates.map(score));
  const chosen = shuffle(candidates.filter((c) => score(c) >= top - EPSILON), rng)[0] ?? candidates[0] ?? fail();
  return { ...chosen, sacrifice: isSacrifice(chosen, candidates) };
};

const fail = (): never => {
  throw new Error("no legal turn");
};
