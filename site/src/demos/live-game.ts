import { type Board, colOf, rowOf } from "../../../src/board";
import { isOver, newGame, playTurn, visibleTargets } from "../../../src/game";
import { type Decision, decide } from "../../../src/policy";
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

/**
 * Seat 0 is the youngest, playing their own turns; the others plan around them. `before` is how far the player's pawn was from the treasure at the start of the turn, null if the treasure was on
 * the spare tile. "Moves closer" is only said when the turn really ends closer.
 */
export const describeTurn = (decision: Decision, player: number, next: number, treasure: number, before: number | null): Text => {
  if (decision.collects) return (m) => m.live.reach(player, treasure);
  if (decision.sacrifice) return (m) => m.live.push(player, treasure, next);
  if (before !== null && decision.distance < before) return (m) => m.live.closer(player, treasure);
  return (m) => m.live.cannot(player, treasure);
};

/** Grid distance from a pawn to a treasure on the board, null if the treasure is on the spare tile. */
const distanceTo = (board: Board, pawn: number, treasureId: number): number | null => {
  const cell = board.treasure.indexOf(treasureId);
  return cell < 0 ? null : Math.abs(rowOf(cell) - rowOf(pawn)) + Math.abs(colOf(cell) - colOf(pawn));
};

/** Plays one game with the simulator's realistic table: the youngest unaided, the adults planning for the next player. */
export const playLiveGame = async (deps: LiveGameDeps, setup: LiveGameSetup): Promise<LiveGameResult> => {
  const { hud, motion } = deps;
  const rng = mulberry32(setup.seed);
  let state = newGame({ players: setup.players, treasures: setup.treasures, deck: { pile: "shared", reveal: 1 } }, rng);
  const policies = policiesFor("kid", setup.players, KID_VISION, ADULT_VISION);
  const view = new MazeView(deps.svg, state.board, state.pawns, motion);
  let hunted = visibleTargets(state, 0)[0] ?? 0;
  view.setTargets([hunted]);
  hud.show({ target: hunted, found: 0, turn: 0 });
  const first = hunted;
  hud.say((m) => m.live.intro(setup.players, first));
  await motion.sleep(1600);
  let turn = 0;
  while (!isOver(state) && turn < setup.collapseAfter) {
    await deps.waitVisible();
    const player = turn % setup.players;
    const before = distanceTo(state.board, state.pawns[player] ?? 0, hunted);
    const decision = decide(state, player, policies, rng);
    hud.say(describeTurn(decision, player, (player + 1) % setup.players, hunted, before));
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
    const next = visibleTargets(state, 0)[0];
    if (next !== undefined) hunted = next;
    view.setTargets(visibleTargets(state, 0));
    turn++;
    hud.show({ target: next ?? null, found: state.collected, turn });
    view.shake();
    await motion.sleep(900);
  }
  const won = isOver(state);
  const { total, collected } = state;
  const spare = setup.collapseAfter - turn;
  hud.say(won ? (m) => m.live.won(total, spare) : (m) => m.live.lost(total - collected));
  return { found: state.collected, turns: turn, won };
};
