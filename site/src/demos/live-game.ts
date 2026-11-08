import { applyShift } from "../../../src/board";
import { type DeckMode, type GameState, isOver, newGame, playTurn, previewCards, visibleTargets } from "../../../src/game";
import { type Decision, decide, distanceToTreasure } from "../../../src/policy";
import { mulberry32 } from "../../../src/rng";
import { policiesFor } from "../../../src/simulate";
import { ADULT_VISION, KID_VISION } from "../../../src/sweep";
import type { Hud } from "../hud";
import type { Text } from "../i18n/types";
import { MazeView } from "../maze-view";
import type { Motion } from "../motion";

export type LiveGameSetup = { players: number; treasures: number; collapseAfter: number; seed: number };
export type LiveGameDeps = { svg: SVGSVGElement; hud: Hud; motion: Motion; waitVisible: () => Promise<void> };
export type LiveGameResult = { found: number; turns: number; won: boolean };

/** The house rules: the labyrinth collapses after this many turns with 3 or 4 players. */
export const COLLAPSE_AFTER = 23;

/** The house rules: one shared pile, face down, with one look-ahead card. */
export const LIVE_DECK: DeckMode = { pile: "shared", reveal: 1, preview: 1 };

/**
 * What the narrator knows about a turn. Seat 0 is the youngest, playing their own turns; the others plan around them.
 * `headsFor` is the shown treasure the pawn ends nearer to; `before` and `after` are the pawn's distance to that
 * treasure at the start and the end of the turn, null while it is on the spare tile. "Heads for" and "moves closer"
 * are only said when the turn really ends closer to it.
 */
export type TurnScene = {
  player: number;
  next: number;
  target: number;
  ahead: number | null;
  headsFor: "target" | "ahead";
  before: number | null;
  after: number | null;
};

export const describeTurn = (decision: Decision, scene: TurnScene): Text => {
  const { player, next, target, ahead, before, after } = scene;
  if (decision.collects) {
    if (ahead !== null && decision.setup > 0) return (m) => m.live.reachSetsUp(player, target, ahead, next);
    return (m) => m.live.reach(player, target);
  }
  if (decision.sacrifice) return (m) => m.live.push(player, target, next);
  const closer = before !== null && after !== null && after < before;
  if (scene.headsFor === "ahead" && ahead !== null) {
    if (after === 0) return (m) => m.live.waits(player, target, ahead);
    if (closer) return (m) => m.live.heads(player, target, ahead);
  } else if (closer) return (m) => m.live.closer(player, target);
  return (m) => m.live.cannot(player, target);
};

/** Works out the narrator's view of a turn from the position before it and the player's decision. */
const sceneOf = (state: GameState, player: number, decision: Decision, target: number): TurnScene => {
  const ahead = previewCards(state, player)[0] ?? null;
  const next = (player + 1) % state.pawns.length;
  const board = applyShift(state.board, state.pawns, decision.option).board;
  const pawn = state.pawns[player] ?? 0;
  const afterTarget = distanceToTreasure(board, decision.dest, target);
  const afterAhead = ahead === null ? null : distanceToTreasure(board, decision.dest, ahead);
  // The target wins a tie, and so does a treasure on the board over one on the spare tile.
  const towardsAhead = ahead !== null && afterAhead !== null && (afterTarget === null || afterAhead < afterTarget);
  const named = towardsAhead && ahead !== null ? ahead : target;
  return {
    player,
    next,
    target,
    ahead,
    headsFor: towardsAhead ? "ahead" : "target",
    before: distanceToTreasure(state.board, pawn, named),
    after: towardsAhead ? afterAhead : afterTarget,
  };
};

/** Plays one game with the simulator's realistic table: the youngest unaided, the adults planning for the next player. */
export const playLiveGame = async (deps: LiveGameDeps, setup: LiveGameSetup): Promise<LiveGameResult> => {
  const { hud, motion } = deps;
  const rng = mulberry32(setup.seed);
  let state = newGame({ players: setup.players, treasures: setup.treasures, deck: LIVE_DECK }, rng);
  const policies = policiesFor("kid", setup.players, KID_VISION, ADULT_VISION);
  const view = new MazeView(deps.svg, state.board, state.pawns, motion);
  let hunted = visibleTargets(state, 0)[0] ?? 0;
  view.setTargets([hunted]);
  view.setLookAhead(previewCards(state, 0));
  hud.show({ target: hunted, ahead: previewCards(state, 0)[0] ?? null, found: 0, turn: 0 });
  const first = hunted;
  hud.say((m) => m.live.intro(setup.players, first));
  await motion.sleep(1600);
  let turn = 0;
  while (!isOver(state) && turn < setup.collapseAfter) {
    await deps.waitVisible();
    const player = turn % setup.players;
    const decision = decide(state, player, policies, rng);
    hud.say(describeTurn(decision, sceneOf(state, player, decision, hunted)));
    await view.push(decision.option);
    await view.walk(player, decision.dest);
    const result = playTurn(state, player, decision.option, decision.dest);
    state = result.state;
    const collected = result.collected;
    if (collected !== null) {
      await view.markFound(collected);
      const { collected: found, total } = state;
      hud.say((m) => m.live.found(collected, found, total));
    }
    const target = visibleTargets(state, 0)[0];
    if (target !== undefined) hunted = target;
    view.setTargets(visibleTargets(state, 0));
    view.setLookAhead(previewCards(state, 0));
    turn++;
    hud.show({ target: target ?? null, ahead: previewCards(state, 0)[0] ?? null, found: state.collected, turn });
    view.shake();
    await motion.sleep(900);
  }
  const won = isOver(state);
  const { total, collected } = state;
  const spare = setup.collapseAfter - turn;
  hud.say(won ? (m) => m.live.won(total, spare) : (m) => m.live.lost(total - collected));
  return { found: state.collected, turns: turn, won };
};
