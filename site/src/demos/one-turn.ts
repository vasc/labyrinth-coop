import { type GameState, isOver, newGame, playTurn, visibleTargets } from "../../../src/game";
import { type Policy, decide } from "../../../src/policy";
import { type Rng, mulberry32 } from "../../../src/rng";
import { treasure } from "../icons";
import { MazeView } from "../maze-view";
import type { Motion } from "../motion";

/** The rules list steps: push, walk, collect, marker. */
export type Step = 0 | 1 | 2 | 3;
export type OneTurnDeps = { view: MazeView; motion: Motion; mark: (step: Step, label: string) => void };

const SOLO: Policy[] = [{ plans: false, vision: 1 }];
const COLLAPSE_AFTER = 26;
const TURNS_PER_BOARD = 10;

export const oneTurnGame = (rng: Rng): GameState => newGame({ players: 1, treasures: 6, deck: { pile: "shared", reveal: 1 } }, rng);

/** Plays one turn step by step, telling the rules list which step is happening. */
export const playOneTurn = async (deps: OneTurnDeps, state: GameState, rng: Rng, turn: number): Promise<GameState> => {
  const { view, motion, mark } = deps;
  const decision = decide(state, 0, SOLO, rng);
  mark(0, "1 · Push");
  await view.push(decision.option);
  await motion.sleep(350);
  mark(1, "2 · Walk");
  await view.walk(0, decision.dest);
  await motion.sleep(300);
  const result = playTurn(state, 0, decision.option, decision.dest);
  if (result.collected !== null) {
    mark(2, `3 · Collect the ${treasure(result.collected).name}`);
    await view.markFound(result.collected);
  } else {
    mark(2, "3 · Nothing to collect this turn");
  }
  view.setTargets(visibleTargets(result.state, 0));
  await motion.sleep(700);
  mark(3, `4 · Marker moves: ${COLLAPSE_AFTER - turn} left`);
  view.shake();
  await motion.sleep(1100);
  return result.state;
};

export const runOneTurnLoop = async (svg: SVGSVGElement, deps: Omit<OneTurnDeps, "view">, waitVisible: () => Promise<void>): Promise<never> => {
  for (let seed = 3; ; seed++) {
    const rng = mulberry32(seed);
    let state = oneTurnGame(rng);
    const view = new MazeView(svg, state.board, state.pawns, deps.motion);
    view.setTargets(visibleTargets(state, 0));
    for (let turn = 1; turn <= TURNS_PER_BOARD && !isOver(state); turn++) {
      await waitVisible();
      state = await playOneTurn({ ...deps, view }, state, rng, turn);
    }
  }
};
