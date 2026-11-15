import { describe, expect, it } from "vitest";
import { moduleSubtitle, sentenceCase } from "./display";

describe("sentenceCase", () => {
  it("lowers inner words and keeps acronyms and lone capitals", () => {
    expect(sentenceCase("Arrays And Hashing")).toBe("Arrays and hashing");
    expect(sentenceCase("2D Grid DP")).toBe("2D grid DP");
    expect(sentenceCase("Top-K")).toBe("Top-K");
    expect(sentenceCase("K-Way Merge")).toBe("K-way merge");
    expect(sentenceCase("Prefix & Suffix Sums")).toBe("Prefix & suffix sums");
  });
  it("joins technique titles into a subtitle", () => {
    expect(moduleSubtitle({ techniques: [{ title: "Fixed Window" }, { title: "BFS Levels" }] as never })).toBe("Fixed window, BFS levels");
  });
});
