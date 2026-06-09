import { Input } from "../ui/input";
import type { FieldCellProps, FieldFormProps } from "./fieldProps";

export function NumberCell({ value }: FieldCellProps<number>) {
	if (value === null || value === undefined) {
		return null;
	}
	return <span>{String(value)}</span>;
}

export function NumberForm({ id, name, value, onChange }: FieldFormProps<number>) {
	return (
		<Input
			id={id ?? name}
			name={name}
			type="number"
			defaultValue={typeof value === "number" ? String(value) : ""}
			onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
		/>
	);
}
