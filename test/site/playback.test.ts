import { describe, expect, test } from "bun:test";
import { bindPlayToggle, createGate } from "../../site/src/playback";

const settled = async (promise: Promise<void>): Promise<boolean> => {
  let done = false;
  void promise.then(() => {
    done = true;
  });
  await Promise.resolve();
  await Promise.resolve();
  return done;
};

describe("gate", () => {
  test("lets a figure run while it is on screen and playing", async () => {
    const gate = createGate();
    gate.setVisible(true);
    expect(await settled(gate.wait())).toBe(true);
  });

  test("holds every waiter while off screen and releases them all when it comes back", async () => {
    const gate = createGate();
    const first = gate.wait();
    const second = gate.wait();
    expect(await settled(first)).toBe(false);
    gate.setVisible(true);
    expect(await settled(first)).toBe(true);
    expect(await settled(second)).toBe(true);
  });

  test("holds while paused, even on screen", async () => {
    const gate = createGate();
    gate.setVisible(true);
    gate.setPlaying(false);
    const waiting = gate.wait();
    expect(await settled(waiting)).toBe(false);
    gate.setPlaying(true);
    expect(await settled(waiting)).toBe(true);
  });
});

describe("play toggle", () => {
  test("pauses and resumes its figure, saying what a press will do", () => {
    const gate = createGate();
    const button = document.createElement("button");
    bindPlayToggle(button, gate);
    expect(button.textContent).toBe("Pause");
    expect(button.dataset.paused).toBe("false");
    button.click();
    expect(gate.playing).toBe(false);
    expect(button.textContent).toBe("Play");
    expect(button.dataset.paused).toBe("true");
    button.click();
    expect(gate.playing).toBe(true);
  });
});
