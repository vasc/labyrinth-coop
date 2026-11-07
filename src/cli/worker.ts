import { runGame, summarize } from "../simulate";
import { LIMITS, MAX_TURNS, sweepConfigs } from "../sweep";

// Usage: bun run src/cli/worker.ts <shard> <shards> <games> <outfile>
const [shard, shards, games] = process.argv.slice(2, 5).map(Number);
const outfile = process.argv[5];
if (shard === undefined || shards === undefined || games === undefined || outfile === undefined) {
  throw new Error("usage: worker.ts <shard> <shards> <games> <outfile>");
}

const rows = sweepConfigs()
  .filter((entry) => entry.id % shards === shard)
  .map(({ id, config }) => {
    // Game g starts from the same board and deal in every config, so configs are compared on equal footing.
    const results = Array.from({ length: games }, (_, g) => runGame(config, g + 1, MAX_TURNS));
    return { id, config, summary: summarize(results, LIMITS), turnsNeeded: results.map((r) => r.turnsNeeded) };
  });

await Bun.write(outfile, JSON.stringify(rows));
