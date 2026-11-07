import { join } from "node:path";

// Usage: bun run site/serve.ts  (after `bun run site`): serves the built page at http://localhost:4173
const page = Bun.file(join(import.meta.dir, "dist", "before-the-maze-falls.html"));
// The built page has no doctype (the Artifact host adds the document skeleton), so add one here to avoid quirks mode.
const server = Bun.serve({
  port: 4173,
  fetch: async () => new Response(`<!doctype html>\n${await page.text()}`, { headers: { "content-type": "text/html; charset=utf-8" } }),
});
console.log(`serving ${server.url}`);
