# labyrinth-coop

A simulator for a co-operative variant of the sliding-tile maze game, built to pick house rules for a family table
(2–4 players, one of them a 6-year-old, about 20 minutes a game).

## The co-op variant being tested

The table's intent, in their words: everyone plays together for the same goal, "the point of the game is to get all
the treasures before the labyrinth collapses", and "you have to help the other players get pieces not just get your
own, part of the magic is to have some turns where you sacrifice your self to setup the next player".

Open questions the simulations answer:

- everyone playing from a common treasure pile, or one pile per player
- cards face up or face down
- how many turns until the labyrinth collapses

## Model

### Board and turn (`src/board.ts`, `src/game.ts`)

- 7×7 board, 16 fixed tiles on the even rows/columns (4 start corners, 12 tees with treasures), 34 loose tiles
  (12 straights, 16 corners of which 6 carry treasures, 6 tees all carrying treasures), one spare. 24 treasures.
  The four inner fixed tees are a rotationally symmetric approximation of the printed board (possibly its mirror
  image), which does not change the statistics.
- A turn: push the spare (any rotation) into one of the 12 insertion points; the tile pushed out becomes the spare;
  the push that would undo the previous player's push is not allowed; pawns on the moved line move with it and a pawn
  pushed off lands on the new tile. Then move your pawn any distance along connected paths, or stay.
- You collect a treasure by **ending** your move on it while it is one of your face-up cards. At most one per turn.
- The game is won when every treasure in play is collected. The labyrinth "collapses" after a fixed number of
  turns; the simulation records how many turns each game needed, so any collapse limit can be read off afterwards.
  A turn is one player's turn, not a full round.

### Deck modes

| | shared pile | personal piles |
|---|---|---|
| **face down** | one stack, top card is the team's single target, anyone can collect it | each player has a stack, only its owner collects their top card |
| **3 face up** | the top 3 cards of the stack are targets for anyone | each player's top 3 cards are their targets |
| **face up** | every remaining card is a target for anyone | each player can collect any card in their own pile |

Decision of the model (not a rule from the table): in personal face-down play the top card of every pile is shown to
the whole table. Without that nobody could set anyone up, which is the point of the variant.

Uneven personal deals (e.g. 8 cards over 3 players) start dealing at a random seat.

### Players (`src/policy.ts`)

Each seat has two traits:

- **vision**: the share of the possible pushes (insertion point × spare rotation, 22–48 of them) the player actually
  works out each turn, chosen at random. A worked-out push is read perfectly: the player sees where their pawn can go
  on the resulting board. This models the kid being "ok with the current state of the board" but struggling "with
  seeing what happens after moving one tile".
- **plans**: a planning player who cannot collect this turn picks the push that gives the *next* player the best
  chance to collect on their turn (the sacrifice). It sizes that chance by working out the same share of the next
  player's pushes, then discounts it by how likely the next player is to spot one of the good pushes. Collecting now
  always beats setting up; when collecting, a planner prefers the collecting push that also sets up the next player.
  Otherwise players walk to the cell closest to a treasure they are after.

Planners only plan one turn ahead, for the next seat. Two-turn plans are left out on purpose: the table plays turn by
turn, and the kid "wont be able to do the multi turn steps".

Table make-ups simulated:

- **team**: everyone plans, the kid's turns included (the table talks the kid's turn through).
- **kid**: seat 0 is the kid, who plays their own turns unaided and does not plan; the adults plan around them,
  knowing how much the kid can see.
- **solo**: nobody plans (baseline: how much does the teamwork matter?).

Adult vision is simulated at 40% (a realistic adult) and 100% (a perfect player, an upper bound). Kid vision at 10%,
20% (default) and 40%.

## Findings

1000 simulated games per setup, 720 setups. Full tables are in `results/report.md`. Unless said otherwise the numbers
below are for the realistic table: the kid plays their own turns working out 20% of the pushes, and the adults plan
around the kid working out 40% of the pushes. "p50 / p75 / p90" means the collapse turn that gives a 50% / 75% / 90%
chance of winning.

### 1. Shared pile beats one pile per player

12 treasures, face down:

| | 2 players | 3 players | 4 players |
|---|---|---|---|
| shared pile, p50 / p75 / p90 | 25 / 29 / 34 | 24 / 27 / 30 | 23 / 26 / 28 |
| personal piles, p50 / p75 / p90 | 31 / 40 / 52 | 29 / 38 / 52 | 29 / 38 / 54 |
| shared pile, sacrifices per game | 3.3 | 3.1 | 3.3 |
| personal piles, sacrifices per game | 2.0 | 1.7 | 1.9 |

- With personal piles the game lasts as long as the kid's pile does. The kid collects 0.35 treasures per turn there,
  against 0.47 with a shared pile, where the adults keep setting up whoever is next. The p90 column shows how badly
  that spreads the length: a long tail of games where everyone waits on one pile, so no collapse limit gives both a
  short game and a reliable win.
