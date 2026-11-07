import { mkdir } from "node:fs/promises";
import { availableParallelism } from "node:os";
import { join } from "node:path";
import { sweepConfigs } from "../sweep";

// Usage: bun run src/cli/sweep.ts [games per config] [deadline minutes]
const games = Number(process.argv[2] ?? 1000);
const deadlineMinutes = Number(process.argv[3] ?? 30);
const shards = availableParallelism();
const root = join(import.meta.dir, "..", "..", "results");
const rawDir = join(root, "raw");
await mkdir(rawDir, { recursive: true });

console.log(`${sweepConfigs().length} configs x ${games} games on ${shards} workers`);
const started = performance.now();
const workers = Array.from({ length: shards }, (_, shard) =>
  Bun.spawn(["bun", "run", join(import.meta.dir, "worker.ts"), `${shard}`, `${shards}`, `${games}`, join(rawDir, `shard-${shard}.json`)], {
    stdout: "inherit",
    stderr: "inherit",
  }),
);

const deadline = setTimeout(() => {
  console.error(`deadline of ${deadlineMinutes} min reached, stopping workers`);
  for (const worker of workers) worker.kill();
}, deadlineMinutes * 60_000);
const codes = await Promise.all(workers.map((worker) => worker.exited));
clearTimeout(deadline);
if (codes.some((code) => code !== 0)) throw new Error(`workers exited with ${codes.join(", ")}`);

const rows = (await Promise.all(workers.map((_, shard) => Bun.file(join(rawDir, `shard-${shard}.json`)).json()))).flat();
await Bun.write(join(root, "sweep.json"), JSON.stringify(rows));
console.log(`wrote ${rows.length} configs in ${((performance.now() - started) / 1000).toFixed(0)}s`);
