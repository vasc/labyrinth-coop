import type { SimConfig } from "./simulate";

/** "All" for card reveal: larger than any pile. */
export const ALL = 99;
/** Share of the possible pushes a player works out each turn. */
export const PERFECT_VISION = 1;
export const ADULT_VISION = 0.4;
export const KID_VISIONS = [0.1, 0.2, 0.4];
export const KID_VISION = 0.2;
export const MAX_TURNS = 200;
export const LIMITS = Array.from({ length: 36 }, (_, i) => 10 + 2 * i);

export type SweepEntry = { id: number; config: SimConfig };

/** Every table setup the sweep simulates, in a stable order so shards agree on ids. */
export const sweepConfigs = (): SweepEntry[] => {
  const configs: SimConfig[] = [];
  for (const pile of ["shared", "personal"] as const)
    for (const reveal of [1, 3, ALL])
      for (const players of [2, 3, 4])
        for (const treasures of [8, 12, 16, 24])
          for (const adultVision of [PERFECT_VISION, ADULT_VISION]) {
            const base = { players, treasures, deck: { pile, reveal }, adultVision };
            configs.push({ ...base, composition: "team", kidVision: KID_VISION });
            configs.push({ ...base, composition: "solo", kidVision: KID_VISION });
            for (const kidVision of KID_VISIONS) configs.push({ ...base, composition: "kid", kidVision });
          }
  return configs.map((config, id) => ({ id, config }));
};
