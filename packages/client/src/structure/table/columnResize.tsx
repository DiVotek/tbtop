/**
 * Column resizing: the user's dragged widths travel to header and body cells
 * through context, and ColumnResizeHandle is the drag grip on a header's
 * right edge. Double-click drops a column back to its declared width.
 */
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { createContext, useContext } from "react";
import { useTranslation } from "../../i18n/i18n";

interface ColumnSizing {
	widths: Record<string, number>;
	setWidth: (name: string, width: number | undefined, persist?: boolean) => void;
}

const ColumnSizingContext = createContext<ColumnSizing | undefined>(undefined);

export const ColumnSizingProvider = ColumnSizingContext.Provider;

export function useColumnSizing(): ColumnSizing | undefined {
	return useContext(ColumnSizingContext);
}

/**
 * Width style for a header or body cell, merged with its sticky offset. A
 * dragged width wins over the declared one, and `max-width: 0` drops the
 * cell's content from the column's minimum, so the dragged width holds against
 * long or `nowrap` content, which then clips instead of widening the column.
 */
export function cellWidthStyle(
	declared: string | undefined,
	resized: number | undefined,
	extra?: CSSProperties,
): CSSProperties | undefined {
	const width = widthOnly(declared, resized);
	return width || extra ? { ...width, ...extra } : undefined;
}

function widthOnly(
	declared: string | undefined,
	resized: number | undefined,
): CSSProperties | undefined {
	if (resized !== undefined) {
		return { width: resized, minWidth: resized, maxWidth: 0, overflow: "hidden" };
	}
	return declared ? { width: declared } : undefined;
}

interface ColumnResizeHandleProps {
	name: string;
	label: string;
}

export function ColumnResizeHandle({ name, label }: ColumnResizeHandleProps) {
	const t = useTranslation();
	const sizing = useColumnSizing();
	if (!sizing) {
		return null;
	}

	function handlePointerDown(e: ReactPointerEvent<HTMLSpanElement>) {
		const th = e.currentTarget.closest("th");
		if (!th || !sizing || e.button !== 0) {
			return;
		}
		e.preventDefault();
		e.stopPropagation();
		const handle = e.currentTarget;
		const startX = e.clientX;
		const startWidth = th.getBoundingClientRect().width;
		const { setWidth } = sizing;
		handle.setPointerCapture(e.pointerId);

		// Preview at most once a frame without saving; pointerup saves the last width.
		let width = startWidth;
		let moved = false;
		let frame = 0;
		const onMove = (ev: PointerEvent) => {
			width = startWidth + ev.clientX - startX;
			moved = true;
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(() => setWidth(name, width, false));
		};
		const onUp = () => {
			cancelAnimationFrame(frame);
			// Any move rendered a preview, so save even a drag that came back:
			// rendered and saved widths must not drift apart.
			if (moved) {
				setWidth(name, width);
			}
			handle.removeEventListener("pointermove", onMove);
			handle.removeEventListener("pointerup", onUp);
			handle.removeEventListener("pointercancel", onUp);
		};
		handle.addEventListener("pointermove", onMove);
		handle.addEventListener("pointerup", onUp);
		handle.addEventListener("pointercancel", onUp);
	}

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: pointer-only affordance; the column order and widths reset from the Columns menu.
		<span
			aria-hidden="true"
			title={t("table.columns.resize").replace("{column}", label)}
			className="absolute inset-y-0 right-0 z-10 w-2 cursor-col-resize touch-none select-none after:absolute after:inset-y-2 after:right-0 after:w-0.5 after:rounded-full group-hover/head:after:bg-border hover:after:bg-primary"
			data-testid={`column-resize-${name}`}
			onPointerDown={handlePointerDown}
			onClick={(e) => e.stopPropagation()}
			onDoubleClick={(e) => {
				e.stopPropagation();
				sizing.setWidth(name, undefined);
			}}
		/>
	);
}
