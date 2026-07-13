import { useRef, useState } from "react";
import { translateValidationMessage } from "../../i18n/i18n";
import { checkField } from "../../inertia/constraints";
import { executeEffects, readEffects } from "../../inertia/effects";
import { getBlockDescriptor } from "../../render/blockRegistry";
import { renderDescriptor } from "../../render/renderDescriptor";
import { useClientActionContext } from "../actionContext";
import type { TableColumn } from "../types";

type EditableCol = TableColumn & { editable: NonNullable<TableColumn["editable"]> };

interface EditableCellProps {
	col: EditableCol;
	row: Record<string, unknown>;
	saveCell?: (args: { column: string; id: string; value: unknown }) => Promise<unknown>;
}

export function EditableCell({ col, row, saveCell }: EditableCellProps) {
	const ctx = useClientActionContext();
	const [value, setValue] = useState<unknown>(row[col.name]);
	const [error, setError] = useState<string | null>(null);
	// Ref keeps onBlur stable — avoids stale closure capturing an outdated value
	const valueRef = useRef<unknown>(row[col.name]);

	const id = readId(row);

	async function save(next: unknown): Promise<void> {
		if (!saveCell || !id) {
			return;
		}

		// UX-only pre-validation (server re-validates regardless)
		const msg = checkField(next, col.editable.constraints ?? {});
		if (msg) {
			setError(translateValidationMessage(ctx.t, msg));
			return;
		}
		setError(null);

		try {
			const rawEffects = await saveCell({ column: col.name, id, value: next });
			executeEffects(readEffects(rawEffects), ctx);
		} catch (err: unknown) {
			// rollback optimistic state
			setValue(row[col.name]);
			valueRef.current = row[col.name];
			setError(extractCellError(err, col.name));
		}
	}

	const descriptor = getBlockDescriptor(col.editable.as);
	if (!descriptor) {
		return <span>{String(value ?? "")}</span>;
	}

	// boolean + select commit on change; text commits on blur only
	const persistsOnChange = col.editable.as === "boolean" || col.editable.as === "select";

	return (
		<div onClick={(e) => e.stopPropagation()}>
			{renderDescriptor(descriptor, {
				kind: col.editable.as,
				// Forward static select options so the Select renders its choices
				options: { name: col.name, options: col.editable.options },
				meta: {},
				ctx: {
					surface: "form",
					binding: {
						name: col.name,
						value: value ?? null,
						onChange: (v: unknown) => {
							setValue(v);
							valueRef.current = v;
							if (persistsOnChange) {
								void save(v);
							}
						},
						onBlur: () => {
							if (!persistsOnChange) {
								void save(valueRef.current);
							}
						},
					},
				},
				children: undefined,
				renderChild: () => null,
			})}
			{error && (
				<span
					className="text-xs text-destructive block mt-0.5"
					data-testid={`cell-error-${col.name}`}
				>
					{error}
				</span>
			)}
		</div>
	);
}

function readId(row: Record<string, unknown>): string | undefined {
	const id = row.id;
	if (typeof id === "string") {
		return id;
	}
	if (typeof id === "number" && Number.isFinite(id)) {
		return String(id);
	}
	return undefined;
}

function extractCellError(err: unknown, column: string): string {
	// 422 JSON envelope: { errors: { [column]: string[] } }
	if (!err || typeof err !== "object" || !("errors" in err)) {
		return "Failed to save";
	}
	const errors = (err as Record<string, unknown>).errors;
	if (!errors || typeof errors !== "object") {
		return "Failed to save";
	}
	const msgs = (errors as Record<string, string[]>)[column];
	return Array.isArray(msgs) && msgs.length > 0
		? (msgs[0] ?? "Failed to save")
		: "Failed to save";
}
