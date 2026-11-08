import { type Board, type ShiftOption, applyShift, colOf, legalShiftOptions, reachable, rowOf } from "./board";
import { type GameState, pileIndex, previewCards, visibleTargets } from "./game";
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
  /** Grid distance from where the pawn ends to the nearest shown treasure: a target, or a look-ahead card. */
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

const gridDistance = (a: number, b: number): number => Math.abs(rowOf(a) - rowOf(b)) + Math.abs(colOf(a) - colOf(b));

/** Grid distance from a cell to one treasure, null while that treasure is on the spare tile. */
export const distanceToTreasure = (board: Board, cell: number, treasure: number): number | null => {
  const at = board.treasure.indexOf(treasure);
  return at < 0 ? null : gridDistance(at, cell);
};

/**
 * Grid distance to the closest target on the board, for scoring moves: 0 with nothing to chase (every move is as
 * good as any other), a penalty if every target is off the board.
 */
const nearest = (cell: number, cells: readonly number[], targets: readonly number[]): number => {
  if (targets.length === 0) return 0;
  if (cells.length === 0) return OFF_BOARD_DISTANCE;
  return cells.reduce((best, c) => Math.min(best, gridDistance(c, cell)), Number.POSITIVE_INFINITY);
};

/** The treasures a player keeps in view: the ones they can collect, then the look-ahead cards they will be able to. */
const shownCards = (state: GameState, player: number): number[] => [...visibleTargets(state, player), ...previewCards(state, player)];

/**
 * Grid distance from the player's pawn to the nearest treasure they keep in view, as the board stands; null when
 * they have nothing in view (an emptied personal pile).
 */
export const distanceToShown = (state: GameState, player: number): number | null => {
  const shown = shownCards(state, player);
  if (shown.length === 0) return null;
  return nearest(state.pawns[player] ?? 0, targetCells(state.board, shown), shown);
};

/**
 * The treasures anyone at the table can see right now, look-ahead cards included. Cards first turned over by this
 * turn are unknown while planning it.
 */
const knownCards = (state: GameState): Set<number> => new Set(state.pawns.flatMap((_, p) => shownCards(state, p)));

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
  const chase = shownCards(state, player);
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
    // Nothing to collect: head for whichever shown treasure is nearer, the target or the look-ahead.
    const cells = targetCells(shifted.board, chase);
    const dest = reach.reduce((best, cell) => (nearest(cell, cells, chase) < nearest(best, cells, chase) ? cell : best));
    return { option, dest, collects: false, setup: setupFrom(after(dest, state.piles)), distance: nearest(dest, cells, chase) };
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

/**
 * A turn where the player could do nothing useful: it collects nothing, sets nobody up, and ends no closer to any
 * shown treasure than `before`. Waiting on a treasure (distance 0) is a plan, not idleness. With nothing in view
 * (`before` null), every turn that sets nobody up is idle.
 */
export const isIdle = (decision: Decision, before: number | null): boolean => {
  if (decision.collects || decision.setup > 0) return false;
  if (before === null) return true;
  return decision.distance > 0 && decision.distance >= before;
};

const fail = (): never => {
  throw new Error("no legal turn");
};
