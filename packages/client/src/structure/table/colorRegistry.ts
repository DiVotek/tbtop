/**
 * Color registry for table cell renderers (badge, boolean, icon).
 *
 * Built-in semantic names map to Tailwind utility classes that reference
 * CSS custom properties defined in styles.css. Custom colors can be
 * registered at startup via registerTableColor().
 */

/**
 * bg/text are a badge pair: text is the color that reads on top of bg (e.g.
 * white text on a solid success background). icon is the paint color for a
 * bare icon on the page background (e.g. green on white) — distinct from
 * text because a badge's on-color and a standalone icon's color differ.
 */
type ColorClasses = { bg: string; text: string; icon: string };
type RegisteredColorClasses = { bg: string; text: string; icon?: string };

const builtins: Record<string, ColorClasses> = {
	gray: { bg: "bg-muted", text: "text-muted-foreground", icon: "text-muted-foreground" },
	muted: { bg: "bg-muted", text: "text-muted-foreground", icon: "text-muted-foreground" },
	primary: { bg: "bg-primary", text: "text-primary-foreground", icon: "text-primary" },
	danger: { bg: "bg-destructive", text: "text-white", icon: "text-destructive" },
	destructive: { bg: "bg-destructive", text: "text-white", icon: "text-destructive" },
	success: { bg: "bg-success", text: "text-success-foreground", icon: "text-success" },
	warning: { bg: "bg-warning", text: "text-warning-foreground", icon: "text-warning" },
	info: { bg: "bg-info", text: "text-info-foreground", icon: "text-info" },
};

const custom: Record<string, RegisteredColorClasses> = {};

export function registerTableColor(name: string, classes: RegisteredColorClasses): void {
	custom[name] = classes;
}

const FALLBACK: ColorClasses = {
	bg: "bg-muted",
	text: "text-muted-foreground",
	icon: "text-muted-foreground",
};

export function resolveColorClasses(name: string | undefined): ColorClasses {
	if (!name) {
		return builtins.gray ?? FALLBACK;
	}
	const registered = custom[name] ?? builtins[name];
	if (!registered) {
		return FALLBACK;
	}
	// Custom colors registered before the `icon` field existed fall back to `text`.
	return { ...registered, icon: registered.icon ?? registered.text };
}
