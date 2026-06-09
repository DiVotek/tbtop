import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import type { FieldCellProps, FieldFormProps } from "./fieldProps";
import { findDuplicateKeys, type Row, rowsFromValue } from "./keyvalueRows";

function bagFromRows(rows: Row[]): Record<string, string> {
	return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export function KeyvalueCell({ value }: FieldCellProps<Record<string, string>>) {
	if (!value || Object.keys(value).length === 0) {
		return null;
	}
	const preview = Object.entries(value)
		.map(([k, v]) => `${k}=${v}`)
		.join(", ");
	return <span className="font-mono text-xs">{preview}</span>;
}

export function KeyvalueForm({
	id,
	name,
	value,
	onChange,
}: FieldFormProps<Record<string, string>>) {
	const [rows, setRows] = useState<Row[]>(() => rowsFromValue(value));
	const lastEmitted = useRef<Record<string, string> | null | undefined>(value);

	useEffect(() => {
		if (value === lastEmitted.current) {
			return;
		}
		lastEmitted.current = value;
		setRows(rowsFromValue(value));
	}, [value]);

	const duplicates = findDuplicateKeys(rows);
	const fieldId = id ?? name;

	function updateRows(next: Row[]): void {
		setRows(next);
		const bag = bagFromRows(next);
		lastEmitted.current = bag;
		onChange(bag);
	}

	function addRow(): void {
		updateRows([...rows, { id: crypto.randomUUID(), key: "", value: "" }]);
	}

	function removeRow(rowId: string): void {
		updateRows(rows.filter((r) => r.id !== rowId));
	}

	function updateKey(rowId: string, key: string): void {
		updateRows(rows.map((r) => (r.id === rowId ? { ...r, key } : r)));
	}

	function updateValue(rowId: string, val: string): void {
		updateRows(rows.map((r) => (r.id === rowId ? { ...r, value: val } : r)));
	}

	return (
		<div data-field={name} className="flex flex-col gap-2">
			{rows.map((row, index) => (
				<div key={row.id} className="flex flex-col gap-0.5">
					<div className="flex items-center gap-2">
						<Input
							id={index === 0 ? fieldId : undefined}
							type="text"
							aria-label="Key"
							value={row.key}
							onChange={(e) => updateKey(row.id, e.target.value)}
						/>
						<Input
							type="text"
							aria-label="Value"
							value={row.value}
							onChange={(e) => updateValue(row.id, e.target.value)}
						/>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							aria-label="Remove row"
							onClick={() => removeRow(row.id)}
							className="text-destructive hover:text-destructive"
						>
							Remove
						</Button>
					</div>
					{duplicates.has(row.key) && (
						<span className="text-xs text-amber-600">{`Duplicate key '${row.key}'`}</span>
					)}
				</div>
			))}
			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={addRow}
				className="self-start"
			>
				Add row
			</Button>
		</div>
	);
}
