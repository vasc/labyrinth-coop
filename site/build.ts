import { join } from "node:path";

// Usage: bun run site/build.ts
// Bundles site/src/main.ts (with the simulator's rules and the Lucide icons it uses) into one self-contained page.
const MARKER = "<!-- bundle -->";
const OUT = join(import.meta.dir, "dist", "before-the-maze-falls.html");

const result = await Bun.build({
  entrypoints: [join(import.meta.dir, "src", "main.ts")],
  target: "browser",
  format: "iife",
  minify: true,
});
if (!result.success) throw new AggregateError(result.logs, "site bundle failed");
const bundle = result.outputs[0];
if (bundle === undefined) throw new Error("site bundle produced no output");
const script = (await bundle.text()).replaceAll("</script", "<\\/script");

const template = await Bun.file(join(import.meta.dir, "template.html")).text();
if (!template.includes(MARKER)) throw new Error(`template is missing ${MARKER}`);
// A replacer function, so `$&`-style sequences in the bundle are not treated as replacement patterns.
await Bun.write(OUT, template.replace(MARKER, () => `<script>${script}</script>`));
console.log(`wrote ${OUT} (${Math.round((await Bun.file(OUT).size) / 1024)} KB)`);