- With a shared pile the kid naturally gets a fair share or better. At two players the kid's seat collects 58% of
  the treasures, because the one adult keeps setting the kid up.
- A shared pile also has more sacrifice turns, the moment the table wants.

### 2. Face down keeps the teamwork; face up removes it

Shared pile, 12 treasures, 3 players:

| cards | p50 / p75 / p90 | sacrifices per game |
|---|---|---|
| face down (one shared target) | 24 / 27 / 30 | 3.1 |
| top 3 face up | 16 / 18 / 21 | 1.0 |
| all face up | 15 / 16 / 18 | 0.5 |

With several targets on offer, someone can almost always reach one on their own turn: nearly a treasure every turn,
and nobody needs to give up their turn for the next player. Face down means one treasure the whole table is hunting,
which is also the easiest thing for a 6-year-old to keep in their head. When you can't reach it, you push it towards
the next player.

### 3. When the labyrinth collapses

Shared pile, face down. Chance of collecting everything before the collapse:

| treasures | collapse after | 2 players | 3 players | 4 players |
|---|---|---|---|---|
| 8 | 18 turns | 62% | 75% | 76% |
| 8 | 20 turns | 76% | 85% | 90% |
| 12 | 24 turns | 47% | 60% | 65% |
| 12 | 26 turns | 59% | 73% | 79% |
| 12 | 28 turns | 71% | 84% | 90% |

Turns are individual player turns. How many fit in 20 minutes depends on how long a co-op turn with discussion takes
at your table. At 45 s a turn, 20 minutes is about 26 turns; at 60 s, 20 turns. That number is not something the
simulation can know: time one game and pick the row that fits.

The two-player game needs about 2 more turns for the same odds, because the kid takes every other turn.

### 4. Other things the simulations showed

- **Teamwork is what makes the limit beatable.** With the same players and nobody helping anybody, 12 shared
  face-down treasures need a median of 29–30 turns (p90 45–55), against 23–25 with planning adults.
- **Talking the kid's turns through** saves about 4 turns (12 treasures, 3 players: median 20 instead of 24). It is a
  good lever if the game is losing too often, and it costs the kid's ownership of their own turn.
- **The kid's skill matters, but not much.** Kid vision 10% / 20% / 40% gives a median of 25 / 24 / 22 turns
  (12 treasures, 3 players). The adults planning around the kid absorb most of the difference.
- **Sacrifices come from imperfect play.** Perfect adults (100% vision) sacrifice only about 1.5 times a game, because
  they can usually reach the treasure themselves. With realistic adults it is 3+ times a game.

### House rules

Adopted on 2026-11-07, to be adjusted after timing a real game. No real game has been played or timed yet, so the win
rates are simulated and the limits may change.

- One shared pile of **12 treasures, face down**. Turn over the top card. Whoever reaches it collects it, then turn
  over the next card.
- The labyrinth collapses after **26 turns** with 3–4 players (73–79% wins) or **28 turns** with 2 (71%).

The simulation also suggests these. They were not part of the decision, and are the first things to try when adjusting:

- A track with one space per turn makes the countdown visible.
- If 20 minutes runs out before 26 turns do, play **8 treasures with a 20-turn collapse** (76–90% wins).
- If the table loses too often, let everyone talk the kid's turns through.

## Running it

```bash
bun install
```

```bash
bun test
```

```bash
bun run sim 1000 30
```

```bash
bun run report
```

```bash
bun run site
```

```bash
bun run site:serve
```

`bun run site` builds the house-rules page, "Before the Maze Falls", into `site/dist/before-the-maze-falls.html`: one
self-contained file that also gets published as an Artifact. `bun run site:serve` serves it at http://localhost:4173.

## The rules page (`site/`)

- `site/template.html` holds the page's markup and CSS; `site/build.ts` bundles `site/src/main.ts` into it.
- The animated boards run on the simulator's own code: `src/board.ts` for the maze, `src/game.ts` for turns and
  collecting, and `src/policy.ts` for how players choose. Fig. 1 plays the realistic table from the findings above
  (the youngest unaided, the adults planning), so what it shows is what the numbers measure.
- `site/src/maze-view.ts` draws and animates a board; `site/src/demos/` holds the three figures (a live game, one
  turn step by step, and a sacrifice found by searching opening positions); `site/src/chart.ts` draws the "Why these
  rules" chart from the sweep numbers.
- Treasures use [Lucide](https://lucide.dev) icons (ISC licence), one per treasure id 0–23.
- Each figure has a Pause / Play button and only loops while it is on screen (`site/src/playback.ts`). With reduced
  motion set, every figure shows its opening position and nothing loops.
- Tests live in `test/site/` and run under happy-dom (`bunfig.toml` preloads it). The board view tests read the
  board back from the drawn SVG and compare it with the simulator's state after every push.

`bun run sim <games per config> <deadline minutes>` simulates every setup in `src/sweep.ts` on all CPU cores and writes
`results/sweep.json`; `bun run report` turns it into `results/report.md` (every table, every setup).
