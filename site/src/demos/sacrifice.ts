import { legalShiftOptions } from "../../../src/board";
import { type GameState, newGame, playTurn, visibleTargets } from "../../../src/game";
import { type Candidate, PERFECT_PLANNER, evaluate, isSacrifice } from "../../../src/policy";
import { mulberry32 } from "../../../src/rng";
import { treasure } from "../icons";
import { MazeView } from "../maze-view";
import type { Motion } from "../motion";

/** A position where ● cannot collect but can push so that ■ collects on the next turn. */
export type Sacrifice = { seed: number; setup: Candidate; finish: Candidate };

export type SacrificeStep = 1 | 2 | 3 | 4;
export type SacrificeDeps = {
  svg: SVGSVGElement;
  motion: Motion;
  waitVisible: () => Promise<void>;
  say: (step: SacrificeStep, text: string) => void;
};

const PLANNERS = [PERFECT_PLANNER, PERFECT_PLANNER];
/** Only show positions where helping takes a specific push: at most this share of pushes set the next player up. */
const RARE_SETUP = 0.3;

export const sacrificeGame = (seed: number): GameState =>
  newGame({ players: 2, treasures: 12, deck: { pile: "shared", reveal: 1 } }, mulberry32(seed));

/**
 * Searches seeds in [from, to) for an opening position that shows a real sacrifice: ● cannot collect, ■ could not
 * collect on the untouched board either, and ● helps with a push it would not have made playing for itself.
 */
export const findSacrifice = (from: number, to: number): Sacrifice | null => {
  for (let seed = from; seed < to; seed++) {
    const rng = mulberry32(seed);
    const state = sacrificeGame(seed);
    const options = legalShiftOptions(state.board, state.lastShift);
    const own = evaluate(state, 0, PLANNERS, options, rng);
    if (own.some((c) => c.collects)) continue;
    const setups = own.filter((c) => c.setup >= 1 && isSacrifice(c, own));
    const setup = setups[0];
    if (setup === undefined || setups.length > own.length * RARE_SETUP) continue;
    if (evaluate(state, 1, PLANNERS, options, rng).some((c) => c.collects)) continue;
    const after = playTurn(state, 0, setup.option, setup.dest).state;
    const finish = evaluate(after, 1, PLANNERS, legalShiftOptions(after.board, after.lastShift), rng).find((c) => c.collects);
    if (finish !== undefined) return { seed, setup, finish };
  }
  return null;
};

export const playSacrifice = async (deps: SacrificeDeps, sacrifice: Sacrifice): Promise<void> => {
  const { motion, say } = deps;
  let state = sacrificeGame(sacrifice.seed);
  const view = new MazeView(deps.svg, state.board, state.pawns, motion);
  const hunted = visibleTargets(state, 0);
  const name = treasure(hunted[0] ?? 0).name;
  view.setTargets(hunted);
  say(1, `● needs the ${name}, but none of their pushes opens a path to it.`);
  await deps.waitVisible();
  await motion.sleep(2800);
  say(2, `So ● pushes for ■ instead, bringing the ${name} within one push of ■.`);
  await view.push(sacrifice.setup.option);
  await view.walk(0, sacrifice.setup.dest);
  state = playTurn(state, 0, sacrifice.setup.option, sacrifice.setup.dest).state;
  await motion.sleep(1800);
  await deps.waitVisible();
  say(3, "■'s turn. One push opens the path.");
  await view.push(sacrifice.finish.option);
  await motion.sleep(500);
  await view.walk(1, sacrifice.finish.dest);
  const result = playTurn(state, 1, sacrifice.finish.option, sacrifice.finish.dest);
  if (result.collected !== null) await view.markFound(result.collected);
  say(4, `■ collects the ${name}. One treasure for the team.`);
  await motion.sleep(3400);
};
