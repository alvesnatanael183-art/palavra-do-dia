import { afterEach, describe, expect, it, vi } from "vitest";
import { githubPagesHrefs } from "./deployment";

describe("GitHub Pages hash-router links", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("places Bible-search queries before the route hash", () => {
    vi.stubGlobal(
      "window",
      {
        location: new URL(
          "https://alvesnatanael183-art.github.io/palavra-do-dia/#/"
        ),
      }
    );

    expect(githubPagesHrefs("/busca?q=amor")).toBe(
      "/palavra-do-dia/?q=amor#/busca"
    );
  });

  it("keeps verse highlights shareable on the reader route", () => {
    vi.stubGlobal(
      "window",
      {
        location: new URL(
          "https://alvesnatanael183-art.github.io/palavra-do-dia/#/"
        ),
      }
    );

    expect(githubPagesHrefs("/leitura/GEN/1?v=3")).toBe(
      "/palavra-do-dia/?v=3#/leitura/GEN/1"
    );
  });
});
