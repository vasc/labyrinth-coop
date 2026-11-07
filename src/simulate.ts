import { type GameConfig, isOver, newGame, playTurn } from "./game";
import { type Policy, decide } from "./policy";
import { mulberry32 } from "./rng";

/**
 * Who sits at the table.
 * - team: everyone plays as a planner, i.e. the kid's turns are talked through with the table.
 * - kid: seat 0 is a kid playing their own turns unaided; the adults plan around them.
 * - solo: nobody plans for anyone else (baseline for how much teamwork matters).
 */
export type Composition = "team" | "kid" | "solo";

export type SimConfig = GameConfig & { composition: Composition; kidVision: number; adultVision: number };

export type GameResult = {
  /** Turns the whole table took to collect everything, null if it hit the turn cap first. */
  turnsNeeded: number | null;
  turnsPlayed: number;
  collectionsBySeat: number[];
  /** Turns where a player passed up their own best move to set up the next player. */
  sacrifices: number;
  /** Sacrifices after which the next player did collect. */
  assists: number;
  kidTurns: number;
};

export const policiesFor = (composition: Composition, players: number, kidVision: number, adultVision: number): Policy[] =>
  Array.from({ length: players }, (_, seat): Policy => {
    if (composition === "solo") return { plans: false, vision: adultVision };
    if (composition === "kid" && seat === 0) return { plans: false, vision: kidVision };
    return { plans: true, vision: adultVision };
  });

export const runGame = (config: SimConfig, seed: number, maxTurns: number): GameResult => {
  const rng = mulberry32(seed);
  const policies = policiesFor(config.composition, config.players, config.kidVision, config.adultVision);
  let state = newGame(config, rng);
  const collectionsBySeat = new Array<number>(config.players).fill(0);
  let sacrifices = 0;
  let assists = 0;
  let kidTurns = 0;
  let previousWasSacrifice = false;
  let turn = 0;
  while (!isOver(state) && turn < maxTurns) {
    const player = turn % config.players;
    if (player === 0) kidTurns++;
    const choice = decide(state, player, policies, rng);
    const result = playTurn(state, player, choice.option, choice.dest);
    state = result.state;
    if (result.collected !== null) {
      collectionsBySeat[player] = (collectionsBySeat[player] ?? 0) + 1;
      if (previousWasSacrifice) assists++;
    }
    if (choice.sacrifice) sacrifices++;
    previousWasSacrifice = choice.sacrifice;
    turn++;
  }
  return { turnsNeeded: isOver(state) ? turn : null, turnsPlayed: turn, collectionsBySeat, sacrifices, assists, kidTurns };
};

export type Summary = {
  games: number;
  mean: number | null;
  /** Collapse turn needed to win at least this share of games, null if never reached. */
  percentiles: Record<number, number | null>;
  /** Share of games won if the labyrinth collapses after this many turns. */
  winRate: Record<number, number>;
  /** Share of all treasures collected on the kid seat's turns. */
  kidShare: number;
  /** Treasures the kid seat collects per turn it plays. */
  kidRate: number;
  sacrificesPerGame: number;
  assistsPerGame: number;
};

const PERCENTILES = [25, 50, 75, 90];

export const summarize = (results: readonly GameResult[], limits: readonly number[]): Summary => {
  const needed = results.map((r) => r.turnsNeeded ?? Number.POSITIVE_INFINITY).sort((a, b) => a - b);
  const finished = needed.filter(Number.isFinite);
  const total = results.reduce((sum, r) => sum + r.collectionsBySeat.reduce((a, b) => a + b, 0), 0);
  const kid = results.reduce((sum, r) => sum + (r.collectionsBySeat[0] ?? 0), 0);
  const kidTurns = results.reduce((sum, r) => sum + r.kidTurns, 0);
  const percentile = (p: number): number | null => {
    const value = needed[Math.ceil((p / 100) * needed.length) - 1] ?? Number.POSITIVE_INFINITY;
    return Number.isFinite(value) ? value : null;
  };
  return {
    games: results.length,
    mean: finished.length === results.length ? finished.reduce((a, b) => a + b, 0) / finished.length : null,
    percentiles: Object.fromEntries(PERCENTILES.map((p) => [p, percentile(p)])),
    winRate: Object.fromEntries(limits.map((limit) => [limit, needed.filter((n) => n <= limit).length / needed.length])),
    kidShare: total === 0 ? 0 : kid / total,
    kidRate: kidTurns === 0 ? 0 : kid / kidTurns,
    sacrificesPerGame: results.reduce((sum, r) => sum + r.sacrifices, 0) / results.length,
    assistsPerGame: results.reduce((sum, r) => sum + r.assists, 0) / results.length,
  };
};
