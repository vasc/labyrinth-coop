import { describe, expect, test } from "bun:test";
import { CHART_ROWS, renderChart } from "../../site/src/chart";

describe("renderChart", () => {
  const root = document.createElement("div");
  renderChart(root, CHART_ROWS, { max: 60, collapseAt: 26 });
  const rows = [...root.querySelectorAll(".bar-row")];

  test("draws one row per rule variant, ours highlighted", () => {
    expect(rows.length).toBe(CHART_ROWS.length);
    expect(root.querySelectorAll(".bar-row.ours").length).toBe(1);
  });

  test("scales the typical game and the bad-game whisker on the same axis", () => {
    const first = CHART_ROWS[0];
    const bar = rows[0]?.querySelector(".bar");
    const whisker = rows[0]?.querySelector(".whisker");
    if (!(bar instanceof HTMLElement) || !(whisker instanceof HTMLElement)) throw new Error("bar or whisker missing");
    expect(bar.style.width).toBe(`${((first?.typical ?? 0) / 60) * 100}%`);
    expect(whisker.style.left).toBe(`${((first?.typical ?? 0) / 60) * 100}%`);
  });

  test("marks the collapse turn on the axis", () => {
    const line = root.querySelector(".collapse-line");
    if (!(line instanceof HTMLElement)) throw new Error("collapse line missing");
    expect(line.style.left).toBe(`${(26 / 60) * 100}%`);
    expect(line.textContent).toContain("26");
  });

  test("labels the axis every 10 turns", () => {
    expect([...root.querySelectorAll(".axis span")].map((s) => s.textContent)).toEqual(["0", "10", "20", "30", "40", "50", "60"]);
  });
});
