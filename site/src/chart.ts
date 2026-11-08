import type { ChartRowId, Messages } from "./i18n/types";

export type ChartRow = {
  /** Its label comes from the dictionary. */
  id: ChartRowId;
  /** Median turns to find all 12 treasures. */
  typical: number;
  /** Turns that 9 games in 10 finish within. */
  bad: number;
  sacrifices: number;
  ours?: boolean;
};

/**
 * From the simulator sweep (results/report.md): 12 treasures, 3 players, the youngest playing their own turns
 * at 20% vision, adults planning at 40% vision. 1000 games per row.
 */
export const CHART_ROWS: readonly ChartRow[] = [
  { id: "shared", typical: 24, bad: 30, sacrifices: 3.1, ours: true },
  { id: "personal", typical: 29, bad: 52, sacrifices: 1.7 },
  { id: "faceUp", typical: 15, bad: 18, sacrifices: 0.5 },
  { id: "noHelp", typical: 29, bad: 46, sacrifices: 0 },
];

const div = (className: string, parent: HTMLElement): HTMLDivElement => {
  const el = document.createElement("div");
  el.className = className;
  parent.appendChild(el);
  return el;
};

/** Horizontal bars on one turn axis: bar to the median, whisker out to the 90th percentile. Labelled in `m`'s language. */
export const renderChart = (
  root: HTMLElement,
  rows: readonly ChartRow[],
  scale: { max: number; collapseAt: number },
  m: Messages,
): void => {
  const pct = (turns: number) => `${(turns / scale.max) * 100}%`;
  root.replaceChildren();
  const body = div("chart-body", root);
  for (const row of rows) {
    const rowEl = div(row.ours === true ? "bar-row ours" : "bar-row", body);
    const label = div("bar-label", rowEl);
    const name = document.createElement("div");
    name.textContent = m.chart.rows[row.id];
    if (row.ours === true) {
      const note = document.createElement("strong");
      note.textContent = ` (${m.chart.ours})`;
      name.appendChild(note);
    }
    const figures = document.createElement("span");
    figures.textContent = m.chart.figures(row.typical, row.bad, row.sacrifices);
    label.append(name, figures);
    const track = div("bar-track", rowEl);
    div("bar", track).style.width = pct(row.typical);
    const whisker = div("whisker", track);
    whisker.style.left = pct(row.typical);
    whisker.style.width = pct(row.bad - row.typical);
  }
  const line = div("collapse-line", body);
  line.style.left = pct(scale.collapseAt);
  const lineLabel = document.createElement("span");
  lineLabel.textContent = m.chart.collapseAt(scale.collapseAt);
  line.appendChild(lineLabel);
  const axis = div("axis", root);
  for (let turns = 0; turns <= scale.max; turns += 10) {
    const tick = document.createElement("span");
    tick.textContent = String(turns);
    tick.style.left = pct(turns);
    axis.appendChild(tick);
  }
  const unit = document.createElement("p");
  unit.className = "label";
  unit.textContent = m.chart.unit;
  root.appendChild(unit);
};
