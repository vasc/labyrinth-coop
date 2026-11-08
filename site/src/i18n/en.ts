import { type Messages, entry } from "./types";

const TREASURES = [
  "Crown",
  "Gem",
  "Key",
  "Sword",
  "Shield",
  "Skull",
  "Ghost",
  "Beetle",
  "Bird",
  "Rat",
  "Turtle",
  "Snail",
  "Book",
  "Map",
  "Scroll",
  "Hourglass",
  "Bell",
  "Trophy",
  "Feather",
  "Shell",
  "Compass",
  "Coins",
  "Wand",
  "Telescope",
];
const SEATS = ["● The youngest", "■ Player 2", "▲ Player 3", "◆ Player 4"];

/** Treasures named in the plural, which take "them" and "come". */
const PLURAL: ReadonlySet<number> = new Set([TREASURES.indexOf("Coins")]);

const name = (id: number) => entry(TREASURES, id, "treasure");
/** "it" or "them" */
const it = (id: number) => (PLURAL.has(id) ? "them" : "it");
/** "comes" or "come" */
const comes = (id: number) => (PLURAL.has(id) ? "come" : "comes");
const seat = (id: number) => entry(SEATS, id, "seat");
const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const TITLE = "Before the Maze Falls";

export const en: Messages = {
  htmlLang: "en",
  title: TITLE,
  turns: (n) => count(n, "turn", "turns"),
  treasure: name,
  pause: "Pause",
  play: "Play",
  hud: { allFound: "All found", none: "None", turnOf: (turn, total) => `Turn ${turn} of ${total}` },
  live: {
    intro: (players, t) => `${players} players, one shared target: the ${name(t)}.`,
    reach: (s, t) => `${seat(s)} can reach the ${name(t)}.`,
    push: (s, t, next) => `${seat(s)} can't reach the ${name(t)}, so pushes ${it(t)} toward ${seat(next)}.`,
    closer: (s, t) => `${seat(s)} can't reach the ${name(t)} yet, so moves closer.`,
    cannot: (s, t) => `${seat(s)} can't reach the ${name(t)} this turn.`,
    reachSetsUp: (s, t, ahead, next) => `${seat(s)} reaches the ${name(t)} and leaves ${seat(next)} a way to the ${name(ahead)}.`,
    heads: (s, t, ahead) => `${seat(s)} can't reach the ${name(t)}, so heads for the ${name(ahead)}, which ${comes(ahead)} next.`,
    waits: (s, t, ahead) => `${seat(s)} can't reach the ${name(t)}, so waits on the ${name(ahead)}, which ${comes(ahead)} next.`,
    found: (t, found, total) => `Found the ${name(t)}. ${found} of ${total}.`,
    won: (total, spare) =>
      spare === 0
        ? `All ${total} treasures found on the very last turn. Everyone wins.`
        : `All ${total} treasures found with ${count(spare, "turn", "turns")} to spare. Everyone wins.`,
    lost: (left) => `The maze collapsed with ${count(left, "treasure", "treasures")} left.`,
  },
  oneTurn: {
    push: "1 · Push",
    walk: "2 · Walk",
    collect: (t) => `3 · Collect the ${name(t)}`,
    nothing: "3 · Nothing to collect this turn",
    marker: (left) => `4 · Marker moves: ${left} left`,
  },
  sacrifice: {
    step: (step, of) => `${step} of ${of}`,
    needs: (t) => `● needs the ${name(t)}, but none of their pushes opens a path to it.`,
    pushesFor: (t) => `So ● pushes for ■ instead, bringing the ${name(t)} within one push of ■.`,
    opens: "■'s turn. One push opens the path.",
    collects: (t) => `■ collects the ${name(t)}. One treasure for the team.`,
  },
  chart: {
    rows: {
      lookAhead: "One shared pile, face down, one look-ahead card",
      shared: "One shared pile, face down, no look-ahead",
      personal: "One pile each, face down",
      faceUp: "Shared pile, all cards face up",
      noHelp: "These rules, but nobody helps",
    },
    ours: "these rules",
    figures: (typical, bad, sacrifices) => `typical ${typical} · bad ${bad} · ${sacrifices.toFixed(1)} sacrifices/game`,
    collapseAt: (turn) => `Collapse at ${turn}`,
    unit: "Turns needed",
  },
  text: {
    "lang.aria": "Language",
    "hero.kicker": "Co-op house rules for the sliding-maze board game",
    "hero.title1": "Before the Maze",
    "hero.title2": "Falls",
    "hero.lede":
      "Everyone plays on the same side. Find all 12 treasures before the labyrinth collapses. When you can't reach the treasure yourself, push the maze so the next player can, or get ready for the one after it.",
    "hero.players": "2–4 players",
    "hero.age": "Age 6 and up",
    "hero.time": "About 20 min",
    "hero.pile": "One shared pile",
    "hero.legend": "Pawns on the board",
    "hero.kid": "● The youngest, playing their own turns",
    "hero.adults": "■ ▲ Grown-ups, setting up the next player",
    "hero.target": "Black disc, dashed ring: the treasure everyone is hunting",
    "hero.ahead": "Dotted ring: the look-ahead, next in line",
    "hero.faded": "Faded: already found",
    "fig1.aria": "A three-player game playing itself",
    "fig1.label": "Fig. 1 · Live game, 3 players",
    "fig1.board": "Seven by seven maze board with three pawns",
    "fig1.hunting": "Hunting",
    "fig1.next": "Next",
    "fig1.found": "Found",
    "fig1.left": "Turns left",
    "setup.kicker": "Before you start",
    "setup.title": "Setup",
    "setup.s1.title": "Build the maze",
    "setup.s1.body": "Shuffle the loose tiles onto the board as usual. One tile is left over: that's the spare.",
    "setup.s2.title": "Make one pile of 12",
    "setup.s2.body": "Shuffle the treasure cards and deal 12 face down into a single pile. The rest go back in the box.",
    "setup.s3.title": "Turn over two cards",
    "setup.s3.body":
      "The top card is the target: the treasure the whole table is hunting. Turn the next card face up beside it: that's the look-ahead, the treasure that comes after.",
    "setup.s4.title": "Pawns on the corners",
    "setup.s4.body": "One pawn per player on the start corners. The youngest player goes first.",
    "setup.s5.title": "Lay out the collapse track",
    "setup.s5.body":
      "23 spaces for 3 or 4 players, 26 for 2. A row of coins or tally marks on paper works. The marker starts at the beginning.",
    "setup.win.label": "You win",
    "setup.win.title": "All 12 found",
    "setup.win.body": "The moment the 12th treasure is collected, everyone wins together.",
    "setup.lose.label": "You lose",
    "setup.lose.title": "The maze falls",
    "setup.lose.body": "If the marker reaches the last space and treasures are still left, the labyrinth collapses.",
    "setup.note":
      "Only 12 of the 24 treasures are used, so the game fits in about 20 minutes. Each treasure takes about two turns: one to find it, and often one to set it up.",
    "turn.kicker": "Taking turns around the table",
    "turn.title": "A turn",
    "turn.s1.must": "Must",
    "turn.s1.title": "Push",
    "turn.s1.body":
      "Always first, even if your path is already open. Slide the spare tile in at any arrow, turned any way you like. The tile pushed out the far side becomes the new spare. You can't push it straight back where the last player pushed it out.",
    "turn.s2.must": "May",
    "turn.s2.title": "Walk",
    "turn.s2.body": "Move your pawn any distance along open paths, or stay put. Pawns don't block each other.",
    "turn.s3.must": "If you can",
    "turn.s3.title": "Collect",
    "turn.s3.body":
      "End your move on the target and it's found. Anyone can collect it. Set the card aside: the look-ahead becomes the new target, and you turn over a new look-ahead.",
    "turn.s4.must": "Always",
    "turn.s4.title": "The maze shakes",
    "turn.s4.body": "Move the collapse marker one space, whether or not anything was found.",
    "fig2.aria": "One turn, step by step",
    "fig2.label": "Fig. 2 · One turn",
    "fig2.board": "Maze board showing a push, a walk and a collect",
    "sac.kicker": "The heart of the co-op",
    "sac.title": "Can't reach it? Set up the next player",
    "fig3.aria": "One player sets up the next",
    "fig3.label": "Fig. 3 · The sacrifice",
    "fig3.board": "Maze board where one player pushes so that the next player can collect",
    "sac.lede":
      "Your push stays on the board for the next player. If no push gets you to the treasure, use your turn to bring it to them.",
    "sac.tip1": "Look at the next player's pawn first. Which row or column could carry the treasure onto their path?",
    "sac.tip2":
      "Pushing the treasure to the edge is good too. If it ends up on the spare tile, the next player can push it in right next to themselves.",
    "sac.tip3": "Talk it through out loud. Everyone can see the target, so the whole table can help find the push.",
    "sac.tip4":
      "Set the youngest player up with easy wins: a treasure already on their path, so they only need to see the board as it is.",
    "sac.tip5":
      "Can you reach the target this turn? Look for the push that keeps your own path open and also opens a path to the look-ahead treasure for the next player. That's the best kind of turn.",
    "sac.note":
      "In the simulations, a good table makes about 2 of these sacrifices per game, plus about 5 turns where a player collects and sets up the next player with the same push. They're what makes the collapse beatable.",
    "rules.kicker": "Small rules",
    "rules.title": "Good to know",
    "rules.r1.label": "Always push",
    "rules.r1.body":
      "Pushing is not optional, even if your path is already open and the push might break it.",
    "rules.r2.label": "No undo",
    "rules.r2.body": "You can't push the spare back in where the previous player just pushed it out.",
    "rules.r3.label": "Off the edge",
    "rules.r3.body": "A pawn pushed off the board comes back on the new tile at the other end of that row.",
    "rules.r4.label": "Treasure on the spare",
    "rules.r4.body": "It can't be collected until someone pushes it back into the maze.",
    "rules.r5.label": "Shared squares",
    "rules.r5.body": "Any number of pawns can stand on the same tile.",
    "rules.r6.label": "One per turn",
    "rules.r6.body":
      "Only the target counts, not the look-ahead, and only if you end your move on it. At most one treasure a turn.",
    "rules.r7.label": "Look-ahead",
    "rules.r7.body":
      "You can stand on the look-ahead treasure, but it doesn't count until it becomes the target.",
    "rules.r8.label": "Camping",
    "rules.r8.body":
      "If the treasure you're standing on becomes the target, it isn't found straight away. Collect it on your next turn: push first, then end your move on it. Your pawn rides along with its tile, so you only lose the treasure if your push shoves that tile off the board.",
    "diff.kicker": "Tuning the collapse",
    "diff.title": "How hard should it be?",
    "diff.intro":
      "Chance of finding every treasure before the collapse, playing with the look-ahead card. The youngest plays their own turns; the other players help as described above.",
    "diff.th.game": "Game",
    "diff.th.treasures": "Treasures",
    "diff.th.collapse": "Collapse after",
    "diff.th.p2": "2 players",
    "diff.th.p3": "3 players",
    "diff.th.p4": "4 players",
    "diff.quick": "Quick",
    "diff.standard": "Standard",
    "diff.standard2": "Standard, 2 players",
    "diff.harder": "Harder",
    "diff.gentle": "Gentle: plan every turn together",
    "diff.note":
      "A turn is one player's turn, not a full round. At about 50 seconds a turn, 23 turns is about 20 minutes. Time your first game: if turns run longer, play Quick.",
    "why.kicker": "1000 simulated games per setup, 960 setups",
    "why.title": "Why these rules",
    "why.intro":
      "Turns needed to find 12 treasures with 3 players. The bar is a typical game, the whisker runs out to a bad one (1 game in 10 takes longer).",
    "why.chart": "Turns needed by rule variant",
    "why.f1.title": "One shared pile.",
    "why.f1.body":
      "With a pile each, the game lasts as long as the slowest pile, usually the youngest player's. Bad games run past 50 turns.",
    "why.f2.title": "Face down.",
    "why.f2.body":
      "With all cards face up there's almost always something reachable, so nobody needs to help anybody. One shared target keeps the table working together, and it's the easiest thing for a 6-year-old to keep in mind.",
    "why.f3.title": "Helping matters.",
    "why.f3.body":
      "The same table playing only for themselves needs a median of 28 turns instead of 21, and loses most games at a 23-turn collapse.",
    "why.f4.title": "Everyone gets moments.",
    "why.f4.body":
      "In a two-player game the youngest collects 59% of the treasures, because the other player keeps setting them up.",
    "why.f5.title": "One card of look-ahead.",
    "why.f5.body":
      "Our first real game dragged without it. With the next treasure on show, a turn where you can't reach the target still has a use: head for the next one, wait on it, or collect and set up the next player with the same push. Games run 2 to 3 turns shorter, so the collapse comes 3 turns sooner for about the same odds (2 sooner with 2 players).",
    "foot.name.label": "Title",
    "foot.name": TITLE,
    "foot.players.label": "Players",
    "foot.players": "2–4, age 6+",
    "foot.treasures.label": "Treasures",
    "foot.treasures": "12, one pile, face down, one look-ahead",
    "foot.collapse.label": "Collapse",
    "foot.collapse": "23 turns (26 for 2)",
  },
};
