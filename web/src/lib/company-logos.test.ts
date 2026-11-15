import { describe, expect, it } from "vitest";
import { iconFor, logoSprite } from "./build-company-logos";
import { buildCatalog } from "./build-catalog";
import { companySlug } from "./catalog";
import { companyLogo, monogram } from "./company-logos";

describe("company logos", () => {
  const sets = buildCatalog().playlists;
  const sprite = logoSprite(sets);

  it("gives every company set a symbol: a mark or a monogram", () => {
    for (const p of sets) {
      expect(sprite).toContain(`id="co-${companySlug(p.id)}"`);
      if (!iconFor(p)) expect(monogram(p.title)).toMatch(/^[A-Z0-9]{1,4}$/);
    }
  });

  it("finds the well-known marks and falls back for removed brands", () => {
    const by = (slug: string) => sets.find((p) => companySlug(p.id) === slug);
    for (const slug of ["google", "meta", "apple", "nvidia", "netflix", "spotify", "snap", "paypal", "shopify"]) expect(iconFor(by(slug) ?? { id: slug, title: slug }), slug).not.toBeNull();
    expect(iconFor(by("microsoft") ?? { id: "microsoft", title: "Microsoft" })).toBeNull();
    expect(iconFor({ id: "093_magic", title: "Magic" })).toBeNull();
  });

  it("makes monograms from initials and acronyms", () => {
    expect(monogram("Jane Street")).toBe("JS");
    expect(monogram("Ramp")).toBe("R");
    expect(monogram("Susquehanna (SIG)")).toBe("SIG");
    expect(monogram("IMC Trading")).toBe("IMC");
    expect(monogram("The Home Depot")).toBe("HD");
    expect(monogram("D. E. Shaw")).toBe("DE");
  });

  it("references the sprite and stays decorative", () => {
    expect(companyLogo("google").value).toContain('href="/company-logos.svg#co-google"');
    expect(companyLogo("google").value).toContain('aria-hidden="true"');
  });
});
