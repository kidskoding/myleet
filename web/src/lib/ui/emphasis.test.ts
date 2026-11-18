import { describe, expect, it } from "vitest";
import { companyMarks, emphasize, markCompanies } from "./emphasis";

describe("emphasize", () => {
  it("bolds the focus topic, the days and the company", () => {
    expect(emphasize("Today we're focusing on sliding window, your weakest spot. Your Meta interview is 12 days away", ["Meta"]).value).toBe(
      "Today we&#39;re focusing on <strong>sliding window</strong>, your weakest spot. Your <strong>Meta</strong> interview is <strong>12 days</strong> away",
    );
  });
  it("bolds review counts", () => {
    expect(emphasize("You have 44 reviews waiting and 1 review today").value).toBe("You have <strong>44 reviews</strong> waiting and <strong>1 review</strong> today");
  });
  it("escapes markup in the text", () => {
    expect(emphasize("<b>x</b>").value).toBe("&lt;b&gt;x&lt;/b&gt;");
  });
});

describe("company marks", () => {
  it("puts the logo and the bold name in one unbroken span", () => {
    const out = emphasize("Your Meta interview is 12 days away", ["Meta"], { Meta: "meta" }).value;
    expect(out).toMatch(/Your <span class="co-inline"><img class="co-logo" src="\/company-marks\/meta\.svg\?v=\w+"[^>]*\/><strong>Meta<\/strong><\/span> interview is <strong>12 days<\/strong> away/);
  });
  it("leaves a company without a mark as a bold name", () => {
    expect(markCompanies("Working toward Ramp", { Ramp: "" }).value).toBe("Working toward <strong>Ramp</strong>");
    expect(emphasize("Working toward Ramp", ["Ramp"]).value).toBe("Working toward <strong>Ramp</strong>");
  });
  it("gives a logo only to companies with a real one", () => {
    expect(companyMarks([{ id: "001_meta", title: "Meta" }, { id: "002_nope", title: "Nope" }, { id: "003_x", title: "X" }], ["meta", "nope"])).toEqual({ Meta: "meta", Nope: "" });
  });
});
