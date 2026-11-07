export type ChartRow = {
  label: string;
  note?: string;
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
  { label: "One shared pile, face down", note: "these rules", typical: 24, bad: 30, sacrifices: 3.1, ours: true },
  { label: "One pile each, face down", typical: 29, bad: 52, sacrifices: 1.7 },
  { label: "Shared pile, all cards face up", typical: 15, bad: 18, sacrifices: 0.5 },
  { label: "Shared pile, face down, nobody helps", typical: 29, bad: 46, sacrifices: 0 },
];

const div = (className: string, parent: HTMLElement): HTMLDivElement => {
  const el = document.createElement("div");
  el.className = className;
  parent.appendChild(el);
  return el;
};

/** Horizontal bars on one turn axis: bar to the median, whisker out to the 90th percentile. */
export const renderChart = (root: HTMLElement, rows: readonly ChartRow[], scale: { max: number; collapseAt: number }): void => {
  const pct = (turns: number) => `${(turns / scale.max) * 100}%`;
  root.replaceChildren();
  const body = div("chart-body", root);
  for (const row of rows) {
    const rowEl = div(row.ours === true ? "bar-row ours" : "bar-row", body);
    const label = div("bar-label", rowEl);
    const name = document.createElement("div");
    name.textContent = row.label;
    if (row.note !== undefined) {
      const note = document.createElement("strong");
      note.textContent = ` (${row.note})`;
      name.appendChild(note);
    }
    const figures = document.createElement("span");
    figures.textContent = `typical ${row.typical} · bad ${row.bad} · ${row.sacrifices.toFixed(1)} sacrifices/game`;
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
  lineLabel.textContent = `Collapse at ${scale.collapseAt}`;
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
  unit.textContent = "Turns needed";
  root.appendChild(unit);
};
