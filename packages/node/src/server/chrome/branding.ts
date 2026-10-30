/** A CSS length in px, rem or em, e.g. `2rem` or `32px`. */
const LOGO_HEIGHT = /^\d+(\.\d+)?(px|rem|em)$/;

/**
 * ConfiguresBranding: a logo image that replaces the brand name in the chrome's
 * logo block, and the browser-tab favicon. URLs are used as given.
 */
export interface BrandingConfig {
	/** Logo image URL shown instead of the brand name; the name becomes its alt text. */
	brandLogo?: string;
	/** Logo image URL used while the panel is dark; changes nothing without `brandLogo`. */
	darkModeBrandLogo?: string;
	/** Rendered logo height as a px, rem or em length (default `1.5rem`). */
	brandLogoHeight?: string;
	/** Browser-tab icon URL (.ico, .png or .svg) for every page of the panel. */
	favicon?: string;
}

/** The setters' checks, at createAdmin() for a host without the types. */
export function assertBranding(branding: BrandingConfig): void {
	for (const key of ["brandLogo", "darkModeBrandLogo", "favicon"] as const) {
		const url = branding[key];
		if (url !== undefined && (typeof url !== "string" || url.trim() === "")) {
			throw new TypeError(`${key} needs a non-empty URL.`);
		}
	}
	const height = branding.brandLogoHeight;
	if (height !== undefined && !LOGO_HEIGHT.test(height)) {
		throw new TypeError(
			`Invalid brand logo height "${height}". Expected a px, rem or em length, e.g. '2rem'.`,
		);
	}
}

/** The sparse `tbtop.brandLogo` prop; null while no `brandLogo` is set. */
export function brandLogoProp(branding: BrandingConfig): Record<string, string> | null {
	if (branding.brandLogo === undefined) {
		return null;
	}
	return {
		src: branding.brandLogo,
		...(branding.darkModeBrandLogo !== undefined
			? { darkSrc: branding.darkModeBrandLogo }
			: {}),
		...(branding.brandLogoHeight !== undefined ? { height: branding.brandLogoHeight } : {}),
	};
}
