export type Rng = () => number;

/** Small seeded PRNG so every simulated game is reproducible from its seed. */
export const mulberry32 = (seed: number): Rng => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const randInt = (rng: Rng, n: number): number => Math.floor(rng() * n);

export const shuffle = <T>(items: readonly T[], rng: Rng): T[] => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    const a = out[i];
    const b = out[j];
    if (a === undefined || b === undefined) continue;
    out[i] = b;
    out[j] = a;
  }
  return out;
};

export const pick = <T>(items: readonly T[], rng: Rng): T => {
  const item = items[randInt(rng, items.length)];
  if (item === undefined) throw new Error("pick from empty list");
  return item;
};
