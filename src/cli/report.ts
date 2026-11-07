import { join } from "node:path";
import { fullReport, parseRows } from "../report";

// Usage: bun run src/cli/report.ts  (reads results/sweep.json, writes results/report.md)
const root = join(import.meta.dir, "..", "..", "results");
const rows = parseRows(await Bun.file(join(root, "sweep.json")).json());
await Bun.write(join(root, "report.md"), `${fullReport(rows)}\n`);
console.log(`wrote report for ${rows.length} configs`);
