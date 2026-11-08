import type { Composition } from "./simulate";
import { ADULT_VISION, ALL, KID_VISION, KID_VISIONS, PERFECT_VISION } from "./sweep";

export type Row = {
  games: number;
  players: number;
  treasures: number;
  pile: "shared" | "personal";
  reveal: number;
  preview: number;
  composition: Composition;
  kidVision: number;
  adultVision: number;
  p50: number | null;
  p75: number | null;
  p90: number | null;
  winRate: Record<number, number>;
  kidShare: number;
  kidRate: number;
  sacrificesPerGame: number;
  assistsPerGame: number;
  idleTurnsPerGame: number;
  collectSetupsPerGame: number;
};

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

const num = (v: unknown, what: string): number => {
  if (typeof v !== "number") throw new Error(`${what} is not a number`);
  return v;
};

const numOrNull = (v: unknown, what: string): number | null => (v === null ? null : num(v, what));

const record = (v: unknown, what: string): Record<string, unknown> => {
  if (!isRecord(v)) throw new Error(`${what} is not an object`);
  return v;
};

const composition = (v: unknown): Composition => {
  if (v === "team" || v === "kid" || v === "solo") return v;
  throw new Error(`unknown composition ${String(v)}`);
};

const pile = (v: unknown): "shared" | "personal" => {
  if (v === "shared" || v === "personal") return v;
  throw new Error(`unknown pile ${String(v)}`);
};

/** Reads the sweep output written by the workers, checking its shape instead of trusting it. */
export const parseRows = (json: unknown): Row[] => {
  if (!Array.isArray(json)) throw new Error("sweep output is not a list");
  return json.map((raw, i) => {
    const row = record(raw, `row ${i}`);
    const config = record(row.config, "config");
    const deck = record(config.deck, "deck");
    const summary = record(row.summary, "summary");
    const percentiles = record(summary.percentiles, "percentiles");
    const winRate = record(summary.winRate, "winRate");
    return {
      games: num(summary.games, "games"),
      players: num(config.players, "players"),
      treasures: num(config.treasures, "treasures"),
      pile: pile(deck.pile),
      reveal: num(deck.reveal, "reveal"),
      preview: num(deck.preview, "preview"),
      composition: composition(config.composition),
      kidVision: num(config.kidVision, "kidVision"),
      adultVision: num(config.adultVision, "adultVision"),
      p50: numOrNull(percentiles["50"], "p50"),
      p75: numOrNull(percentiles["75"], "p75"),
      p90: numOrNull(percentiles["90"], "p90"),
      winRate: Object.fromEntries(Object.entries(winRate).map(([k, v]) => [Number(k), num(v, "winRate")])),
      kidShare: num(summary.kidShare, "kidShare"),
      kidRate: num(summary.kidRate, "kidRate"),
      sacrificesPerGame: num(summary.sacrificesPerGame, "sacrificesPerGame"),
      assistsPerGame: num(summary.assistsPerGame, "assistsPerGame"),
      idleTurnsPerGame: num(summary.idleTurnsPerGame, "idleTurnsPerGame"),
      collectSetupsPerGame: num(summary.collectSetupsPerGame, "collectSetupsPerGame"),
    };
  });
};

export const revealLabel = (reveal: number, preview: number): string => {
  const cards = reveal === 1 ? "face down" : reveal >= ALL ? "face up" : `${reveal} face up`;
  if (preview === 0) return cards;
  return `${cards} + ${preview === 1 ? "" : `${preview} `}look-ahead`;
};

export const visionLabel = (vision: number): string => (vision >= PERFECT_VISION ? "all" : `${Math.round(vision * 100)}% of the`);

const turns = (n: number | null): string => (n === null ? "—" : `${n}`);

/** One table per table make-up: rows are deck modes and treasure counts, columns player counts. */
export const turnsTable = (rows: readonly Row[], match: (r: Row) => boolean): string => {
  const picked = rows.filter(match);
  const lines = ["| pile | cards | treasures | 2 players | 3 players | 4 players |", "|---|---|---|---|---|---|"];
  const groups = new Map<string, Row[]>();
  for (const r of picked) {
    const key = `${r.pile}|${r.reveal}|${r.preview}|${r.treasures}`;
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  for (const group of groups.values()) {
    const first = group[0];
    if (first === undefined) continue;
    const cell = (players: number): string => {
      const r = group.find((g) => g.players === players);
      return r === undefined ? "" : `${turns(r.p50)} / ${turns(r.p75)} / ${turns(r.p90)}`;
    };
    lines.push(`| ${first.pile} | ${revealLabel(first.reveal, first.preview)} | ${first.treasures} | ${cell(2)} | ${cell(3)} | ${cell(4)} |`);
  }
  return lines.join("\n");
};

const pct = (n: number): string => `${Math.round(n * 100)}%`;

/** How much the kid seat gets to do and how often adults give up their turn for the next player. */
export const teamworkTable = (rows: readonly Row[], match: (r: Row) => boolean): string => {
  const lines = [
    "| pile | cards | treasures | players | kid seat's share of treasures | sacrifices / game | assists / game | collect-and-setups / game | idle turns / game |",
    "|---|---|---|---|---|---|---|---|---|",
  ];
  for (const r of rows.filter(match)) {
    lines.push(
      `| ${r.pile} | ${revealLabel(r.reveal, r.preview)} | ${r.treasures} | ${r.players} | ${pct(r.kidShare)} (fair: ${pct(1 / r.players)}) | ${r.sacrificesPerGame.toFixed(1)} | ${r.assistsPerGame.toFixed(1)} | ${r.collectSetupsPerGame.toFixed(1)} | ${r.idleTurnsPerGame.toFixed(1)} |`,
    );
  }
  return lines.join("\n");
};

export const fullReport = (rows: readonly Row[]): string => {
  const games = [...new Set(rows.map((r) => r.games))].join(", ");
  const sections: string[] = [
    "# Sweep results",
    "",
    "Each cell is the collapse turn that gives a 50% / 75% / 90% chance of collecting every treasure in time",
    "(— means the table did not get there within the 200-turn cap). A turn is one player's turn, not a round.",
    `${games} games per cell. Vision is the share of the possible pushes a player works out each turn.`,
  ];
  const compositions: ReadonlyArray<{ title: string; composition: Composition; kidVisions: readonly number[] }> = [
    { title: "whole table talks every turn through (kid's turns included)", composition: "team", kidVisions: [KID_VISION] },
    { title: "kid plays their own turns, adults plan around them", composition: "kid", kidVisions: KID_VISIONS },
    { title: "nobody helps anybody (baseline)", composition: "solo", kidVisions: [KID_VISION] },
  ];
  for (const adultVision of [ADULT_VISION, PERFECT_VISION]) {
    for (const c of compositions) {
      for (const kidVision of c.kidVisions) {
        const kid = c.composition === "kid" ? `, kid works out ${visionLabel(kidVision)} pushes` : "";
        sections.push("", `## ${c.title} — adults work out ${visionLabel(adultVision)} pushes${kid}`, "");
        sections.push(turnsTable(rows, (r) => r.composition === c.composition && r.adultVision === adultVision && r.kidVision === kidVision));
      }
    }
  }
  sections.push("", `## Teamwork — kid plays their own turns (${visionLabel(KID_VISION)} pushes), adults ${visionLabel(ADULT_VISION)} pushes`, "");
  sections.push(teamworkTable(rows, (r) => r.composition === "kid" && r.adultVision === ADULT_VISION && r.kidVision === KID_VISION));
  return sections.join("\n");
};
