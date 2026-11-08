export const LANGS = ["en", "pt"] as const;
export type Lang = (typeof LANGS)[number];

const LANG_SET: ReadonlySet<string> = new Set(LANGS);
export const isLang = (value: string | null | undefined): value is Lang => value != null && LANG_SET.has(value);

export const TREASURE_COUNT = 24;

/**
 * Every fixed piece of text on the page. site/template.html marks each element with `data-i18n="<key>"` (its text) or
 * `data-i18n-aria="<key>"` (its aria-label), and holds the English as the page's text before the script runs.
 */
export const STATIC_KEYS = [
  "lang.aria",
  "hero.kicker",
  "hero.title1",
  "hero.title2",
  "hero.lede",
  "hero.players",
  "hero.age",
  "hero.time",
  "hero.pile",
  "hero.legend",
  "hero.kid",
  "hero.adults",
  "hero.target",
  "hero.faded",
  "fig1.aria",
  "fig1.label",
  "fig1.board",
  "fig1.hunting",
  "fig1.found",
  "fig1.left",
  "setup.kicker",
  "setup.title",
  "setup.s1.title",
  "setup.s1.body",
  "setup.s2.title",
  "setup.s2.body",
  "setup.s3.title",
  "setup.s3.body",
  "setup.s4.title",
  "setup.s4.body",
  "setup.s5.title",
  "setup.s5.body",
  "setup.win.label",
  "setup.win.title",
  "setup.win.body",
  "setup.lose.label",
  "setup.lose.title",
  "setup.lose.body",
  "setup.note",
  "turn.kicker",
  "turn.title",
  "turn.s1.must",
  "turn.s1.title",
  "turn.s1.body",
  "turn.s2.must",
  "turn.s2.title",
  "turn.s2.body",
  "turn.s3.must",
  "turn.s3.title",
  "turn.s3.body",
  "turn.s4.must",
  "turn.s4.title",
  "turn.s4.body",
  "fig2.aria",
  "fig2.label",
  "fig2.board",
  "sac.kicker",
  "sac.title",
  "fig3.aria",
  "fig3.label",
  "fig3.board",
  "sac.lede",
  "sac.tip1",
  "sac.tip2",
  "sac.tip3",
  "sac.tip4",
  "sac.note",
  "rules.kicker",
  "rules.title",
  "rules.r1.label",
  "rules.r1.body",
  "rules.r2.label",
  "rules.r2.body",
  "rules.r3.label",
  "rules.r3.body",
  "rules.r4.label",
  "rules.r4.body",
  "rules.r5.label",
  "rules.r5.body",
  "rules.r6.label",
  "rules.r6.body",
  "diff.kicker",
  "diff.title",
  "diff.intro",
  "diff.th.game",
  "diff.th.treasures",
  "diff.th.collapse",
  "diff.th.p2",
  "diff.th.p3",
  "diff.th.p4",
  "diff.quick",
  "diff.standard",
  "diff.standard2",
  "diff.harder",
  "diff.gentle",
  "diff.note",
  "why.kicker",
  "why.title",
  "why.intro",
  "why.chart",
  "why.f1.title",
  "why.f1.body",
  "why.f2.title",
  "why.f2.body",
  "why.f3.title",
  "why.f3.body",
  "why.f4.title",
  "why.f4.body",
  "foot.name.label",
  "foot.name",
  "foot.players.label",
  "foot.players",
  "foot.treasures.label",
  "foot.treasures",
  "foot.collapse.label",
  "foot.collapse",
] as const;
export type StaticKey = (typeof STATIC_KEYS)[number];

const STATIC_SET: ReadonlySet<string> = new Set(STATIC_KEYS);
export const isStaticKey = (value: string): value is StaticKey => STATIC_SET.has(value);

/** The rule variants in the "Why these rules" chart. */
export type ChartRowId = "shared" | "personal" | "faceUp" | "noHelp";

/**
 * Everything the page says, in one language. Sentences that name a treasure or a seat take its id and build the
 * sentence themselves, because the grammar around a name differs by language (Portuguese contracts the article with
 * the treasure's gender and number: "à Coroa", "ao Mapa", "às Moedas"). Treasure ids are the simulator's, 0-23; seats
 * are 0 (the youngest) to 3.
 */
export type Messages = {
  /** The `lang` attribute for the page. */
  htmlLang: string;
  title: string;
  text: Readonly<Record<StaticKey, string>>;
  /** "20 turns": the collapse column of the difficulty table. */
  turns: (n: number) => string;
  treasure: (id: number) => string;
  /** The play toggle's label says what pressing it will do. */
  pause: string;
  play: string;
  hud: { allFound: string; turnOf: (turn: number, total: number) => string };
  live: {
    intro: (players: number, treasure: number) => string;
    reach: (seat: number, treasure: number) => string;
    push: (seat: number, treasure: number, next: number) => string;
    closer: (seat: number, treasure: number) => string;
    cannot: (seat: number, treasure: number) => string;
    found: (treasure: number, found: number, total: number) => string;
    won: (total: number, spare: number) => string;
    lost: (left: number) => string;
  };
  oneTurn: { push: string; walk: string; collect: (treasure: number) => string; nothing: string; marker: (left: number) => string };
  sacrifice: {
    step: (step: number, of: number) => string;
    needs: (treasure: number) => string;
    pushesFor: (treasure: number) => string;
    opens: string;
    collects: (treasure: number) => string;
  };
  chart: {
    rows: Readonly<Record<ChartRowId, string>>;
    ours: string;
    figures: (typical: number, bad: number, sacrifices: number) => string;
    collapseAt: (turn: number) => string;
    unit: string;
  };
};

/** Text that can be said again in another language: kept as a function of the dictionary, not as a string. */
export type Text = (m: Messages) => string;

/** The entry at `index`, or an error naming what was missing. */
export const entry = <T>(list: readonly T[], index: number, what: string): T => {
  const found = list[index];
  if (found === undefined) throw new Error(`no ${what} ${index}`);
  return found;
};
