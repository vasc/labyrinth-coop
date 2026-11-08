import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { readPage } from "../../site/src/page";

describe("page template", () => {
  test("has every element the script wires up, of the right kind", async () => {
    const template = await Bun.file(join(import.meta.dir, "..", "..", "site", "template.html")).text();
    document.body.innerHTML = template;
    const page = readPage(document);
    expect(page.steps.length).toBe(4);
    expect(page.toggles.length).toBe(3);
    expect(page.langButtons.map((b) => b.dataset.lang)).toEqual(["en", "pt"]);
  });

  test("looping captions are not live regions, so screen readers aren't flooded", async () => {
    const template = await Bun.file(join(import.meta.dir, "..", "..", "site", "template.html")).text();
    document.body.innerHTML = template;
    expect(document.querySelectorAll("[aria-live]").length).toBe(0);
  });

  test("complains about a missing element instead of half-starting", () => {
    document.body.innerHTML = "<div></div>";
    expect(() => readPage(document)).toThrow();
  });
});
