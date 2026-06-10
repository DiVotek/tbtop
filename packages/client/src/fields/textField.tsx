import { Input } from "../ui/input";
import type { FieldCellProps, FieldFormProps } from "./fieldProps";

export function TextCell({ value }: FieldCellProps<string>) {
	if (value === null || value === undefined) {
		return null;
	}
	const str = String(value);
	return <span title={str}>{str.length > 80 ? `${str.slice(0, 80)}…` : str}</span>;
}

export function TextForm({ id, name, value, onChange, onBlur, disabled }: FieldFormProps<string>) {
	return (
		<Input
			id={id ?? name}
			name={name}
			value={typeof value === "string" ? value : ""}
			onChange={(e) => onChange(e.target.value)}
			onBlur={onBlur}
			disabled={disabled}
		/>
	);
}
