/**
 * Decides when a looping figure may take its next step: only while it is on screen and the viewer hasn't paused it.
 * Every waiter is released together, so no step is ever left hanging.
 */
export type Gate = {
  wait: () => Promise<void>;
  setVisible: (visible: boolean) => void;
  setPlaying: (playing: boolean) => void;
  readonly playing: boolean;
};

export const createGate = (): Gate => {
  let visible = false;
  let playing = true;
  let waiters: Array<() => void> = [];
  const release = () => {
    if (!visible || !playing) return;
    const ready = waiters;
    waiters = [];
    for (const resume of ready) resume();
  };
  return {
    wait: () =>
      visible && playing
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            waiters.push(resolve);
          }),
    setVisible: (next) => {
      visible = next;
      release();
    },
    setPlaying: (next) => {
      playing = next;
      release();
    },
    get playing() {
      return playing;
    },
  };
};

/** Opens the gate while `node` is on screen. */
export const observeVisibility = (node: Element, gate: Gate): void => {
  new IntersectionObserver((entries) => gate.setVisible(entries.some((entry) => entry.isIntersecting))).observe(node);
};

/** A Pause / Play button for one figure. The label says what pressing it will do. */
export const bindPlayToggle = (button: HTMLButtonElement, gate: Gate): void => {
  const render = () => {
    button.textContent = gate.playing ? "Pause" : "Play";
    button.dataset.paused = String(!gate.playing);
  };
  button.addEventListener("click", () => {
    gate.setPlaying(!gate.playing);
    render();
  });
  render();
};
