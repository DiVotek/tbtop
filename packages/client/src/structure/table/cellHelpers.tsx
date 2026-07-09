/**
 * Special-purpose table cell renderers for badge, boolean, and icon kinds.
 * These are thin display-only components — no bindings, no form state.
 */
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { Badge } from "../../ui/badge";
import { colorShapeClass } from "../colorShape";
import { imageShapeClass } from "../imageShape";
import type { TableColumn } from "../types";
import { resolveColorClasses } from "./colorRegistry";
import { resolveIcon } from "./iconRegistry";

// ─── Badge cell ───────────────────────────────────────────────────────────────

interface BadgeCellProps {
	value: unknown;
	col: TableColumn;
}

export function BadgeCell({ value, col }: BadgeCellProps): ReactNode {
	const str = value != null ? String(value) : "";
	const colorName = col.badge?.colors?.[str];
	const classes = resolveColorClasses(colorName);
	return (
		<Badge className={cn(classes.bg, classes.text, "border-transparent")}>{str || "—"}</Badge>
	);
}

// ─── Boolean cell ─────────────────────────────────────────────────────────────

interface BooleanCellProps {
	value: unknown;
	col: TableColumn;
}

export function BooleanIconCell({ value, col }: BooleanCellProps): ReactNode {
	if (value == null) {
		return <span className="text-muted-foreground">—</span>;
	}
	const truthy = Boolean(value);
	const iconName = truthy ? (col.boolean?.trueIcon ?? "check") : (col.boolean?.falseIcon ?? "x");
	const colorName = truthy
		? (col.boolean?.trueColor ?? "success")
		: (col.boolean?.falseColor ?? "muted");
	const Icon = resolveIcon(iconName);
	const classes = resolveColorClasses(colorName);
	if (!Icon) {
		return <span className={classes.text}>{truthy ? "✓" : "✗"}</span>;
	}
	return <Icon className={cn("size-4", classes.text)} aria-hidden />;
}

// ─── Icon-map cell ────────────────────────────────────────────────────────────

interface IconCellProps {
	value: unknown;
	col: TableColumn;
}

export function IconMapCell({ value, col }: IconCellProps): ReactNode {
	const str = value != null ? String(value) : "";
	const entry = col.iconMap?.[str];
	if (!entry) {
		// Unknown value — render as text fallback
		return <span>{str || "—"}</span>;
	}
	const Icon = resolveIcon(entry.icon);
	const classes = resolveColorClasses(entry.color);
	if (!Icon) {
		return <span className={classes.text}>{str}</span>;
	}
	return <Icon className={cn("size-4", classes.text)} aria-hidden aria-label={str} />;
}

// ─── Image cell ───────────────────────────────────────────────────────────────

interface ImageCellProps {
	value: unknown;
	col: TableColumn;
}

export function ImageCell({ value, col }: ImageCellProps): ReactNode {
	const url = typeof value === "string" ? value : "";
	if (!url) {
		return <span data-testid="image-cell" />;
	}
	return (
		<span data-testid="image-cell">
			<img
				src={url}
				alt={col.alt ?? ""}
				className={cn("h-10 w-10 object-cover", imageShapeClass(col.shape))}
			/>
		</span>
	);
}

// ─── Color cell ─────────────────────────────────────────────────────────────────

const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

interface ColorCellProps {
	value: unknown;
	col: TableColumn;
}

export function ColorCell({ value, col }: ColorCellProps): ReactNode {
	const hex = typeof value === "string" ? value.trim() : "";
	if (!HEX_COLOR_RE.test(hex)) {
		return <span className="text-muted-foreground">—</span>;
	}
	return (
		<span
			data-testid="color-cell"
			title={hex}
			className={cn("inline-block size-6 border border-border", colorShapeClass(col.shape))}
			style={{ backgroundColor: hex }}
		/>
	);
}

// ─── Time cell ──────────────────────────────────────────────────────────────

interface TimeCellProps {
	value: unknown;
}

/** Server pre-formats the time string via KindFormat; render it verbatim. */
export function TimeCell({ value }: TimeCellProps): ReactNode {
	if (value == null || value === "") {
		return <span className="text-muted-foreground">—</span>;
	}
	return <span>{String(value)}</span>;
}

// ─── Link cell ──────────────────────────────────────────────────────────────

interface LinkCellProps {
	value: unknown;
	col: TableColumn;
}

/**
 * Renders the per-row URL resolved server-side (Column::link()). A null/empty
 * value renders nothing. stopPropagation keeps the click from also firing the
 * row's rowClick/recordUrl navigation. When an icon is configured, the cell
 * shows the icon only (no link text); otherwise it falls back to the URL.
 */
export function LinkCell({ value, col }: LinkCellProps): ReactNode {
	const url = typeof value === "string" && value !== "" ? value : undefined;
	if (!url) {
		return null;
	}
	const external = col.link?.external === true;
	const Icon = col.link?.icon ? resolveIcon(col.link.icon) : undefined;
	return (
		<a
			href={url}
			onClick={(e) => e.stopPropagation()}
			className="inline-flex items-center gap-1 text-primary hover:underline"
			{...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
		>
			{Icon ? (
				<Icon
					className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground"
					aria-hidden
				/>
			) : (
				url
			)}
		</a>
	);
}
