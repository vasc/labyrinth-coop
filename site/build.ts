import { ARTIFACT_DIR, PAGES_DIR, buildSite } from "./bundle";

// Usage: bun run site/build.ts
// Writes site/dist/before-the-maze-falls.html (for the Artifact) and docs/index.html (the GitHub Pages site).
const built = await buildSite({ artifactDir: ARTIFACT_DIR, pagesDir: PAGES_DIR });
for (const path of [built.artifact, built.pages]) {
  console.log(`wrote ${path} (${Math.round((await Bun.file(path).size) / 1024)} KB)`);
}
