import { newGame, previewCards, visibleTargets } from "../../src/game";
import { mulberry32 } from "../../src/rng";
import { CHART_ROWS, renderChart } from "./chart";
import { COLLAPSE_AFTER, LIVE_DECK, playLiveGame } from "./demos/live-game";
import { type Step, oneTurnGame, runOneTurnLoop } from "./demos/one-turn";
import { type SacrificeStep, findSacrifice, playSacrifice, sacrificeGame } from "./demos/sacrifice";
import { Hud } from "./hud";
import { applyStatic } from "./i18n/apply";
import { chooseLang, readStoredLang, storeLang } from "./i18n/choose";
import { createI18n, liveText } from "./i18n/i18n";
import type { Lang, Text } from "./i18n/types";
import { bindLanguageSwitcher } from "./lang-switcher";
import { MazeView } from "./maze-view";
import { instantMotion, liveMotion, prefersReducedMotion } from "./motion";
import { readPage } from "./page";
import { type Gate, bindPlayToggle, createGate, observeVisibility } from "./playback";

const LIVE = { players: 3, treasures: 12, collapseAfter: COLLAPSE_AFTER };
const PAUSE_BETWEEN_GAMES = 4500;
const SACRIFICE_STEPS = 4;

const page = readPage(document);
const still = prefersReducedMotion();
const motion = still ? instantMotion : liveMotion;

// Language: the address, then the viewer's last choice, then the browser's preference.
const i18n = createI18n(
  chooseLang({
    query: new URLSearchParams(window.location.search).get("lang"),
    stored: readStoredLang(),
    preferred: navigator.languages,
  }),
);
/** Keeps ?lang= in the address in step with the page, so a copied link opens in the same language. */
const showInAddress = (lang: Lang) => {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("lang", lang);
    window.history.replaceState(null, "", url);
  } catch {
    // Some hosts (a sandboxed frame) don't allow it; the page works the same without it.
  }
};
const drawChart = () => renderChart(page.chart, CHART_ROWS, { max: 60, collapseAt: LIVE.collapseAfter }, i18n.m);
applyStatic(document, i18n.m);
drawChart();
i18n.onChange(() => {
  applyStatic(document, i18n.m);
  drawChart();
});
bindLanguageSwitcher(page.langButtons, i18n, (lang) => {
  storeLang(lang);
  showInAddress(lang);
});

/** Each figure loops only while on screen and not paused by its own button. */
const gateFor = (svg: SVGSVGElement, toggle: HTMLButtonElement): Gate => {
  const gate = createGate();
  observeVisibility(svg, gate);
  bindPlayToggle(toggle, gate, i18n);
  return gate;
};

// With reduced motion every figure shows its opening position and nothing loops.
if (still) for (const toggle of page.toggles) toggle.hidden = true;

// Fig. 1: the live game.
const hud = new Hud(page.hero.hud, LIVE, i18n);
if (still) {
  const state = newGame({ players: LIVE.players, treasures: LIVE.treasures, deck: LIVE_DECK }, mulberry32(11));
  const target = visibleTargets(state, 0)[0] ?? 0;
  const view = new MazeView(page.hero.svg, state.board, state.pawns, motion);
  view.setTargets([target]);
  view.setLookAhead(previewCards(state, 0));
  hud.show({ target, ahead: previewCards(state, 0)[0] ?? null, found: 0, turn: 0 });
  hud.say((m) => m.live.intro(LIVE.players, target));
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
const turnStatus = liveText(page.turn.status, i18n);
const mark = (step: Step, label: Text) => {
  page.steps.forEach((li, i) => li.classList.toggle("active", i === step));
  turnStatus(label);
};
// Set before the figure first scrolls into view, so the label is in the page's language from the start.
turnStatus((m) => m.oneTurn.push);
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
  const stepText = liveText(page.sacrifice.step, i18n);
  const caption = liveText(page.sacrifice.caption, i18n);
  const say = (step: SacrificeStep, text: Text) => {
    stepText((m) => m.sacrifice.step(step, SACRIFICE_STEPS));
    caption(text);
  };
  if (still) {
    const state = sacrificeGame(sacrifice.seed);
    const hunted = visibleTargets(state, 0);
    const target = hunted[0] ?? 0;
    new MazeView(page.sacrifice.svg, state.board, state.pawns, motion).setTargets(hunted);
    say(1, (m) => m.sacrifice.needs(target));
  } else {
    const gate = gateFor(page.sacrifice.svg, page.sacrifice.toggle);
    void (async () => {
      for (;;) await playSacrifice({ svg: page.sacrifice.svg, motion, waitVisible: gate.wait, say }, sacrifice);
    })();
  }
}
