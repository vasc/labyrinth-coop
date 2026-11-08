import type { SimConfig } from "./simulate";

/** "All" for card reveal: larger than any pile. */
export const ALL = 99;
/** Share of the possible pushes a player works out each turn. */
export const PERFECT_VISION = 1;
export const ADULT_VISION = 0.4;
export const KID_VISIONS = [0.1, 0.2, 0.4];
export const KID_VISION = 0.2;
export const MAX_TURNS = 200;
/** Collapse turns to read win rates at: every turn from 10 to 80. */
export const LIMITS = Array.from({ length: 71 }, (_, i) => 10 + i);

/**
 * Card modes: face down with and without one look-ahead card, then 3 and all face up. The look-ahead is only tried
 * face down; with several cards face up, the cards after them are already partly in play.
 */
export const DECKS = [
  { reveal: 1, preview: 0 },
  { reveal: 1, preview: 1 },
  { reveal: 3, preview: 0 },
  { reveal: ALL, preview: 0 },
];

export type SweepEntry = { id: number; config: SimConfig };

/** Every table setup the sweep simulates, in a stable order so shards agree on ids. */
export const sweepConfigs = (): SweepEntry[] => {
  const configs: SimConfig[] = [];
  for (const pile of ["shared", "personal"] as const)
    for (const { reveal, preview } of DECKS)
      for (const players of [2, 3, 4])
        for (const treasures of [8, 12, 16, 24])
          for (const adultVision of [PERFECT_VISION, ADULT_VISION]) {
            const base = { players, treasures, deck: { pile, reveal, preview }, adultVision };
            configs.push({ ...base, composition: "team", kidVision: KID_VISION });
            configs.push({ ...base, composition: "solo", kidVision: KID_VISION });
            for (const kidVision of KID_VISIONS) configs.push({ ...base, composition: "kid", kidVision });
          }
  return configs.map((config, id) => ({ id, config }));
};
