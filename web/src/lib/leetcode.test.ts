import { describe, expect, it } from "vitest";
import { cleanUsername, validUsername } from "./leetcode";

describe("cleanUsername", () => {
  it("accepts a name, an @name or a pasted profile link", () => {
    expect(cleanUsername("  kidskoding ")).toBe("kidskoding");
    expect(cleanUsername("@kidskoding")).toBe("kidskoding");
    expect(cleanUsername("https://leetcode.com/u/kidskoding/")).toBe("kidskoding");
    expect(cleanUsername("leetcode.com/neetcode")).toBe("neetcode");
  });
  it("rejects what the Worker would", () => {
    expect(validUsername("a.b-c_d")).toBe(true);
    expect(validUsername("a b")).toBe(false);
    expect(validUsername("")).toBe(false);
  });
});
