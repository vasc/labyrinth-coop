import { newGame, visibleTargets } from "../../src/game";
import { mulberry32 } from "../../src/rng";
import { CHART_ROWS, renderChart } from "./chart";
import { playLiveGame } from "./demos/live-game";
import { type Step, oneTurnGame, runOneTurnLoop } from "./demos/one-turn";
import { findSacrifice, playSacrifice, sacrificeGame } from "./demos/sacrifice";
import { Hud } from "./hud";
import { MazeView } from "./maze-view";
import { instantMotion, liveMotion, prefersReducedMotion } from "./motion";
import { readPage } from "./page";
import { type Gate, bindPlayToggle, createGate, observeVisibility } from "./playback";

const LIVE = { players: 3, treasures: 12, collapseAfter: 26 };
const PAUSE_BETWEEN_GAMES = 4500;

const page = readPage(document);
const still = prefersReducedMotion();
const motion = still ? instantMotion : liveMotion;

renderChart(page.chart, CHART_ROWS, { max: 60, collapseAt: LIVE.collapseAfter });

/** Each figure loops only while on screen and not paused by its own button. */
const gateFor = (svg: SVGSVGElement, toggle: HTMLButtonElement): Gate => {
  const gate = createGate();
  observeVisibility(svg, gate);
  bindPlayToggle(toggle, gate);
  return gate;
};

// With reduced motion every figure shows its opening position and nothing loops.
if (still) for (const toggle of page.toggles) toggle.hidden = true;

// Fig. 1: the live game.
const hud = new Hud(page.hero.hud, LIVE);
if (still) {
  const state = newGame({ players: LIVE.players, treasures: LIVE.treasures, deck: { pile: "shared", reveal: 1 } }, mulberry32(11));
  new MazeView(page.hero.svg, state.board, state.pawns, motion).setTargets(visibleTargets(state, 0));
  hud.show({ target: visibleTargets(state, 0)[0] ?? null, found: 0, turn: 0 });
} else {
  const gate = gateFor(page.hero.svg, page.hero.toggle);
  void (async () => {
    for (let seed = 11; ; seed++) {
      await playLiveGame({ svg: page.hero.svg, hud, motion, waitVisible: gate.wait }, { ...LIVE, seed });
      await motion.sleep(PAUSE_BETWEEN_GAMES);
    }
  })();
}

// Fig. 2: one turn, step by step, lighting up the rules list.
const mark = (step: Step, label: string) => {
  page.steps.forEach((li, i) => li.classList.toggle("active", i === step));
  page.turn.status.textContent = label;
};
if (still) {
  const state = oneTurnGame(mulberry32(3));
  new MazeView(page.turn.svg, state.board, state.pawns, motion).setTargets(visibleTargets(state, 0));
} else {
  const gate = gateFor(page.turn.svg, page.turn.toggle);
  void runOneTurnLoop(page.turn.svg, { motion, mark }, gate.wait);
}

// Fig. 3: the sacrifice.
const sacrifice = findSacrifice(1, 4000);
if (sacrifice !== null) {
  const say = (step: number, text: string) => {
    page.sacrifice.step.textContent = `${step} of 4`;
    page.sacrifice.caption.textContent = text;
  };
  if (still) {
    const state = sacrificeGame(sacrifice.seed);
    new MazeView(page.sacrifice.svg, state.board, state.pawns, motion).setTargets(visibleTargets(state, 0));
  } else {
    const gate = gateFor(page.sacrifice.svg, page.sacrifice.toggle);
    void (async () => {
      for (;;) await playSacrifice({ svg: page.sacrifice.svg, motion, waitVisible: gate.wait, say }, sacrifice);
    })();
  }
}
