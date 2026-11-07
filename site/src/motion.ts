/** How the boards animate: real frames on the page, instant in tests and for reduced motion. */
export type Motion = {
  tween: (ms: number, frame: (t: number) => void) => Promise<void>;
  sleep: (ms: number) => Promise<void>;
};

const ease = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export const liveMotion: Motion = {
  tween: (ms, frame) =>
    new Promise((resolve) => {
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / ms);
        frame(ease(t));
        if (t < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    }),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

export const instantMotion: Motion = {
  tween: (_ms, frame) => {
    frame(1);
    return Promise.resolve();
  },
  sleep: () => Promise.resolve(),
};

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const prefersReducedMotion = (): boolean => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
