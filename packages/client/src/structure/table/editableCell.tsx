import { useRef, useState } from "react";
import { translateValidationMessage } from "../../i18n/i18n";
import { checkField } from "../../inertia/constraints";
import { executeEffects, readEffects } from "../../inertia/effects";
import { useLatest } from "../../lib/useLatest";
import { useReconciled } from "../../lib/useReconciled";
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
	const confirmedValueRef = useRef<unknown>(row[col.name]);
	const dirtyRef = useRef(false);
	const run = useLatest();

	const id = readId(row);
	const serverValue = row[col.name];
	const server = useReconciled(serverValue, { key: `${id ?? ""}:${col.name}` });

	if (server.changed) {
		if (server.keyChanged) {
			run.cancel();
		}
		server.accept();
		confirmedValueRef.current = serverValue;
		// A different cell always wins; the same cell yields only when the
		// user has no unsaved edit in it.
		if (server.keyChanged || !dirtyRef.current) {
			valueRef.current = serverValue;
			dirtyRef.current = false;
			setValue(serverValue);
		}
	}

	async function save(next: unknown, options: { skipIfClean?: boolean } = {}): Promise<void> {
		if (!saveCell || !id) {
			return;
		}

		// UX-only pre-validation (server re-validates regardless). Runs even on a
		// clean blur so an already-invalid stored value still surfaces its error.
		const msg = checkField(next, col.editable.constraints ?? {});
		if (msg) {
			setError(translateValidationMessage(ctx.t, msg));
			return;
		}
		setError(null);

		if (options.skipIfClean && !dirtyRef.current) {
			return;
		}

		await run(() => saveCell({ column: col.name, id, value: next }), {
			onResult: (rawEffects) => {
				confirmedValueRef.current = next;
				dirtyRef.current = false;
				executeEffects(readEffects(rawEffects), ctx);
			},
			onError: (err) => {
				// rollback optimistic state
				setValue(confirmedValueRef.current);
				valueRef.current = confirmedValueRef.current;
				dirtyRef.current = false;
				setError(extractCellError(err, col.name));
			},
		});
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
				// Static select options, editor attributes (step) and the column's
				// affixes — text/number/select forms wrap themselves in InputGroup
				// and read prefix/suffix from here.
				options: {
					name: col.name,
					options: col.editable.options,
					...col.editable.input,
					prefix: col.prefix,
					suffix: col.suffix,
				},
				meta: {},
				ctx: {
					surface: "form",
					binding: {
						name: col.name,
						value: value ?? null,
						onChange: (v: unknown) => {
							setValue(v);
							valueRef.current = v;
							dirtyRef.current = !Object.is(v, confirmedValueRef.current);
							if (persistsOnChange) {
								void save(v);
							}
						},
						onBlur: () => {
							if (!persistsOnChange) {
								void save(valueRef.current, { skipIfClean: true });
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
