# Company logos

Each company has an entry in `manifest.json`. Assets come from SVGL, Simple Icons, theSVG, Lobe Icons, Dashboard Icons, gilbarbara/logos, Wikimedia Commons and Wikipedia, or the company website. The manifest records the source URL for downloaded assets. Package assets are pinned to their source commit where available. Prefer a vector. When a company only publishes a raster icon, it is stored as PNG or JPEG data inside an SVG wrapper and must be at least 180 pixels square, because small favicons render blurry. When the only vector is a full logo, the SVG keeps the official paths and its `viewBox` is cropped to the brand's symbol, such as the CVS heart or the Allstate hands. A dark text colour that would vanish on the dark theme may be written as `light-dark(<brand colour>, CanvasText)`, which keeps the brand colour on light surfaces.

The app loads each mark as an independent SVG image from `/company-marks/<slug>.svg` to avoid browser differences in external SVG masks. A shared sprite remains available for compatibility. Brand colors stay in place unless a mark needs a monochrome treatment to remain readable. Vendor CSS classes and SVG IDs are scoped to each company so marks cannot recolor one another. The manifest determines the image URL revision, so browsers fetch a new version when the source or treatment changes.

Use compact marks instead of full company names. Check both light and dark themes at the 24-pixel list size. The optional `treatment` field removes a neutral background or uses the image silhouette with the theme text color. Check the rendered result: an opaque badge needs a background treatment, or its silhouette can become a solid tile.

`web/scripts/vendor-logos.ts` preserves verified entries when refreshing sources. To replace a logo, save its SVG here and update the company entry with its source and file. Source URLs distinguish companies with similar names, including Magic.dev and Zipline's drone-delivery business. Collection licenses are stored alongside the assets and included in `web/public/licenses.txt`. Logos remain the trademarks of their owners.

`src/lib/company-logos.test.ts` checks that every catalog company has a brand asset and that vendor CSS stays local to each symbol.

`brandColor` preserves the original foreground color for background-knockout assets. Low-contrast chromatic marks receive a lighter or darker tint of that hue; only neutral marks use the theme text color.
