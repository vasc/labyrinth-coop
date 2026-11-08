import { join } from "node:path";

const MARKER = "<!-- bundle -->";
const SITE = import.meta.dir;

/** Where the Artifact copy goes (git-ignored). */
export const ARTIFACT_DIR = join(SITE, "dist");
/** The GitHub Pages site, served from `main` /docs. It is committed, so rebuild and commit it after changing the page. */
export const PAGES_DIR = join(SITE, "..", "docs");

export type SiteDirs = { artifactDir: string; pagesDir: string };
export type BuiltSite = { artifact: string; pages: string };

/**
 * Bundles site/src/main.ts (with the simulator's rules and the Lucide icons it uses) into one self-contained page,
 * written twice:
 * - `<artifactDir>/before-the-maze-falls.html`, a fragment for the Artifact host, which adds the document skeleton;
 * - `<pagesDir>/index.html`, the same page as a full document with a doctype, plus `.nojekyll` so GitHub Pages
 *   serves it as it is.
 */
export const buildSite = async ({ artifactDir, pagesDir }: SiteDirs): Promise<BuiltSite> => {
  const result = await Bun.build({
    entrypoints: [join(SITE, "src", "main.ts")],
    target: "browser",
    format: "iife",
    minify: true,
  });
  if (!result.success) throw new AggregateError(result.logs, "site bundle failed");
  const bundle = result.outputs[0];
  if (bundle === undefined) throw new Error("site bundle produced no output");
  const script = (await bundle.text()).replaceAll("</script", "<\\/script");

  const template = await Bun.file(join(SITE, "template.html")).text();
  if (!template.includes(MARKER)) throw new Error(`template is missing ${MARKER}`);
  // A replacer function, so `$&`-style sequences in the bundle are not treated as replacement patterns.
  const fragment = template.replace(MARKER, () => `<script>${script}</script>`);

  const built = { artifact: join(artifactDir, "before-the-maze-falls.html"), pages: join(pagesDir, "index.html") };
  await Bun.write(built.artifact, fragment);
  await Bun.write(built.pages, `<!doctype html>\n${fragment}`);
  await Bun.write(join(pagesDir, ".nojekyll"), "");
  return built;
};
