import { describe, expect, it } from "vitest";
import { emphasize } from "./emphasis";

describe("emphasize", () => {
  it("bolds the focus topic, the days and the company", () => {
    expect(emphasize("Today we're focusing on sliding window, your weakest spot. Your Meta interview is 12 days away", ["Meta"]).value).toBe(
      "Today we&#39;re focusing on <strong>sliding window</strong>, your weakest spot. Your <strong>Meta</strong> interview is <strong>12 days</strong> away",
    );
  });
  it("escapes markup in the text", () => {
    expect(emphasize("<b>x</b>").value).toBe("&lt;b&gt;x&lt;/b&gt;");
  });
});
