/**
 * The record link of a table row: a real <a>, so a screen reader hears the
 * record's name and Cmd or middle click open it the way any link does.
 */
import { router } from "@inertiajs/react";
import type { MouseEvent, ReactNode } from "react";
import { isExternalUrl } from "../../lib/externalUrl";
import type { TableColumn } from "../types";

export interface RecordLinkTarget {
	href: string;
	newTab: boolean;
}

// These kinds would leave the link without a name.
const UNLINKABLE_KINDS = new Set(["image", "link", "group", "boolean", "color", "icon"]);

function canCarryLink(col: TableColumn, value: unknown): boolean {
	const hasText = typeof value === "number" || (typeof value === "string" && value !== "");
	// These may hold a control, and an <a> must not contain one.
	const holdsControl = col.render || col.editable || col.prefix || col.suffix;
	return hasText && !holdsControl && !UNLINKABLE_KINDS.has(col.kind ?? "");
}

/** The link's text is its accessible name, so a title beats a bare id or number. */
export function recordLinkColumn(
	columns: TableColumn[],
	row: Record<string, unknown>,
): string | undefined {
	const linkable = columns.filter((col) => canCarryLink(col, row[col.name]));
	const named = linkable.find(
		(col) =>
			col.name !== "id" &&
			typeof row[col.name] === "string" &&
			!/^\W*\d+$/.test(row[col.name] as string),
	);
	return (linkable.find((col) => col.emphasized) ?? named ?? linkable[0])?.name;
}

export function navigateToRecord({ href, newTab }: RecordLinkTarget): void {
	if (newTab) {
		window.open(href, "_blank", "noopener");
		return;
	}
	if (isExternalUrl(href)) {
		window.location.assign(href);
		return;
	}
	router.visit(href);
}

function opensNatively(e: MouseEvent, target: RecordLinkTarget): boolean {
	return (
		target.newTab ||
		isExternalUrl(target.href) ||
		e.button !== 0 ||
		e.metaKey ||
		e.ctrlKey ||
		e.shiftKey ||
		e.altKey
	);
}

export function RecordLink({
	target,
	children,
}: {
	target: RecordLinkTarget;
	children: ReactNode;
}) {
	return (
		<a
			href={target.href}
			{...(target.newTab ? { target: "_blank", rel: "noopener" } : {})}
			className="rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
			onClick={(e) => {
				if (opensNatively(e, target)) {
					return;
				}
				e.preventDefault();
				router.visit(target.href);
			}}
		>
			{children}
		</a>
	);
}
