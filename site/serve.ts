import { join } from "node:path";
import { PAGES_DIR } from "./bundle";

// Usage: bun run site/serve.ts  (after `bun run site`): serves the GitHub Pages build at http://localhost:4173
const page = Bun.file(join(PAGES_DIR, "index.html"));
const server = Bun.serve({
  port: 4173,
  fetch: () => new Response(page, { headers: { "content-type": "text/html; charset=utf-8" } }),
});
console.log(`serving ${server.url}`);
