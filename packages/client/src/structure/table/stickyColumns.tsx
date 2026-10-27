/**
 * Sticky columns — leading cells pinned to the left edge on horizontal scroll.
 * Pinned slots, left to right: reorder handle, select checkbox, then the
 * leading run of `sticky` columns. Each pinned cell reads its left offset from
 * a `--tbtop-sticky-<slot>` var that useStickyOffsets measures off the header.
 */
import {
	type CSSProperties,
	createContext,
	type RefObject,
	useContext,
	useLayoutEffect,
} from "react";
import type { TableColumn } from "../types";

export interface StickyLayout {
	reorder: boolean;
	bulk: boolean;
	/** Names of the pinned data columns, in slot order. */
	columns: string[];
}

/** A pinned utility cell, or a data column by name. */
export type StickyCell = "reorder" | "bulk" | { column: string };

const StickyColumnsContext = createContext<StickyLayout | undefined>(undefined);

export const StickyColumnsProvider = StickyColumnsContext.Provider;

/**
 * The pinned layout for the visible columns, or undefined when nothing pins.
 * Only the leading run counts: PHP rejects a later sticky column, and a hidden
 * column just shortens the run.
 */
export function resolveStickyLayout(
	columns: TableColumn[],
	utility: { reorder: boolean; bulk: boolean },
): StickyLayout | undefined {
	const pinned: string[] = [];
	for (const col of columns) {
		if (!col.sticky) {
			break;
		}
		pinned.push(col.name);
	}
	if (pinned.length === 0) {
		return undefined;
	}
	return { ...utility, columns: pinned };
}

export function stickySlotCount(layout: StickyLayout): number {
	return (layout.reorder ? 1 : 0) + (layout.bulk ? 1 : 0) + layout.columns.length;
}

function slotOf(layout: StickyLayout, cell: StickyCell): number | undefined {
	const lead = layout.reorder ? 1 : 0;
	if (cell === "reorder") {
		return layout.reorder ? 0 : undefined;
	}
	if (cell === "bulk") {
		return layout.bulk ? lead : undefined;
	}
	const index = layout.columns.indexOf(cell.column);
	return index === -1 ? undefined : lead + (layout.bulk ? 1 : 0) + index;
}

export interface StickyCellProps {
	className?: string;
	style?: CSSProperties;
	"data-sticky-slot"?: number;
	"data-sticky-edge"?: true;
}

/** Class, offset and slot attributes for one cell; empty when it does not pin. */
export function useStickyCell(cell: StickyCell): StickyCellProps {
	const layout = useContext(StickyColumnsContext);
	const slot = layout ? slotOf(layout, cell) : undefined;
	if (!layout || slot === undefined) {
		return {};
	}
	return {
		className: "tbtop-sticky-cell",
		style: { left: `var(--tbtop-sticky-${slot}, 0px)` },
		"data-sticky-slot": slot,
		"data-sticky-edge": slot === stickySlotCount(layout) - 1 ? true : undefined,
	};
}

/**
 * Measures the pinned header cells into `--tbtop-sticky-<slot>` vars on the
 * table (cumulative widths), re-measuring when a pinned cell resizes, and
 * flags the container `data-scrolled-x` so the edge shadow shows only once
 * content slides under it. Writes straight to the DOM: no re-render per scroll.
 */
export function useStickyOffsets(
	containerRef: RefObject<HTMLDivElement | null>,
	tableRef: RefObject<HTMLTableElement | null>,
	layout: StickyLayout | undefined,
): void {
	const key = layout ? `${layout.reorder}|${layout.bulk}|${layout.columns.join(",")}` : "";
	useLayoutEffect(() => {
		const container = containerRef.current;
		const table = tableRef.current;
		if (!key || !container || !table) {
			return;
		}
		const cells = [
			...table.querySelectorAll<HTMLElement>("thead > tr:first-child > [data-sticky-slot]"),
		];
		const measure = () => writeOffsets(table, cells);
		const onScroll = () =>
			container.toggleAttribute("data-scrolled-x", container.scrollLeft > 0);
		measure();
		onScroll();
		container.addEventListener("scroll", onScroll, { passive: true });
		const observer =
			typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(measure);
		for (const cell of cells) {
			observer?.observe(cell);
		}
		return () => {
			container.removeEventListener("scroll", onScroll);
			observer?.disconnect();
		};
	}, [containerRef, tableRef, key]);
}

function writeOffsets(table: HTMLTableElement, cells: HTMLElement[]): void {
	let left = 0;
	for (const cell of cells) {
		table.style.setProperty(`--tbtop-sticky-${cell.dataset.stickySlot}`, `${left}px`);
		left += cell.getBoundingClientRect().width;
	}
}
