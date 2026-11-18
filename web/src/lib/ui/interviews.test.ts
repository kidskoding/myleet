import { describe, expect, it } from "vitest";
import { companyIn } from "./interviews";

const companies: Parameters<typeof companyIn>[1] = [
  { id: "001_google", title: "Google", group: "Big Tech" as never },
  { id: "010_capital-one", title: "Capital One", group: "Fortune 500" as never },
  { id: "020_meta", title: "Meta", group: "Big Tech" as never },
];

describe("companyIn", () => {
  it("finds the company an event title names", () => {
    expect(companyIn("Google onsite interview", companies)).toBe("google");
    expect(companyIn("Phone screen: Capital One (SWE intern)", companies)).toBe("capital-one");
    expect(companyIn("Metadata team sync", companies)).toBeNull();
    expect(companyIn("Final round", companies)).toBeNull();
  });
});
