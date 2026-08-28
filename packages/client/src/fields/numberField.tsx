import { useState } from "react";
import { Input } from "../ui/input";
import { nullableCell } from "./cellHelpers";
import { type FieldCellProps, type FieldFormProps, fieldId } from "./fieldProps";
import { type AffixOptions, InputGroup } from "./inputGroup";

interface NumberOptions extends AffixOptions {
	placeholder?: string;
	step?: number | "any";
}

export function NumberCell({ value }: FieldCellProps<number>) {
	return nullableCell(value, (v) => <span>{String(v)}</span>);
}

/**
 * Numeric display string for the raw value crossing the wire. Laravel decimal
 * casts arrive as numeric strings (e.g. "1234.50"), not JS numbers.
 */
function numberDisplay(value: number | string | null): string {
	if (typeof value === "number" && Number.isFinite(value)) {
		return String(value);
	}
	if (typeof value === "string" && value !== "" && Number.isFinite(Number(value))) {
		return value;
	}
	return "";
}

export function NumberForm({
	id,
	name,
	value,
	onChange,
	onBlur,
	disabled,
	invalid,
	describedBy,
	options,
}: FieldFormProps<number, NumberOptions>) {
	const display = numberDisplay(value as number | string | null);
	// Local draft survives a re-render that echoes back the same numeric value
	// (e.g. "1." while typing "1.5") but yields to a genuine external change —
	// notably the rollback after a rejected save reconciling `value` back down.
	const [draft, setDraft] = useState(display);
	const [lastValue, setLastValue] = useState(value);
	if (value !== lastValue) {
		setLastValue(value);
		setDraft(display);
	}

	return (
		<InputGroup options={options} disabled={disabled} invalid={invalid}>
			<Input
				id={fieldId({ id, name })}
				name={name}
				type="number"
				value={draft}
				onChange={(e) => {
					setDraft(e.target.value);
					onChange(e.target.value === "" ? null : Number(e.target.value));
				}}
				onBlur={onBlur}
				disabled={disabled}
				aria-invalid={invalid || undefined}
				aria-describedby={describedBy}
				placeholder={options?.placeholder}
				step={options?.step}
			/>
		</InputGroup>
	);
}
