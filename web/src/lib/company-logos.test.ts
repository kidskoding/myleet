import { describe, expect, it } from "vitest";
import { logoFor, logoSprite, symbolize } from "./build-company-logos";
import { buildCatalog } from "./build-catalog";
import { companySlug } from "./catalog";
import { companyLogo, monogram } from "./company-logos";

describe("company logos", () => {
  const sets = buildCatalog().playlists;
  const sprite = logoSprite(sets);

  it("gives every company a real brand asset instead of an initials placeholder", () => {
    for (const p of sets) {
      const logo = logoFor(p);
      expect(logo.kind, p.title).not.toBe("monogram");
      expect(sprite).toContain(`id="co-${companySlug(p.id)}"`);
    }
  });

  it("uses initials only for an unknown company", () => {
    expect(logoFor({ id: "unknown_company", title: "Unknown Company" }).kind).toBe("monogram");
  });

  it("makes monograms from initials and acronyms", () => {
    expect(monogram("Jane Street")).toBe("JS");
    expect(monogram("Ramp")).toBe("R");
    expect(monogram("Susquehanna (SIG)")).toBe("SIG");
    expect(monogram("IMC Trading")).toBe("IMC");
    expect(monogram("The Home Depot")).toBe("HD");
    expect(monogram("D. E. Shaw")).toBe("DE");
  });

  it("loads an individual brand image and stays decorative", () => {
    expect(companyLogo("google").value).toContain('src="/company-marks/google.svg?v=');
    expect(companyLogo("google").value).toContain('alt=""');
    expect(companyLogo("google").value).toContain('aria-hidden="true"');
  });

  it("keeps vendor CSS classes local to each logo in the shared sprite", () => {
    const source = '<svg viewBox="0 0 24 24"><style>.st0 { fill:rgb(54,135,39); }</style><path class="st0" d="M0 0h24v24H0z"/></svg>';
    const fidelity = symbolize(source, "co-fidelity")?.symbol;
    const other = symbolize(source, "co-other")?.symbol;
    expect(fidelity).toContain('.co-fidelity-st0');
    expect(fidelity).toContain('class="co-fidelity-st0"');
    expect(other).toContain('.co-other-st0');
    expect(fidelity).not.toContain('class="st0"');
  });

  it("lightens a dark one-colour mark on dark themes without draining its colour", () => {
    const united = logoFor({ id: "united_airlines", title: "United Airlines" }).symbol;
    const dark = /light-dark\(#002244, (#[0-9a-f]{6})\)/.exec(united)?.[1] ?? "";
    const [r, g, b] = [1, 3, 5].map((o) => Number.parseInt(dark.slice(o, o + 2), 16));
    // Still clearly blue, not the grey-blue that mixing with white gave (#667a8f).
    expect((b ?? 0) - Math.max(r ?? 0, g ?? 0)).toBeGreaterThan(80);
  });

  it("draws a listed wordmark colour in the page's text colour on dark themes", () => {
    const svg = '<svg viewBox="0 0 10 10"><path fill="#1c252c" d="M0 0h5v5z"/><path fill="#ffed31" d="M5 5h5v5z"/></svg>';
    const plain = symbolize(svg, "co-x")?.symbol ?? "";
    const inked = symbolize(svg, "co-x", { inkOnDark: ["#1C252C"] })?.symbol ?? "";
    expect(plain).not.toContain("light-dark");
    expect(inked).toContain('style="color:light-dark(#1c252c, var(--ink');
    expect(inked).toContain('fill="currentColor"');
    expect(inked).toContain('fill="#ffed31"');
  });
});
