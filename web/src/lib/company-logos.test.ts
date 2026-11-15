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
});
