import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PAGES_DIR, buildSite } from "../../site/bundle";

describe("site build", () => {
  let out = "";
  let paths = { artifact: "", pages: "" };
  beforeAll(async () => {
    out = await mkdtemp(join(tmpdir(), "maze-site-"));
    paths = await buildSite({ artifactDir: join(out, "dist"), pagesDir: join(out, "docs") });
  });
  afterAll(async () => {
    await rm(out, { recursive: true, force: true });
  });

  test("writes the Artifact page as a fragment, since the Artifact host adds the document skeleton", async () => {
    expect(paths.artifact).toBe(join(out, "dist", "before-the-maze-falls.html"));
    const page = await Bun.file(paths.artifact).text();
    expect(page.startsWith("<meta charset")).toBe(true);
    expect(page).not.toContain("<!-- bundle -->");
    expect(page).toContain("<script>");
  });

  test("writes the GitHub Pages site as a full standards-mode document named index.html", async () => {
    expect(paths.pages).toBe(join(out, "docs", "index.html"));
    const page = await Bun.file(paths.pages).text();
    expect(page.startsWith("<!doctype html>\n")).toBe(true);
    expect(page).toContain("<title>Before the Maze Falls</title>");
    expect(page).not.toContain("<!-- bundle -->");
  });

  test("tells GitHub Pages to serve the files as they are, without Jekyll", async () => {
    expect(await Bun.file(join(out, "docs", ".nojekyll")).exists()).toBe(true);
  });

  test("both pages carry the same content", async () => {
    const artifact = await Bun.file(paths.artifact).text();
    expect(await Bun.file(paths.pages).text()).toBe(`<!doctype html>\n${artifact}`);
  });

  test("the committed GitHub Pages site is up to date with the source (run `bun run site` and commit docs/)", async () => {
    const committed = Bun.file(join(PAGES_DIR, "index.html"));
    expect(await committed.exists()).toBe(true);
    expect(await committed.text()).toBe(await Bun.file(paths.pages).text());
  });
});
