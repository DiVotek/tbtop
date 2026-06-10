/**
 * Color registry for table cell renderers (badge, boolean, icon).
 *
 * Built-in semantic names map to Tailwind utility classes that reference
 * CSS custom properties defined in styles.css. Custom colors can be
 * registered at startup via registerTableColor().
 */

type ColorClasses = { bg: string; text: string };

const builtins: Record<string, ColorClasses> = {
	gray: { bg: "bg-muted", text: "text-muted-foreground" },
	muted: { bg: "bg-muted", text: "text-muted-foreground" },
	primary: { bg: "bg-primary", text: "text-primary-foreground" },
	danger: { bg: "bg-destructive", text: "text-white" },
	destructive: { bg: "bg-destructive", text: "text-white" },
	success: { bg: "bg-success", text: "text-success-foreground" },
	warning: { bg: "bg-warning", text: "text-warning-foreground" },
	info: { bg: "bg-info", text: "text-info-foreground" },
};

const custom: Record<string, ColorClasses> = {};

export function registerTableColor(name: string, classes: ColorClasses): void {
	custom[name] = classes;
}

const FALLBACK: ColorClasses = { bg: "bg-muted", text: "text-muted-foreground" };

export function resolveColorClasses(name: string | undefined): ColorClasses {
	if (!name) {
		return builtins.gray ?? FALLBACK;
	}
	return custom[name] ?? builtins[name] ?? FALLBACK;
}
