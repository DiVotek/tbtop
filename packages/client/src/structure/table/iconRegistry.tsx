/**
 * Icon registry for table cell renderers.
 *
 * Every icon lucide-react ships is resolvable by its kebab-case name (e.g.
 * "memory-stick", "hard-drive") — derived once from lucide's own PascalCase
 * export table, the same names documented on lucide.dev/icons. Custom icons
 * (or overrides of a built-in name) can still be registered at startup via
 * registerIcon().
 */
import type { LucideIcon } from "lucide-react";
import * as LucideIcons from "lucide-react";

/** "MemoryStick" -> "memory-stick"; "AArrowDown" -> "a-arrow-down". */
function toKebabCase(name: string): string {
	return name
		.replaceAll(/([a-z0-9])([A-Z])/g, "$1-$2")
		.replaceAll(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
		.toLowerCase();
}

// lucide-react's namespace re-exports every icon component under its
// PascalCase name (plus an "Icon"-suffixed alias, and legacy aliases for
// renamed icons) — filter to components (ForwardRefExoticComponent objects,
// not the package's own helper exports) and key each by its lucide.dev slug.
const builtins: Record<string, LucideIcon> = Object.fromEntries(
	Object.entries(LucideIcons)
		.filter((entry): entry is [string, LucideIcon] => isIconComponent(entry[1]))
		.map(([pascalName, Icon]) => [toKebabCase(pascalName), Icon]),
);

function isIconComponent(value: unknown): value is LucideIcon {
	return typeof value === "object" && value !== null && "$$typeof" in value;
}

const custom: Record<string, LucideIcon> = {};

export function registerIcon(name: string, Icon: LucideIcon): void {
	custom[name] = Icon;
}

/** @deprecated Use {@link registerIcon} instead. */
export const registerTableIcon = registerIcon;

export function resolveIcon(name: string | undefined): LucideIcon | undefined {
	if (!name) {
		return undefined;
	}
	return custom[name] ?? builtins[name];
}
